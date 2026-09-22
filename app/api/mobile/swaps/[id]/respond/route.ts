import { NextRequest, NextResponse } from "next/server";
import { respondToSwap } from "@/lib/swap";
import { getMobileUser } from "@/lib/supabase/mobile";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getMobileUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action;
  if (action !== "accepted" && action !== "declined") {
    return NextResponse.json({ error: "action must be 'accepted' or 'declined'" }, { status: 400 });
  }

  const { id } = await params;
  const result = await respondToSwap(auth.user.id, id, action);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
