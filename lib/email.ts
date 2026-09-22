// Email via Resend (https://resend.com — free tier: 3,000 emails/month).
// Set RESEND_API_KEY and ADMIN_EMAIL in .env.local.
// The `from` address must be on a domain you have verified in Resend.

const FROM = `KolejSwap <${process.env.EMAIL_FROM ?? "noreply@kolejswap.com"}>`;

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  headers?: Record<string, string>;
};

export type SendResult = { ok: true } | { ok: false; error: string };

async function sendEmail(email: OutgoingEmail): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping:", email.subject);
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      ...(email.headers ? { headers: email.headers } : {}),
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("[email] Resend error:", error);
    return { ok: false, error: error.slice(0, 500) };
  }

  return { ok: true };
}

// Resend's batch endpoint takes up to 100 fully distinct messages per call,
// which is what lets every campaign recipient get their own merge fields and
// their own signed unsubscribe link without one request per person.
// A batch is rejected as a whole, so on failure we retry the chunk one message
// at a time — otherwise one bad address would mark 99 good ones as failed.
export async function sendEmailBatch(emails: OutgoingEmail[]): Promise<SendResult[]> {
  if (emails.length === 0) return [];

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping batch of", emails.length);
    return emails.map(() => ({ ok: false as const, error: "RESEND_API_KEY not configured" }));
  }

  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      emails.map((e) => ({
        from: FROM,
        to: [e.to],
        subject: e.subject,
        html: e.html,
        ...(e.headers ? { headers: e.headers } : {}),
      }))
    ),
  });

  if (res.ok) return emails.map(() => ({ ok: true as const }));

  console.error("[email] Resend batch error, retrying individually:", await res.text());
  const results: SendResult[] = [];
  for (const email of emails) {
    results.push(await sendEmail(email));
  }
  return results;
}

export async function sendAdminEmail(subject: string, html: string) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn("[email] ADMIN_EMAIL not set — skipping:", subject);
    return;
  }
  await sendEmail({ to: adminEmail, subject, html });
}

export async function sendUserEmail(to: string, subject: string, html: string) {
  await sendEmail({ to, subject, html });
}

