"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { transferToSeller } from "@/lib/paystack";

export async function confirmOrderReceived(orderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not logged in" };

  // Fetch order with seller's recipient_code
  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id, amount, status, buyer_id,
      products(
        id,
        seller_id,
        profiles(recipient_code, full_name)
      )
    `)
    .eq("id", orderId)
    .single();

  if (error || !order) return { error: "Order not found" };
  if (order.buyer_id !== user.id) return { error: "Only the buyer can confirm receipt" };
  if (order.status !== "paid") return { error: "This order cannot be confirmed in its current state" };

  const product = order.products as any;
  const sellerProfile = product?.profiles;
  const recipientCode = sellerProfile?.recipient_code;

  if (!recipientCode) {
    return { error: "Seller has not set up their payout account. Contact support." };
  }

  // 90% of order amount in kobo
  const payoutKobo = Math.round(order.amount * 0.9 * 100);
  const transferRef = `PAYOUT-${orderId.slice(0, 8)}-${Date.now()}`;

  try {
    await transferToSeller(recipientCode, payoutKobo, transferRef);
  } catch (err: any) {
    console.error("Transfer failed:", err);
    return { error: `Payout failed: ${err.message}` };
  }

  // Mark order as confirmed and released using admin client
  const admin = createAdminClient();
  const now = new Date().toISOString();

  await admin
    .from("orders")
    .update({
      status: "confirmed",
      confirmed_at: now,
      released_at: now,
    })
    .eq("id", orderId);

  return { success: true };
}
