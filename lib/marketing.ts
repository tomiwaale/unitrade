import { createAdminClient } from "@/lib/supabase/admin";
import { markdownToEmailHtml, renderMergeTags } from "@/lib/email-markdown";
import { sendEmailBatch, wrapMarketingEmail, type OutgoingEmail } from "@/lib/email";
import { unsubscribeApiUrl, unsubscribeUrl } from "@/lib/unsubscribe";

// Campaign audience resolution and sending. Shared by the admin server actions
// (/admin/marketing) and the cron drain route (/api/cron/send-campaigns) so a
// campaign behaves identically whether it's sent now or on a schedule.

export type VerificationFilter =
  | "any"
  | "verified"
  | "school_id_approved"
  | "nin_verified"
  | "unverified";

export type ActivityFilter = "any" | "sellers" | "buyers" | "dormant";

export type Segment = {
  mode: "audience" | "manual";
  universities: string[];
  verification: VerificationFilter;
  activity: ActivityFilter;
  emails: string[];
};

export const DEFAULT_SEGMENT: Segment = {
  mode: "audience",
  universities: [],
  verification: "any",
  activity: "any",
  emails: [],
};

const VERIFICATION_VALUES: VerificationFilter[] = [
  "any", "verified", "school_id_approved", "nin_verified", "unverified",
];
const ACTIVITY_VALUES: ActivityFilter[] = ["any", "sellers", "buyers", "dormant"];

export const VERIFICATION_LABELS: Record<VerificationFilter, string> = {
  any: "Everyone",
  verified: "Fully verified (school ID + NIN)",
  school_id_approved: "School ID approved",
  nin_verified: "NIN verified",
  unverified: "Not fully verified",
};

export const ACTIVITY_LABELS: Record<ActivityFilter, string> = {
  any: "Everyone",
  sellers: "Sellers (has a listing)",
  buyers: "Buyers (has an order)",
  dormant: "Dormant (never listed or bought)",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmailList(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(/[\s,;]+/)) {
    const email = part.trim().toLowerCase();
    if (EMAIL_RE.test(email)) seen.add(email);
  }
  return [...seen];
}

// Segments round-trip through a jsonb column, so never trust the stored shape.
export function parseSegment(raw: unknown): Segment {
  const value = (raw ?? {}) as Partial<Segment>;
  const verification = VERIFICATION_VALUES.includes(value.verification as VerificationFilter)
    ? (value.verification as VerificationFilter)
    : "any";
  const activity = ACTIVITY_VALUES.includes(value.activity as ActivityFilter)
    ? (value.activity as ActivityFilter)
    : "any";

  return {
    mode: value.mode === "manual" ? "manual" : "audience",
    universities: Array.isArray(value.universities)
      ? value.universities.filter((u): u is string => typeof u === "string")
      : [],
    verification,
    activity,
    emails: Array.isArray(value.emails)
      ? value.emails.filter((e): e is string => typeof e === "string")
      : [],
  };
}

export function describeSegment(segment: Segment): string {
  if (segment.mode === "manual") {
    return `Manual list · ${segment.emails.length} address${segment.emails.length === 1 ? "" : "es"}`;
  }

  const parts: string[] = [];
  parts.push(
    segment.universities.length === 0
      ? "All universities"
      : segment.universities.length === 1
        ? segment.universities[0]
        : `${segment.universities.length} universities`
  );
  if (segment.verification !== "any") parts.push(VERIFICATION_LABELS[segment.verification]);
  if (segment.activity !== "any") parts.push(ACTIVITY_LABELS[segment.activity]);
  return parts.join(" · ");
}

export type Recipient = {
  user_id: string | null;
  email: string;
  full_name: string | null;
  university: string | null;
};

