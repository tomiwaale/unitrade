import { NextResponse } from "next/server";
import { verifyTransaction } from "@/lib/paystack";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const reference = searchParams.get("reference");

  if (!reference) {
    return NextResponse.redirect(`${origin}/catalog?error=missing_reference`);
  }

  try {
    const paymentData = await verifyTransaction(reference);

    if (paymentData.status !== "success") {
      return NextResponse.redirect(`${origin}/catalog?error=payment_failed`);
    }

    // Use admin client to bypass RLS — the buyer's session may not have permission
    // to mark another user's product as sold.
    const supabase = createAdminClient();

    // 7 days from now — buyer must confirm receipt before this date
    const autoReleaseAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: order } = await supabase
      .from("orders")
      .update({
        status: "paid",
        auto_release_at: autoReleaseAt,
      })
      .eq("paystack_reference", reference)
      .select("id, product_id")
      .single();

    // Mark the product as sold so nobody else can buy it
    if (order?.product_id) {
      await supabase
        .from("products")
        .update({ status: "sold" })
        .eq("id", order.product_id);
    }

    return NextResponse.redirect(
      `${origin}/orders?success=payment_received`
    );
  } catch (error) {
    console.error("Paystack callback error:", error);
    return NextResponse.redirect(`${origin}/catalog?error=verification_error`);
  }
}
