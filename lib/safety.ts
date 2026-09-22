import type { SupabaseClient } from "@supabase/supabase-js";

// Shared by the web server actions (app/actions/safety.ts) and any mobile
// route that needs the same rules. The Flutter app talks to Supabase directly
// for blocking and reporting — both are a plain table write and an RPC, and
// 031_user_safety.sql enforces them in the database — so there is no
// app/api/mobile route here to keep in step.

export type SafetyResult = { success: true } | { error: string };

export type ReportTargetType = "message" | "user" | "product" | "review";

// Values match the content_reports.reason CHECK constraint in
// 031_user_safety.sql. Keep the two in step.
export const REPORT_REASONS = [
  { value: "harassment",      label: "Harassment or bullying",   hint: "Threats, insults, or repeated unwanted contact" },
  { value: "sexual_content",  label: "Nudity or sexual content", hint: "Sexual images, or someone asking you for them" },
  { value: "violence",        label: "Violence or threats",      hint: "Threats of harm, or graphic violent content" },
  { value: "hate_speech",     label: "Hate speech",              hint: "Slurs or attacks on who someone is" },
  { value: "scam",            label: "Scam or fraud",            hint: "Trying to take payment outside escrow, fake items" },
  { value: "spam",            label: "Spam or advertising",      hint: "Repetitive junk or unrelated promotion" },
  { value: "prohibited_item", label: "Prohibited item",          hint: "Drugs, weapons, stolen or counterfeit goods" },
  { value: "impersonation",   label: "Impersonation",            hint: "Pretending to be someone else" },
  { value: "other",           label: "Something else",           hint: "Tell us what happened" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

const REASON_VALUES = new Set<string>(REPORT_REASONS.map((r) => r.value));

export function reportReasonLabel(reason: string): string {
  return REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason;
}

// ── Blocking ─────────────────────────────────────────────────────────────────

export async function blockUser(
  supabase: SupabaseClient,
  userId: string,
  blockedId: string,
): Promise<SafetyResult> {
  if (userId === blockedId) return { error: "You cannot block yourself." };

  const { error } = await supabase
    .from("blocked_users")
    .insert({ blocker_id: userId, blocked_id: blockedId });

  // Already blocked — the button is idempotent from the user's point of view.
  if (error?.code === "23505") return { success: true };

  if (error) {
    console.error("[safety] block error:", error);
    return { error: "Could not block this user. Please try again." };
  }

  return { success: true };
}

export async function unblockUser(
  supabase: SupabaseClient,
  userId: string,
  blockedId: string,
): Promise<SafetyResult> {
  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_id", userId)
    .eq("blocked_id", blockedId);

  if (error) {
    console.error("[safety] unblock error:", error);
    return { error: "Could not unblock this user. Please try again." };
  }

  return { success: true };
}

export type BlockedUser = {
  id: string;
  blockedId: string;
  name: string;
  createdAt: string;
};

export async function listBlockedUsers(
  supabase: SupabaseClient,
  userId: string,
): Promise<BlockedUser[]> {
  const { data, error } = await supabase
    .from("blocked_users")
    .select("id, blocked_id, created_at, blocked:profiles!blocked_users_blocked_id_fkey(full_name)")
    .eq("blocker_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[safety] listBlockedUsers error:", error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    blockedId: row.blocked_id,
    name: row.blocked?.full_name ?? "Former user",
    createdAt: row.created_at,
  }));
}

// Catalog surfaces filter blocked sellers out in the query rather than in RLS
// — see the note at the end of the enforcement section in
// 031_user_safety.sql for why the products policy deliberately stops at
// suspension. Returns only people *this user* blocked, which is all the
// blocked_users SELECT policy will show them anyway.
export async function getBlockedUserIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("blocked_users")
    .select("blocked_id")
    .eq("blocker_id", userId);

  if (error) {
    // A catalog that fails open is better than a catalog that fails to load.
    console.error("[safety] getBlockedUserIds error:", error);
    return [];
  }

  return (data ?? []).map((row: any) => row.blocked_id as string);
}

// ── Reporting ────────────────────────────────────────────────────────────────

export async function reportContent(
  supabase: SupabaseClient,
  input: {
    targetType: ReportTargetType;
    targetId: string;
    reason: string;
    details?: string;
  },
): Promise<SafetyResult> {
  if (!REASON_VALUES.has(input.reason)) {
    return { error: "Pick a reason for the report." };
  }

  const details = (input.details ?? "").trim().slice(0, 2000);

  const { error } = await supabase.rpc("report_content", {
    p_target_type: input.targetType,
    p_target_id: input.targetId,
    p_reason: input.reason,
    p_details: details || null,
  });

  if (error) {
    const mapped = describeReportError(error.message);
    if (mapped) return { error: mapped };
    console.error("[safety] report error:", error);
    return { error: "Could not submit the report. Please try again." };
  }

  return { success: true };
}

function describeReportError(message: string): string | null {
  if (message.includes("ALREADY_REPORTED")) {
    return "You've already reported this — our team is looking at it.";
  }
  if (message.includes("REPORT_RATE_LIMIT")) {
    return "You've filed a lot of reports in the last hour. Try again later.";
  }
  if (message.includes("CANNOT_REPORT_SELF")) {
    return "You cannot report your own content.";
  }
  if (message.includes("TARGET_NOT_FOUND")) {
    return "That content is no longer available.";
  }
  if (message.includes("NOT_AUTHENTICATED")) {
    return "Please log in to report content.";
  }
  return null;
}

// ── Message filter and block errors ──────────────────────────────────────────

// moderate_message_content() (031_user_safety.sql) raises
// MESSAGE_BLOCKED_<CATEGORY> from a BEFORE INSERT trigger; a blocked
// conversation fails the INSERT policy instead and surfaces as 42501. Both
// arrive as an opaque Postgres error, so both need translating before they
// reach a user.
export function describeMessageError(error: { code?: string; message?: string } | null): string | null {
  if (!error) return null;

  const message = error.message ?? "";

  if (message.includes("MESSAGE_BLOCKED_")) {
    if (message.includes("SEXUAL_CONTENT")) {
      return "This message looks like it contains sexual content, which isn't allowed on KolejSwap.";
    }
    if (message.includes("HATE_SPEECH")) {
      return "This message contains language that isn't allowed on KolejSwap.";
    }
    if (message.includes("VIOLENCE")) {
      return "This message reads as a threat, which isn't allowed on KolejSwap.";
    }
    return "This message breaks our community rules and wasn't sent.";
  }

  // 42501 = new row violates row-level security policy. On messages, that is
  // a block or a suspension; there is no third way to fail this INSERT.
  if (error.code === "42501") {
    return "You can no longer send messages in this conversation.";
  }

  return null;
}