export async function resolveAudience(segment: Segment): Promise<Recipient[]> {
  const admin = createAdminClient();

  if (segment.mode === "manual") {
    const emails = parseEmailList(segment.emails.join(","));
    if (emails.length === 0) return [];

    // Manual lists still respect the suppression table — an address that opted
    // out must not come back just because someone pasted it in again.
    const { data: suppressed } = await admin
      .from("email_unsubscribes")
      .select("email")
      .in("email", emails);

    const blocked = new Set((suppressed ?? []).map((r) => r.email.toLowerCase()));
    return emails
      .filter((email) => !blocked.has(email))
      .map((email) => ({ user_id: null, email, full_name: null, university: null }));
  }

  const { data, error } = await admin.rpc("marketing_audience", {
    p_universities: segment.universities.length ? segment.universities : null,
    p_verification: segment.verification,
    p_activity: segment.activity,
  });

  if (error) {
    console.error("[marketing] audience query failed:", error);
    throw new Error(error.message);
  }

  return (data ?? []) as Recipient[];
}

export type CampaignContent = {
  subject: string;
  body_md: string;
  preheader: string;
};

export function renderCampaignEmail(
  campaign: CampaignContent,
  recipient: Pick<Recipient, "email" | "full_name" | "university">
): OutgoingEmail {
  const fields = {
    name: recipient.full_name,
    email: recipient.email,
    university: recipient.university,
  };

  const unsubUrl = unsubscribeUrl(recipient.email);
  const html = wrapMarketingEmail(
    markdownToEmailHtml(renderMergeTags(campaign.body_md, fields)),
    {
      preheader: renderMergeTags(campaign.preheader, fields),
      unsubscribeUrl: unsubUrl,
    }
  );

  return {
    to: recipient.email,
    subject: renderMergeTags(campaign.subject, fields),
    html,
    // Gmail/Apple Mail surface a native unsubscribe control from these, which
    // keeps complaints out of the spam-report path.
    headers: {
      "List-Unsubscribe": `<${unsubscribeApiUrl(recipient.email)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

// Resend accepts 100 messages per batch call.
const BATCH_SIZE = 100;

// Materialises the audience into email_campaign_recipients and flips the
// campaign to 'sending'. Idempotent: recipient rows are unique per
// (campaign_id, email), and a campaign already sending is left alone.
export async function startCampaign(campaignId: string): Promise<
  { error: string } | { total: number }
> {
  const admin = createAdminClient();

  const { data: campaign } = await admin
    .from("email_campaigns")
    .select("id, status, segment, subject, body_md")
    .eq("id", campaignId)
    .single();

  if (!campaign) return { error: "Campaign not found" };
  if (campaign.status === "sending") return { error: "Campaign is already sending" };
  if (campaign.status === "sent") return { error: "Campaign has already been sent" };
  if (!campaign.subject.trim()) return { error: "Add a subject line before sending" };
  if (!campaign.body_md.trim()) return { error: "Add some content before sending" };

  let recipients: Recipient[];
  try {
    recipients = await resolveAudience(parseSegment(campaign.segment));
  } catch (err: any) {
    return { error: err.message ?? "Could not resolve the audience" };
  }

  if (recipients.length === 0) {
    return { error: "This segment matches nobody right now" };
  }

  for (let i = 0; i < recipients.length; i += 500) {
    const { error } = await admin
      .from("email_campaign_recipients")
      .upsert(
        recipients.slice(i, i + 500).map((r) => ({
          campaign_id: campaignId,
          user_id: r.user_id,
          email: r.email,
          full_name: r.full_name,
          university: r.university,
          status: "pending",
        })),
        { onConflict: "campaign_id,email", ignoreDuplicates: true }
      );

    if (error) {
      console.error("[marketing] failed to queue recipients:", error);
      return { error: "Failed to queue recipients" };
    }
  }

  // Claim the campaign only if it's still in a startable state, so two admins
  // double-clicking Send can't both begin the run.
  const { data: claimed } = await admin
    .from("email_campaigns")
    .update({
      status: "sending",
      started_at: new Date().toISOString(),
      total_recipients: recipients.length,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId)
    .in("status", ["draft", "scheduled"])
    .select("id")
    .maybeSingle();

  if (!claimed) return { error: "Campaign is already sending" };

  return { total: recipients.length };
}

// Sends one batch of pending recipients. Returns how many were sent/failed and
// whether the campaign still has work left, so callers can loop within their
// own time budget.
export async function sendCampaignBatch(campaignId: string): Promise<{
  sent: number;
  failed: number;
  done: boolean;
}> {
  const admin = createAdminClient();

  const { data: campaign } = await admin
    .from("email_campaigns")
    .select("id, subject, body_md, preheader, status")
    .eq("id", campaignId)
    .single();

  if (!campaign || campaign.status !== "sending") {
    return { sent: 0, failed: 0, done: true };
  }

  const { data: claimed, error: claimError } = await admin.rpc("claim_campaign_recipients", {
    p_campaign_id: campaignId,
    p_limit: BATCH_SIZE,
  });

  if (claimError) {
    console.error("[marketing] claim failed:", claimError);
    return { sent: 0, failed: 0, done: false };
  }

  const batch = (claimed ?? []) as {
    id: string; email: string; full_name: string | null; university: string | null;
  }[];

  if (batch.length === 0) {
    // Nothing claimable. If rows are still in flight elsewhere, leave the
    // campaign open — the next run finishes it.
    const { count: inFlight } = await admin
      .from("email_campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .in("status", ["pending", "sending"]);

    if ((inFlight ?? 0) === 0) {
      await finaliseCampaign(campaignId);
      return { sent: 0, failed: 0, done: true };
    }
    return { sent: 0, failed: 0, done: true };
  }

  const results = await sendEmailBatch(
    batch.map((r) =>
      renderCampaignEmail(campaign, {
        email: r.email,
        full_name: r.full_name,
        university: r.university,
      })
    )
  );

  const now = new Date().toISOString();
  const sentIds: string[] = [];
  const failures: { id: string; error: string }[] = [];

  results.forEach((result, i) => {
    if (result.ok) sentIds.push(batch[i].id);
    else failures.push({ id: batch[i].id, error: result.error });
  });

  if (sentIds.length) {
    await admin
      .from("email_campaign_recipients")
      .update({ status: "sent", sent_at: now, error: null })
      .in("id", sentIds);
  }

  for (const failure of failures) {
    await admin
      .from("email_campaign_recipients")
      .update({ status: "failed", error: failure.error })
      .eq("id", failure.id);
  }

  // Rows still marked 'sending' belong to a batch another run claimed, or one
  // that died mid-flight — either way the campaign isn't finished until
  // requeue_stale_recipients puts them back and they're delivered.
  const { count: remaining } = await admin
    .from("email_campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .in("status", ["pending", "sending"]);

  await refreshCampaignCounts(campaignId);

  const done = (remaining ?? 0) === 0;
  if (done) await finaliseCampaign(campaignId);

  return { sent: sentIds.length, failed: failures.length, done };
}

async function refreshCampaignCounts(campaignId: string) {
  const admin = createAdminClient();

  const [{ count: sent }, { count: failed }] = await Promise.all([
    admin
      .from("email_campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("status", "sent"),
    admin
      .from("email_campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("status", "failed"),
  ]);

  await admin
    .from("email_campaigns")
    .update({
      sent_count: sent ?? 0,
      failed_count: failed ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);
}

async function finaliseCampaign(campaignId: string) {
  const admin = createAdminClient();
  await refreshCampaignCounts(campaignId);
  await admin
    .from("email_campaigns")
    .update({ status: "sent", completed_at: new Date().toISOString() })
    .eq("id", campaignId)
    .eq("status", "sending");
}

// Drains a campaign until it's finished or the time budget runs out. Vercel
// caps a serverless invocation, so long campaigns finish across several cron
// ticks rather than in one request.
export async function drainCampaign(
  campaignId: string,
  budgetMs: number
): Promise<{ sent: number; failed: number; done: boolean }> {
  const deadline = Date.now() + budgetMs;
  let sent = 0;
  let failed = 0;

  for (;;) {
    const result = await sendCampaignBatch(campaignId);
    sent += result.sent;
    failed += result.failed;
    if (result.done) return { sent, failed, done: true };
    if (Date.now() > deadline) return { sent, failed, done: false };
    // Stay under Resend's request rate limit between batches.
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
}
