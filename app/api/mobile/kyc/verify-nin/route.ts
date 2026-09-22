import { NextRequest, NextResponse } from "next/server";
import { submitNINVerification } from "@/lib/kyc";
import { getMobileUser } from "@/lib/supabase/mobile";

export async function POST(request: NextRequest) {
  const auth = await getMobileUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: { nin?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.nin) {
    return NextResponse.json({ error: "nin is required" }, { status: 400 });
  }

  const result = await submitNINVerification(body.nin, auth.user.id);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
