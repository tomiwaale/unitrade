import { NextRequest, NextResponse } from "next/server";
import { savePayoutDetails } from "@/lib/payout";
import { getMobileUser } from "@/lib/supabase/mobile";

export async function POST(request: NextRequest) {
  const auth = await getMobileUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: { bankCode?: string; bankName?: string; accountNumber?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = await savePayoutDetails(
    {
      bankCode: body.bankCode ?? "",
      bankName: body.bankName ?? "",
      accountNumber: body.accountNumber ?? "",
    },
    auth.user.id,
  );

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