// ── Shared template wrapper ──────────────────────────────────────────────────
function wrap(body: string, opts?: { preheader?: string; unsubscribeUrl?: string }) {
  // Hidden preview text — what inboxes show next to the subject line.
  const preheader = opts?.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${opts.preheader}</div>`
    : "";

  // Only campaign email passes an unsubscribe URL; transactional mail must not
  // offer an opt-out, since recipients still need order and payout notices.
  const unsubscribe = opts?.unsubscribeUrl
    ? `<p style="font-size:12px;color:#9ca3af;margin:8px 0 0">
         You're receiving this because you have a KolejSwap account.
         <a href="${opts.unsubscribeUrl}" style="color:#9ca3af">Unsubscribe from marketing emails</a>.
       </p>`
    : "";

  return `
    ${preheader}
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#111">
      <div style="margin-bottom:24px">
        <span style="font-size:20px;font-weight:700;color:#16a34a">KolejSwap</span>
      </div>
      ${body}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0"/>
      <p style="font-size:12px;color:#9ca3af;margin:0">
        KolejSwap — the student marketplace. Questions? Reply to this email.
      </p>
      ${unsubscribe}
    </div>
  `;
}

// Campaign bodies come from the admin composer already rendered to HTML by
// markdownToEmailHtml, so they only need the brand chrome and opt-out footer.
export function wrapMarketingEmail(
  bodyHtml: string,
  opts: { preheader?: string; unsubscribeUrl?: string }
) {
  return wrap(bodyHtml, opts);
}

// ── User-facing email templates ──────────────────────────────────────────────

export function emailOrderConfirmedBuyer(opts: {
  buyerName: string;
  productTitle: string;
  amount: number;
  orderId: string;
  ordersUrl: string;
}) {
  return {
    subject: `Order confirmed — ${opts.productTitle}`,
    html: wrap(`
      <h2 style="margin:0 0 8px">Payment received ✓</h2>
      <p style="color:#6b7280;margin:0 0 24px">Your payment is held in escrow until you confirm delivery.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
        <tr style="background:#f9fafb">
          <td style="padding:10px 14px;color:#6b7280">Item</td>
          <td style="padding:10px 14px;font-weight:600">${opts.productTitle}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;color:#6b7280">Amount paid</td>
          <td style="padding:10px 14px;font-weight:600">₦${opts.amount.toLocaleString()}</td>
        </tr>
        <tr style="background:#f9fafb">
          <td style="padding:10px 14px;color:#6b7280">Order ref</td>
          <td style="padding:10px 14px">${opts.orderId.slice(0, 8).toUpperCase()}</td>
        </tr>
      </table>
      <p style="font-size:14px;color:#374151;margin:0 0 24px">
        Once you receive the item, go to your orders and tap <b>"I've received this"</b>
        to release payment to the seller. If there's a problem, you can raise a dispute within 7 days.
      </p>
      <a href="${opts.ordersUrl}" style="display:inline-block;background:#16a34a;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View my orders</a>
    `),
  };
}

export function emailOrderNotificationSeller(opts: {
  sellerName: string;
  productTitle: string;
  amount: number;
  orderId: string;
  ordersUrl: string;
}) {
  return {
    subject: `Your item sold — ${opts.productTitle}`,
    html: wrap(`
      <h2 style="margin:0 0 8px">You made a sale! 🎉</h2>
      <p style="color:#6b7280;margin:0 0 24px">Payment is held in escrow. You'll be paid once the buyer confirms receipt.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
        <tr style="background:#f9fafb">
          <td style="padding:10px 14px;color:#6b7280">Item</td>
          <td style="padding:10px 14px;font-weight:600">${opts.productTitle}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;color:#6b7280">Sale amount</td>
          <td style="padding:10px 14px;font-weight:600">₦${opts.amount.toLocaleString()}</td>
        </tr>
        <tr style="background:#f9fafb">
          <td style="padding:10px 14px;color:#6b7280">You'll receive</td>
          <td style="padding:10px 14px;font-weight:600">₦${Math.round(opts.amount * 0.9).toLocaleString()} <span style="color:#6b7280;font-weight:400">(after 10% fee)</span></td>
        </tr>
      </table>
      <p style="font-size:14px;color:#374151;margin:0 0 24px">
        Arrange delivery or meetup with the buyer. Once they confirm receipt, the funds will be transferred to your bank account automatically.
      </p>
      <a href="${opts.ordersUrl}" style="display:inline-block;background:#16a34a;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View orders</a>
    `),
  };
}

export function emailPayoutSent(opts: {
  sellerName: string;
  productTitle: string;
  amount: number;
}) {
  return {
    subject: "Payment sent to your bank account",
    html: wrap(`
      <h2 style="margin:0 0 8px">Payment on its way 💸</h2>
      <p style="color:#6b7280;margin:0 0 24px">The buyer confirmed receipt. Your payout has been initiated.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
        <tr style="background:#f9fafb">
          <td style="padding:10px 14px;color:#6b7280">Item</td>
          <td style="padding:10px 14px;font-weight:600">${opts.productTitle}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;color:#6b7280">Amount</td>
          <td style="padding:10px 14px;font-weight:600">₦${Math.round(opts.amount * 0.9).toLocaleString()}</td>
        </tr>
      </table>
      <p style="font-size:14px;color:#374151;margin:0">
        Bank transfers typically arrive within 1–2 business days. Thank you for selling on KolejSwap!
      </p>
    `),
  };
}

export function emailDisputeFiled(opts: {
  buyerName: string;
  productTitle: string;
  orderId: string;
}) {
  return {
    subject: `Dispute received — ${opts.productTitle}`,
    html: wrap(`
      <h2 style="margin:0 0 8px">We've received your dispute</h2>
      <p style="color:#6b7280;margin:0 0 24px">Your payment remains frozen while we review the issue.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
        <tr style="background:#f9fafb">
          <td style="padding:10px 14px;color:#6b7280">Item</td>
          <td style="padding:10px 14px;font-weight:600">${opts.productTitle}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;color:#6b7280">Order ref</td>
          <td style="padding:10px 14px">${opts.orderId.slice(0, 8).toUpperCase()}</td>
        </tr>
      </table>
      <p style="font-size:14px;color:#374151;margin:0">
        Our team will review your dispute and get back to you. Please do not attempt to contact the seller directly about this issue.
      </p>
    `),
  };
}

export function emailDisputeResolvedSeller(opts: {
  sellerName: string;
  productTitle: string;
  amount: number;
}) {
  return {
    subject: "Dispute resolved — payment released to you",
    html: wrap(`
      <h2 style="margin:0 0 8px">Dispute resolved in your favour</h2>
      <p style="color:#6b7280;margin:0 0 24px">After review, we've released the escrowed payment to your bank account.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
        <tr style="background:#f9fafb">
          <td style="padding:10px 14px;color:#6b7280">Item</td>
          <td style="padding:10px 14px;font-weight:600">${opts.productTitle}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;color:#6b7280">Amount released</td>
          <td style="padding:10px 14px;font-weight:600">₦${Math.round(opts.amount * 0.9).toLocaleString()}</td>
        </tr>
      </table>
      <p style="font-size:14px;color:#374151;margin:0">Bank transfers typically arrive within 1–2 business days.</p>
    `),
  };
}

export function emailDisputeResolvedBuyer(opts: {
  buyerName: string;
  productTitle: string;
  amount: number;
}) {
  return {
    subject: "Dispute resolved — refund initiated",
    html: wrap(`
      <h2 style="margin:0 0 8px">Refund on its way</h2>
      <p style="color:#6b7280;margin:0 0 24px">After review, we've initiated a refund to your original payment method.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
        <tr style="background:#f9fafb">
          <td style="padding:10px 14px;color:#6b7280">Item</td>
          <td style="padding:10px 14px;font-weight:600">${opts.productTitle}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;color:#6b7280">Refund amount</td>
          <td style="padding:10px 14px;font-weight:600">₦${opts.amount.toLocaleString()}</td>
        </tr>
      </table>
      <p style="font-size:14px;color:#374151;margin:0">Refunds typically take 5–10 business days to appear depending on your bank.</p>
    `),
  };
}

// ── Account lifecycle ────────────────────────────────────────────────────────

function verifiedBadge(label: string) {
  return `<div style="display:inline-block;background:#dcfce7;color:#15803d;font-size:12px;font-weight:700;padding:6px 12px;border-radius:999px;margin-bottom:16px">✓ ${label}</div>`;
}

export function emailWelcome(opts: {
  name: string;
  university?: string | null;
  catalogUrl: string;
  kycUrl: string;
}) {
  const firstName = opts.name?.trim().split(/\s+/)[0] || "there";
  const campus = opts.university?.trim();

  return {
    subject: "Welcome to KolejSwap 👋",
    html: wrap(
      `
      <h2 style="margin:0 0 8px;font-size:22px">Welcome, ${firstName}!</h2>
      <p style="color:#6b7280;margin:0 0 24px;font-size:15px;line-height:1.6">
        Your KolejSwap account is ready${campus ? ` — you're set up at <b>${campus}</b>` : ""}.
        Buy, sell and swap with students on your campus, with every payment protected by escrow.
      </p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
        <tr style="background:#f9fafb">
          <td style="padding:12px 14px;width:32px">🛍️</td>
          <td style="padding:12px 14px;color:#374151">Browse listings from students near you</td>
        </tr>
        <tr>
          <td style="padding:12px 14px">🔒</td>
          <td style="padding:12px 14px;color:#374151">Your money stays in escrow until you confirm delivery</td>
        </tr>
        <tr style="background:#f9fafb">
          <td style="padding:12px 14px">🪪</td>
          <td style="padding:12px 14px;color:#374151">Verify your student ID and NIN to start selling</td>
        </tr>
      </table>

      <a href="${opts.catalogUrl}" style="display:inline-block;background:#16a34a;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Start browsing</a>

      <p style="font-size:14px;color:#374151;margin:24px 0 0">
        Planning to sell? <a href="${opts.kycUrl}" style="color:#16a34a">Get verified</a> first — it takes about two minutes.
      </p>
    `,
      { preheader: "Your student marketplace account is ready — here's how to get started." }
    ),
  };
}

export function emailKycApproved(opts: { name: string; sellUrl: string }) {
  const firstName = opts.name?.trim().split(/\s+/)[0] || "there";

  return {
    subject: "Your school ID is verified — you can start selling",
    html: wrap(
      `
      ${verifiedBadge("School ID verified")}
      <h2 style="margin:0 0 8px;font-size:22px">You're verified, ${firstName}</h2>
      <p style="color:#6b7280;margin:0 0 24px;font-size:15px;line-height:1.6">
        We've reviewed and approved your student ID. Your account now carries the verified badge,
        so buyers can see you're a real student on your campus — and you can list items for sale.
      </p>
      <a href="${opts.sellUrl}" style="display:inline-block;background:#16a34a;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">List your first item</a>
      <p style="font-size:14px;color:#374151;margin:24px 0 0">
        Payments for your sales are held in escrow and paid to your bank account once the buyer confirms delivery.
      </p>
    `,
      { preheader: "Your student ID was approved — your account is verified." }
    ),
  };
}

export function emailNinVerified(opts: {
  name: string;
  ninLast4: string;
  sellUrl: string;
  schoolIdPending: boolean;
  kycUrl: string;
}) {
  const firstName = opts.name?.trim().split(/\s+/)[0] || "there";

  const nextStep = opts.schoolIdPending
    ? `<p style="font-size:14px;color:#374151;margin:0 0 24px">
         One step left: upload your school ID so we can confirm you're a student on your campus.
       </p>
       <a href="${opts.kycUrl}" style="display:inline-block;background:#16a34a;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Upload school ID</a>`
    : `<a href="${opts.sellUrl}" style="display:inline-block;background:#16a34a;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Start selling</a>`;

  return {
    subject: "Identity verified ✓",
    html: wrap(
      `
      ${verifiedBadge("Identity verified")}
      <h2 style="margin:0 0 8px;font-size:22px">Your identity is confirmed, ${firstName}</h2>
      <p style="color:#6b7280;margin:0 0 24px;font-size:15px;line-height:1.6">
        We successfully verified the NIN ending in <b>${opts.ninLast4}</b>. This keeps KolejSwap safe
        for everyone and unlocks payouts to your bank account.
      </p>
      ${nextStep}
    `,
      { preheader: "Your NIN was verified successfully." }
    ),
  };
}

