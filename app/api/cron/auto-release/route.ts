import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { transferToSeller } from "@/lib/paystack";

// Called by an external cron service (e.g. cron-job.org) once per day.
// Set Authorization: Bearer <CRON_SECRET> in the cron request header.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id, amount,
      products(
        seller_id,
        profiles(recipient_code)
      )
    `)
    .eq("status", "paid")
    .lt("auto_release_at", new Date().toISOString());

  if (error) {
    console.error("[auto-release] query error:", error);
    return NextResponse.json({ error: "DB query failed" }, { status: 500 });
  }

  const results = { released: 0, failed: 0, skipped: 0, errors: [] as string[] };

  for (const order of orders ?? []) {
    const recipientCode = (order as any).products?.profiles?.recipient_code;

    if (!recipientCode) {
      results.skipped++;
      results.errors.push(`Order ${order.id}: seller has no recipient_code`);
      continue;
    }

    const payoutKobo = Math.round((order as any).amount * 0.9 * 100);
    const transferRef = `AUTO-${order.id.replace(/-/g, "")}-${Date.now()}`;

    try {
      await transferToSeller(recipientCode, payoutKobo, transferRef);
      const now = new Date().toISOString();
      await supabase
        .from("orders")
        .update({ status: "confirmed", confirmed_at: now, released_at: now })
        .eq("id", order.id);
      results.released++;
    } catch (err: any) {
      results.failed++;
      results.errors.push(`Order ${order.id}: ${err.message}`);
      console.error(`[auto-release] transfer failed for order ${order.id}:`, err.message);
    }
  }

  console.log("[auto-release] done:", results);
  return NextResponse.json(results);
}
