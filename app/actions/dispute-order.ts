"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminEmail, sendUserEmail, emailDisputeFiled } from "@/lib/email";
import { notify } from "@/lib/notifications";

export async function disputeOrder(orderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not logged in" };

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, buyer_id, status, auto_release_at, products(title, seller_id)")
    .eq("id", orderId)
    .single();

  if (error || !order) return { error: "Order not found" };
  if (order.buyer_id !== user.id) return { error: "Only the buyer can raise a dispute" };
  if (order.status !== "paid") return { error: "This order cannot be disputed in its current state" };

  const admin = createAdminClient();
  await admin
    .from("orders")
    .update({
      status: "disputed",
      disputed_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  const productTitle = (order as any).products?.title ?? "your item";
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
      <p>Payment is now frozen pending your review.</p>
      <p><a href="${adminUrl}" style="background:#9B1C1C;color:white;padding:10px 18px;border-radius:6px;text-decoration:none;">
        Review dispute
      </a></p>
    `
  );

  // Email buyer confirming dispute was received
  void (async () => {
    try {
      const { data: buyerAuth } = await admin.auth.admin.getUserById(user.id);
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