export function emailKycRejected(opts: { name: string; kycUrl: string }) {
  return {
    subject: "School ID submission — action required",
    html: wrap(`
      <h2 style="margin:0 0 8px">We couldn't verify your school ID</h2>
      <p style="color:#6b7280;margin:0 0 24px">Your submission was rejected. This is usually because the image was unclear or didn't show your name and matric number.</p>
      <p style="font-size:14px;color:#374151;margin:0 0 24px">Please upload a clearer photo of the front of your valid school ID card.</p>
      <a href="${opts.kycUrl}" style="display:inline-block;background:#16a34a;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Resubmit ID</a>
    `),
  };
}

// Sent once the account is already gone — the recipient can no longer sign
// in, so this is a receipt, not an action prompt.
export function emailAccountDeleted(opts: { name: string }) {
  const firstName = opts.name?.trim().split(/\s+/)[0] || "there";

  return {
    subject: "Your KolejSwap account has been deleted",
    html: wrap(`
      <h2 style="margin:0 0 8px">Your account has been deleted</h2>
      <p style="color:#6b7280;margin:0 0 24px;font-size:15px;line-height:1.6">
        Hi ${firstName}, this confirms your KolejSwap account and personal data — profile, listings,
        messages, saved items and notifications — have been permanently deleted, as you requested.
      </p>
      <p style="font-size:14px;color:#374151;margin:0 0 12px">
        Records of past transactions are kept for up to 7 years to comply with Nigerian financial
        regulations, with your identifying details removed from them.
      </p>
      <p style="font-size:14px;color:#374151;margin:0">
        Didn't request this? Contact us immediately at
        <a href="mailto:privacy@kolejswap.com" style="color:#16a34a">privacy@kolejswap.com</a>.
      </p>
    `),
  };
}
