import { NextResponse } from "next/server";
import { verifyTransaction } from "@/lib/paystack";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendUserEmail,
  emailOrderConfirmedBuyer,
  emailOrderNotificationSeller,
} from "@/lib/email";
import { notify } from "@/lib/notifications";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const reference = searchParams.get("reference");

  if (!reference) {
    return NextResponse.redirect(`${origin}/catalog?error=missing_reference`);
  }

  try {
    const supabase = createAdminClient();

    // Fetch the pending order first — reject unknown references immediately
    const { data: pendingOrder } = await supabase
      .from("orders")
      .select("id, product_id, buyer_id, amount, status")
      .eq("paystack_reference", reference)
      .single();

    if (!pendingOrder) {
      console.error("[callback] Reference not found:", reference);
      return NextResponse.redirect(`${origin}/catalog?error=order_not_found`);
    }

    // Already processed (e.g. user refreshed the callback URL)
    if (pendingOrder.status !== "pending") {
      return NextResponse.redirect(`${origin}/orders?success=payment_received`);
    }

    // Verify with Paystack
    const paymentData = await verifyTransaction(reference);

    if (paymentData.status !== "success") {
      return NextResponse.redirect(`${origin}/catalog?error=payment_failed`);
    }

    // Verify the amount Paystack received matches what we expected
    const expectedKobo = Math.round(pendingOrder.amount * 100);
    if (paymentData.amount !== expectedKobo) {
      console.error(`[callback] Amount mismatch: expected ${expectedKobo}, got ${paymentData.amount} for ref ${reference}`);
      return NextResponse.redirect(`${origin}/catalog?error=payment_mismatch`);
    }

    // 7 days from now — buyer must confirm receipt before this date
    const autoReleaseAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Guard against replay: only update if still "pending"
    const { data: order } = await supabase
      .from("orders")
      .update({
        status: "paid",
        auto_release_at: autoReleaseAt,
      })
      .eq("paystack_reference", reference)
      .eq("status", "pending")
      .select("id, product_id, buyer_id, amount")
      .single();

    if (order?.product_id) {
      await supabase
        .from("products")
        .update({ status: "sold" })
        .eq("id", order.product_id);

      void sendOrderEmails(supabase, order, origin);
    }

    return NextResponse.redirect(`${origin}/orders?success=payment_received`);
  } catch (error) {
    console.error("Paystack callback error:", error);
    return NextResponse.redirect(`${origin}/catalog?error=verification_error`);
  }
}

async function sendOrderEmails(
  supabase: ReturnType<typeof createAdminClient>,
  order: { id: string; product_id: string; buyer_id: string; amount: number },
  origin: string,
) {
  try {
    const { data: product } = await supabase
      .from("products")
      .select("title, seller_id")
      .eq("id", order.product_id)
      .single();

    if (!product) return;

    void notify(
      order.buyer_id,
      "order",
      "Payment confirmed",
      `Your payment for "${product.title}" is secured in escrow.`,
      order.id,
    );
    void notify(
      product.seller_id,
      "order",
      "New order received!",
      `Someone bought "${product.title}". Payment is held in escrow until delivery is confirmed.`,
      order.id,
    );

    const [{ data: buyerAuth }, { data: sellerAuth }] = await Promise.all([
      supabase.auth.admin.getUserById(order.buyer_id),
      supabase.auth.admin.getUserById(product.seller_id),
    ]);

    const ordersUrl = `${origin}/orders`;

    if (buyerAuth.user?.email) {
      const { subject, html } = emailOrderConfirmedBuyer({
        buyerName: buyerAuth.user.user_metadata?.full_name ?? "there",
        productTitle: product.title,
        amount: order.amount,
        orderId: order.id,
        ordersUrl,
      });
      await sendUserEmail(buyerAuth.user.email, subject, html);
    }

    if (sellerAuth.user?.email) {
      const { subject, html } = emailOrderNotificationSeller({
        sellerName: sellerAuth.user.user_metadata?.full_name ?? "there",
        productTitle: product.title,
        amount: order.amount,
        orderId: order.id,
        ordersUrl,
      });
      await sendUserEmail(sellerAuth.user.email, subject, html);
    }
  } catch (err) {
    console.error("[email] Failed to send order emails:", err);
  }
}
