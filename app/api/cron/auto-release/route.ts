import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { settleSubaccount } from "@/lib/paystack";
import { timingSafeEqual } from "crypto";

function verifySecret(provided: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !provided) return false;
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(secret);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Called by an external cron service (e.g. cron-job.org) once per day.
// Set Authorization: Bearer <CRON_SECRET> in the cron request header.
export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  if (!verifySecret(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id, amount,
      products(
        seller_id,
        profiles(subaccount_code)
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
    const subaccountCode = (order as any).products?.profiles?.subaccount_code;

    if (!subaccountCode) {
      results.skipped++;
      results.errors.push(`Order ${order.id}: seller has no subaccount_code`);
      continue;
    }

    const now = new Date().toISOString();

    // Atomically claim the order by flipping status from "paid" → "confirmed".
    // If another cron instance already claimed it, this update matches 0 rows and we skip.
    const { data: claimed } = await supabase
      .from("orders")
      .update({ status: "confirmed", confirmed_at: now })
      .eq("id", order.id)
      .eq("status", "paid") // guard — only succeeds if still unprocessed
      .select("id")
      .maybeSingle();

    if (!claimed) {
      results.skipped++;
      continue;
    }

    try {
      await settleSubaccount(subaccountCode);
      await supabase
        .from("orders")
        .update({ released_at: now })
        .eq("id", order.id);
      results.released++;
    } catch (err: any) {
      // Revert so the next cron run retries this order.
      await supabase
        .from("orders")
        .update({ status: "paid", confirmed_at: null })
        .eq("id", order.id);
      results.failed++;
      results.errors.push(`Order ${order.id}: ${err.message}`);
      console.error(`[auto-release] settlement failed for order ${order.id}:`, err.message);
    }
  }

  console.log("[auto-release] done:", results);
  return NextResponse.json(results);
}
