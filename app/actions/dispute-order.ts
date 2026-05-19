"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminEmail } from "@/lib/email";

export async function disputeOrder(orderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not logged in" };

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, buyer_id, status, auto_release_at")
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

  const adminUrl = `${process.env.APP_URL}/admin/disputes`;
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

  return { success: true };
}
