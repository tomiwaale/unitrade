// Email via Resend (https://resend.com — free tier: 3,000 emails/month).
// Set RESEND_API_KEY and ADMIN_EMAIL in .env.local.
// The `from` address must be on a domain you have verified in Resend.

const FROM = `KolejSwap <${process.env.EMAIL_FROM ?? "noreply@kolejswap.com"}>`;

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping:", subject);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });

  if (!res.ok) {
    console.error("[email] Resend error:", await res.text());
  }
}

export async function sendAdminEmail(subject: string, html: string) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn("[email] ADMIN_EMAIL not set — skipping:", subject);
    return;
  }
  await sendEmail(adminEmail, subject, html);
}

export async function sendUserEmail(to: string, subject: string, html: string) {
  await sendEmail(to, subject, html);
}

// ── Shared template wrapper ──────────────────────────────────────────────────
function wrap(body: string) {
  return `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#111">
      <div style="margin-bottom:24px">
        <span style="font-size:20px;font-weight:700;color:#16a34a">KolejSwap</span>
      </div>
      ${body}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0"/>
      <p style="font-size:12px;color:#9ca3af;margin:0">
        KolejSwap — the student marketplace. Questions? Reply to this email.
      </p>
    </div>
  `;
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

export function emailKycApproved(opts: { name: string; sellUrl: string }) {
  return {
    subject: "You're verified! Start selling on KolejSwap",
    html: wrap(`
      <h2 style="margin:0 0 8px">School ID approved ✓</h2>
      <p style="color:#6b7280;margin:0 0 24px">Your student identity has been verified. You can now list items for sale.</p>
      <a href="${opts.sellUrl}" style="display:inline-block;background:#16a34a;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Start selling</a>
    `),
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
