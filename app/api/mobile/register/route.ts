import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/lib/auth";
import type { RegisterInput } from "@/lib/validations/auth";

// Registration endpoint for the Flutter app. Mirrors the web register()
// server action (same validation, rate limiting, and phone-uniqueness
// rules via the shared registerUser() in lib/auth.ts) since Server Actions
// aren't callable from a non-Next.js client. After a successful response
// the app signs in directly against Supabase with the same credentials —
// this route only creates the account, it doesn't hand back a session.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const result = await registerUser(body as RegisterInput, ip);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
