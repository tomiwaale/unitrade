import { NextResponse } from "next/server";
import { applyUnsubscribe, verifyUnsubscribeToken } from "@/lib/unsubscribe";

// One-click unsubscribe target for the List-Unsubscribe header (RFC 8058).
// Gmail and Apple Mail POST here when the recipient uses the mail client's own
// unsubscribe control, which is an explicit action — so it opts out with no
// confirmation step. GET just forwards to the confirmation page.

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("t");
  const email = token ? verifyUnsubscribeToken(token) : null;

  if (!email) {
    return NextResponse.json({ error: "Invalid unsubscribe link" }, { status: 400 });
  }

  try {
    await applyUnsubscribe(email);
  } catch (err) {
    console.error("[unsubscribe] failed:", err);
    return NextResponse.json({ error: "Could not process request" }, { status: 500 });
  }

  return NextResponse.json({ unsubscribed: true });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.APP_URL ?? "";
  return NextResponse.redirect(`${base}/unsubscribe?t=${encodeURIComponent(token)}`);
}
