// Email via Resend (https://resend.com — free tier: 3,000 emails/month).
// Set RESEND_API_KEY and ADMIN_EMAIL in .env.local.
// The `from` address must be on a domain you have verified in Resend.
export async function sendAdminEmail(subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!apiKey || !adminEmail) {
    console.warn("[email] RESEND_API_KEY or ADMIN_EMAIL not set — skipping:", subject);
    return;
  }

  const fromDomain = process.env.EMAIL_FROM ?? "noreply@kolejswap.com";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `KolejSwap <${fromDomain}>`,
      to: [adminEmail],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error("[email] Resend error:", await res.text());
  }
}
