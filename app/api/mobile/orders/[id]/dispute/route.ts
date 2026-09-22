import { NextRequest, NextResponse } from "next/server";
import { disputeOrder, isDisputeReason } from "@/lib/orders";
import { getMobileUser } from "@/lib/supabase/mobile";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getMobileUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  // The mobile dispute sheet posts a structured claim; an empty body is
  // still valid so an older client keeps working.
  const body = await request.json().catch(() => ({}));
  const reason = isDisputeReason(body?.reason) ? body.reason : undefined;
  const explanation = typeof body?.explanation === "string" ? body.explanation.slice(0, 2000) : undefined;
  const evidence = Array.isArray(body?.evidence)
    ? body.evidence.filter((url: unknown): url is string => typeof url === "string")
    : undefined;

  const { id } = await params;
  const result = await disputeOrder(id, auth.user.id, { reason, explanation, evidence });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
