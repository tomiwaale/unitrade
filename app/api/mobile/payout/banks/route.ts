import { NextRequest, NextResponse } from "next/server";
import { fetchBanks } from "@/lib/paystack";
import { getMobileUser } from "@/lib/supabase/mobile";

export async function GET(request: NextRequest) {
  const auth = await getMobileUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const banks = await fetchBanks();
    return NextResponse.json({ banks });
  } catch {
    return NextResponse.json({ banks: [] });
  }
}
