import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { drainCampaign, startCampaign } from "@/lib/marketing";
import { timingSafeEqual } from "crypto";

// Drains marketing campaigns: starts any whose scheduled time has arrived, and
// resumes any left mid-send when a previous run hit its time budget.
//
// Call it from the same cron service as /api/cron/auto-release, every ~5
// minutes, with `Authorization: Bearer <CRON_SECRET>`. Immediate sends from the
// admin UI don't depend on this route — but a large campaign that outruns the
// server action's budget is finished here.

export const maxDuration = 60;

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

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  if (!verifySecret(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const results = {
    requeued: 0, started: 0, sent: 0, failed: 0, completed: 0, pending: 0,
    errors: [] as string[],
  };

  // Recover batches abandoned by a run that died mid-send before anything else.
  const { data: requeued, error: requeueError } = await admin.rpc("requeue_stale_recipients", {
    p_stale_minutes: 15,
  });
  if (requeueError) console.error("[send-campaigns] requeue failed:", requeueError);
  else results.requeued = requeued ?? 0;

  // 1. Scheduled campaigns that are now due
  const { data: due } = await admin
    .from("email_campaigns")
    .select("id, name")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString());

  for (const campaign of due ?? []) {
    const result = await startCampaign(campaign.id);
    if ("error" in result) {
      results.errors.push(`${campaign.name}: ${result.error}`);
      // Nothing to send (or a bad config) — don't leave it due forever.
      await admin
        .from("email_campaigns")
        .update({ status: "draft", scheduled_at: null })
        .eq("id", campaign.id)
        .eq("status", "scheduled");
      continue;
    }
    results.started++;
  }

  // 2. Everything currently sending, including what we just started
  const { data: sending } = await admin
    .from("email_campaigns")
    .select("id, name")
    .eq("status", "sending")
    .order("started_at", { ascending: true });

  // Leave headroom inside maxDuration so the response still returns.
  const deadline = Date.now() + 45_000;

  for (const campaign of sending ?? []) {
    if (Date.now() > deadline) {
      results.pending++;
      continue;
    }

    try {
      const result = await drainCampaign(campaign.id, Math.max(0, deadline - Date.now()));
      results.sent += result.sent;
      results.failed += result.failed;
      if (result.done) results.completed++;
      else results.pending++;
    } catch (err: any) {
      results.errors.push(`${campaign.name}: ${err.message}`);
    }
  }

  console.log("[send-campaigns] done:", results);
  return NextResponse.json(results);
}
