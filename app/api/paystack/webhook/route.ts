import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminEmail } from "@/lib/email";

// Paystack signs every webhook with HMAC-SHA512 using your secret key.
// Register this URL in Paystack Dashboard → Settings → API Keys & Webhooks.
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  const hash = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest("hex");

  if (hash !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.event === "transfer.failed" || event.event === "transfer.reversed") {
    const { reference, amount, recipient, reason } = event.data ?? {};
    const amountNGN = amount ? `₦${(amount / 100).toLocaleString()}` : "unknown amount";
    const recipientName = recipient?.details?.account_name ?? "Unknown";
    const bankName = recipient?.details?.bank_name ?? "";
    const label = event.event === "transfer.failed" ? "Failed" : "Reversed";

    console.error(`[paystack-webhook] Transfer ${label}:`, reference, amountNGN);

    await sendAdminEmail(
      `URGENT: Seller payout ${label} — ${reference}`,
      `
        <h2 style="color:#9B1C1C">Seller Payout ${label}</h2>
        <table style="border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 12px;color:#666">Reference</td><td style="padding:6px 12px;font-weight:600">${reference}</td></tr>
          <tr><td style="padding:6px 12px;color:#666">Amount</td><td style="padding:6px 12px;font-weight:600">${amountNGN}</td></tr>
          <tr><td style="padding:6px 12px;color:#666">Recipient</td><td style="padding:6px 12px">${recipientName} · ${bankName}</td></tr>
          ${reason ? `<tr><td style="padding:6px 12px;color:#666">Reason</td><td style="padding:6px 12px">${reason}</td></tr>` : ""}
        </table>
        <p style="margin-top:16px">
          <a href="${process.env.APP_URL}/admin/orders"
            style="background:#9B1C1C;color:white;padding:10px 18px;border-radius:6px;text-decoration:none;">
            Review orders
          </a>
        </p>
        <p style="font-size:12px;color:#666;margin-top:16px">
          You will need to manually retry the transfer from the Paystack dashboard or re-initiate it from the admin panel.
        </p>
      `
    );
  }

  if (event.event === "transfer.success") {
    const { reference, amount, recipient } = event.data ?? {};
    const amountNGN = amount ? (amount / 100).toLocaleString() : "?";
    const recipientName = recipient?.details?.account_name ?? "Unknown";
    console.log(`[paystack-webhook] Transfer succeeded: ${reference} ₦${amountNGN} → ${recipientName}`);

    // Belt-and-suspenders: if an auto-release order was claimed (confirmed_at set)
    // but released_at never wrote (e.g. server crashed mid-flight), mark it complete now.
    if (reference?.startsWith("AUTO-")) {
      const supabase = createAdminClient();
      await supabase
        .from("orders")
        .update({ released_at: new Date().toISOString() })
        .eq("status", "confirmed")
        .is("released_at", null);
    }
  }

  // charge.success is handled by /api/paystack/callback (redirect route).

  return NextResponse.json({ received: true });
}
