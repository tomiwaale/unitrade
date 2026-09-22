import { NextRequest, NextResponse } from "next/server";
import { deleteUserAccount } from "@/lib/account";
import { getMobileUser } from "@/lib/supabase/mobile";

export async function POST(request: NextRequest) {
  const auth = await getMobileUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const result = await deleteUserAccount(auth.user.id);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
