import { NextRequest, NextResponse } from "next/server";
import { cancelSwap } from "@/lib/swap";
import { getMobileUser } from "@/lib/supabase/mobile";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getMobileUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  const result = await cancelSwap(auth.user.id, id);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
