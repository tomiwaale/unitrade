import { NextRequest, NextResponse } from "next/server";
import { proposeSwap } from "@/lib/swap";
import { getMobileUser, createUserScopedClient } from "@/lib/supabase/mobile";

export async function POST(request: NextRequest) {
  const auth = await getMobileUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { wantedProductId, offeredProductId, note, cashTopup } = body;

  if (!wantedProductId || !offeredProductId) {
    return NextResponse.json({ error: "wantedProductId and offeredProductId are required" }, { status: 400 });
  }

  const supabase = createUserScopedClient(auth.token);
  const result = await proposeSwap(supabase, auth.user.id, wantedProductId, offeredProductId, note, cashTopup);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
