import { NextRequest, NextResponse } from "next/server";
import { initCheckout } from "@/lib/checkout";
import { getMobileUser, createUserScopedClient } from "@/lib/supabase/mobile";

// Mirrors app/actions/checkout.ts:createCheckoutSession — the app calls this
// after the Buy button, then opens the returned checkoutUrl in a WebView.
export async function POST(request: NextRequest) {
  const auth = await getMobileUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: { productId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  const supabase = createUserScopedClient(auth.token);
  const result = await initCheckout(supabase, body.productId, auth.user.email!);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
