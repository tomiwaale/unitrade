"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { settleSubaccount } from "@/lib/paystack";
import { sendUserEmail, emailPayoutSent } from "@/lib/email";
import { notify } from "@/lib/notifications";

export async function confirmOrderReceived(orderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not logged in" };

  const admin = createAdminClient();

  // Fetch order with seller's recipient_code
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
  if (order.buyer_id !== user.id) return { error: "Only the buyer can confirm receipt" };
  if (order.status !== "paid") return { error: "This order cannot be confirmed in its current state" };

  const product = order.products as any;
  const sellerProfile = product?.profiles;
  const subaccountCode = sellerProfile?.subaccount_code;

  if (!subaccountCode) {
    return { error: "Seller has not set up their payout account. Contact support." };
  }

  // Trigger immediate settlement of the seller's subaccount (their 90% cut)
  try {
    await settleSubaccount(subaccountCode);
  } catch (err: any) {
    console.error("Settlement failed:", err);
    return { error: `Payout failed: ${err.message}` };
  }

  // Mark order as confirmed and released using admin client
  const now = new Date().toISOString();

  await admin
    .from("orders")
    .update({
      status: "confirmed",
      confirmed_at: now,
      released_at: now,
    })
    .eq("id", orderId);

  void notify(
    product.seller_id,
    "order",
    "Payment released!",
    `The buyer confirmed receipt of "${product.title}". Your payout is on its way.`,
    orderId,
  );

  // Email seller their payout is on the way
  void (async () => {
    try {
      const { data: sellerAuth } = await admin.auth.admin.getUserById(product.seller_id);
      if (sellerAuth.user?.email) {
        const { subject, html } = emailPayoutSent({
          sellerName: sellerProfile?.full_name ?? "there",
          productTitle: (product as any).title ?? "your item",
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
