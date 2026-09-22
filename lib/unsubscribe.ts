import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Signed unsubscribe links. The recipient's address is carried in the URL and
// authenticated with an HMAC, so a link can't be edited to opt somebody else
// out, and no per-recipient token needs storing.
//
// Signed with UNSUBSCRIBE_SECRET, falling back to CRON_SECRET so existing
// deployments keep working without a new env var. Rotating the secret only
// invalidates unsubscribe links in already-delivered emails.

function secret() {
  const value = process.env.UNSUBSCRIBE_SECRET ?? process.env.CRON_SECRET;
  if (!value) {
    console.warn("[unsubscribe] no UNSUBSCRIBE_SECRET or CRON_SECRET set");
  }
  return value ?? "";
}

function b64url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function sign(email: string) {
  return createHmac("sha256", secret()).update(email.toLowerCase()).digest("base64url");
}

export function unsubscribeToken(email: string): string {
  return `${b64url(email.toLowerCase())}.${sign(email)}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  if (!secret()) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  let email: string;
  try {
    email = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expected = Buffer.from(sign(email));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length) return null;

  return timingSafeEqual(expected, provided) ? email : null;
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? process.env.APP_URL ?? "";
}

// Human-facing link in the email footer — opens a page with a confirm button
// so link-scanning inboxes can't opt someone out by prefetching it.
export function unsubscribeUrl(email: string): string {
  return `${siteUrl()}/unsubscribe?t=${unsubscribeToken(email)}`;
}

// Target for the List-Unsubscribe header. A POST here is a deliberate action
// from the mail client's own unsubscribe control, so it opts out immediately.
export function unsubscribeApiUrl(email: string): string {
  return `${siteUrl()}/api/unsubscribe?t=${unsubscribeToken(email)}`;
}

// Records the opt-out in both places: the suppression list (authoritative, and
// works for addresses with no account) and the profile flag (so the user's own
// settings screen reflects it).
export async function applyUnsubscribe(email: string): Promise<void> {
  const admin = createAdminClient();
  const normalised = email.toLowerCase();
  const now = new Date().toISOString();

  // Emails live in auth.users, which PostgREST can't read — the RPC does the
  // lookup in SQL. An address with no account still gets suppressed.
  const { data: userId } = await admin.rpc("user_id_for_email", { p_email: normalised });

  await admin
    .from("email_unsubscribes")
    .upsert(
      { email: normalised, user_id: userId ?? null, unsubscribed_at: now },
      { onConflict: "email" }
    );

  if (userId) {
    await admin
      .from("profiles")
      .update({ marketing_opt_in: false, marketing_opt_out_at: now })
      .eq("id", userId);
  }
}

// Re-subscribes an address (used by the profile settings toggle).
export async function applyResubscribe(email: string, userId?: string | null): Promise<void> {
  const admin = createAdminClient();
  await admin.from("email_unsubscribes").delete().eq("email", email.toLowerCase());
  if (userId) {
    await admin
      .from("profiles")
      .update({ marketing_opt_in: true, marketing_opt_out_at: null })
      .eq("id", userId);
  }
}
