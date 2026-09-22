import { createAdminClient } from "@/lib/supabase/admin";
import { settleSubaccount } from "@/lib/paystack";
import { sendUserEmail, sendAdminEmail, emailPayoutSent, emailDisputeFiled } from "@/lib/email";
import { notify } from "@/lib/notifications";

export type OrderActionResult = { success: true } | { error: string };

// The buyer's explanation goes straight into an HTML email.
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Shared by app/actions/confirm-order.ts and POST /api/mobile/orders/[id]/confirm.
export async function confirmOrderReceived(orderId: string, userId: string): Promise<OrderActionResult> {
  const admin = createAdminClient();

  const { data: order, error } = await admin
    .from("orders")
    .select(`
      id, amount, status, buyer_id,
      products(
        id,
        title,
        seller_id,
        profiles(subaccount_code, full_name)
      )
    `)
    .eq("id", orderId)
    .single();

  if (error || !order) return { error: "Order not found" };
  if (order.buyer_id !== userId) return { error: "Only the buyer can confirm receipt" };
  if (order.status !== "paid") return { error: "This order cannot be confirmed in its current state" };

  const product = order.products as any;
  const sellerProfile = product?.profiles;
  const subaccountCode = sellerProfile?.subaccount_code;

  if (!subaccountCode) {
    return { error: "Seller has not set up their payout account. Contact support." };
  }

  try {
    await settleSubaccount(subaccountCode);
  } catch (err: any) {
    console.error("Settlement failed:", err);
    return { error: `Payout failed: ${err.message}` };
  }

  const now = new Date().toISOString();

  await admin
    .from("orders")
    .update({ status: "confirmed", confirmed_at: now, released_at: now })
    .eq("id", orderId);

  void notify(
    product.seller_id,
    "order",
    "Payment released!",
    `The buyer confirmed receipt of "${product.title}". Your payout is on its way.`,
    orderId,
  );

  void (async () => {
    try {
      const { data: sellerAuth } = await admin.auth.admin.getUserById(product.seller_id);
      if (sellerAuth.user?.email) {
        const { subject, html } = emailPayoutSent({
          sellerName: sellerProfile?.full_name ?? "there",
          productTitle: product.title ?? "your item",
          amount: order.amount,
        });
        await sendUserEmail(sellerAuth.user.email, subject, html);
      }
    } catch (err) {
      console.error("[email] Failed to send payout email:", err);
    }
  })();

  return { success: true };
}

// Kept in sync with orders_dispute_reason_check (026_dispute_details.sql) and
// DISPUTE_REASONS in mobile/lib/features/orders/presentation/dispute_modal.dart.
export const DISPUTE_REASONS = {
  item_not_received: "Item not received",
  item_damaged: "Item damaged or defective",
  wrong_item: "Wrong item",
  seller_no_show: "Seller did not show up",
  other: "Other",
} as const;

export type DisputeReason = keyof typeof DISPUTE_REASONS;

export function isDisputeReason(value: unknown): value is DisputeReason {
  return typeof value === "string" && value in DISPUTE_REASONS;
}

export type DisputeDetails = {
  reason?: DisputeReason;
  explanation?: string;
  evidence?: string[];
};

// Shared by app/actions/dispute-order.ts and POST /api/mobile/orders/[id]/dispute.
// `details` is optional: the web flow (app/orders/[id]/order-actions.tsx) still
// files a bare dispute, the mobile sheet collects a structured one.
export async function disputeOrder(
  orderId: string,
  userId: string,
  details: DisputeDetails = {},
): Promise<OrderActionResult> {
  const admin = createAdminClient();

  const { data: order, error } = await admin
    .from("orders")
    .select("id, buyer_id, status, auto_release_at, products(title, seller_id)")
    .eq("id", orderId)
    .single();

  if (error || !order) return { error: "Order not found" };
  if (order.buyer_id !== userId) return { error: "Only the buyer can raise a dispute" };
  if (order.status !== "paid") return { error: "This order cannot be disputed in its current state" };

  const explanation = details.explanation?.trim() || null;
  const evidence = (details.evidence ?? []).filter((url) => typeof url === "string" && url.length > 0).slice(0, 3);

  await admin
    .from("orders")
    .update({
      status: "disputed",
      disputed_at: new Date().toISOString(),
      dispute_reason: details.reason ?? null,
      dispute_explanation: explanation,
      dispute_evidence: evidence,
    })
    .eq("id", orderId);

  const productTitle = (order as any).products?.title ?? "your item";
  const reasonLabel = details.reason ? DISPUTE_REASONS[details.reason] : null;
  const sellerId = (order as any).products?.seller_id as string | undefined;
  const adminUrl = `${process.env.APP_URL}/admin/disputes`;

  if (sellerId) {
    void notify(
      sellerId,
      "order",
      "Dispute filed on your order",
      `A buyer has raised a dispute on "${productTitle}". An admin will review it shortly.`,
      orderId,
    );
  }

  await sendAdminEmail(
    `Dispute filed — Order ${orderId.slice(0, 8).toUpperCase()}`,
    `
      <h2 style="color:#9B1C1C">Dispute Filed</h2>
      <p>A buyer has raised a dispute on order <b>${orderId}</b>.</p>
      ${reasonLabel ? `<p><b>Reason:</b> ${reasonLabel}</p>` : ""}
      ${explanation ? `<p><b>What the buyer says:</b><br/>${escapeHtml(explanation)}</p>` : ""}
      ${evidence.length > 0 ? `<p><b>Evidence:</b> ${evidence.length} photo${evidence.length === 1 ? "" : "s"} attached — view them on the dispute page.</p>` : ""}
      <p>Payment is now frozen pending your review.</p>
      <p><a href="${adminUrl}" style="background:#9B1C1C;color:white;padding:10px 18px;border-radius:6px;text-decoration:none;">
        Review dispute
      </a></p>
    `,
  );

  void (async () => {
    try {
      const { data: buyerAuth } = await admin.auth.admin.getUserById(userId);
      if (buyerAuth.user?.email) {
        const { subject, html } = emailDisputeFiled({
          buyerName: buyerAuth.user.user_metadata?.full_name ?? "there",
          productTitle,
          orderId,
        });
        await sendUserEmail(buyerAuth.user.email, subject, html);
      }
    } catch (err) {
      console.error("[email] Failed to send dispute email to buyer:", err);
    }
  })();

  return { success: true };
}
