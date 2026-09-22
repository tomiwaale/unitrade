import { NextRequest, NextResponse } from "next/server";
import { submitReview } from "@/lib/reviews";
import { getMobileUser } from "@/lib/supabase/mobile";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getMobileUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: { rating?: number; comment?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof body.rating !== "number") {
    return NextResponse.json({ error: "rating is required" }, { status: 400 });
  }

  const { id } = await params;
  const result = await submitReview(id, body.rating, body.comment ?? "", auth.user.id);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
