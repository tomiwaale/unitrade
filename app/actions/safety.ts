"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  blockUser as blockUserShared,
  unblockUser as unblockUserShared,
  reportContent,
  type ReportTargetType,
} from "@/lib/safety";

async function currentUserId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

export async function blockUser(blockedId: string) {
  const { supabase, userId } = await currentUserId();
  if (!userId) return { error: "Please log in." };

  const result = await blockUserShared(supabase, userId, blockedId);

  if ("success" in result) {
    revalidatePath("/messages");
    revalidatePath("/account/blocked");
    revalidatePath("/catalog");
  }

  return result;
}

export async function unblockUser(blockedId: string) {
  const { supabase, userId } = await currentUserId();
  if (!userId) return { error: "Please log in." };

  const result = await unblockUserShared(supabase, userId, blockedId);

  if ("success" in result) {
    revalidatePath("/messages");
    revalidatePath("/account/blocked");
    revalidatePath("/catalog");
  }

  return result;
}

export async function submitReport(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details?: string;
}) {
  const { supabase, userId } = await currentUserId();
  if (!userId) return { error: "Please log in to report content." };

  // report_content() rate limits per hour; this catches a stuck submit button
  // before it reaches the database.
  if (!rateLimit(`report:${userId}`, 5, 60_000)) {
    return { error: "Slow down a moment, then try again." };
  }

  return reportContent(supabase, input);
}

// The clients offer this as one action. Blocking hides the conversation from
// the blocker (031_user_safety.sql), so a user who blocks first and then looks
// for the report button will not find the thread — the two have to happen
// together, in this order, or the report loses its context.
export async function reportAndBlock(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details?: string;
  blockUserId: string;
}) {
  const { supabase, userId } = await currentUserId();
  if (!userId) return { error: "Please log in." };

  if (!rateLimit(`report:${userId}`, 5, 60_000)) {
    return { error: "Slow down a moment, then try again." };
  }

  const reported = await reportContent(supabase, input);

  // An already-filed report should still let the block through.
  const reportFailed = "error" in reported
    && !reported.error.startsWith("You've already reported");

  if (reportFailed) return reported;

  const blocked = await blockUserShared(supabase, userId, input.blockUserId);
  if ("error" in blocked) return blocked;

  revalidatePath("/messages");
  revalidatePath("/account/blocked");
  revalidatePath("/catalog");

  return { success: true as const };
}
