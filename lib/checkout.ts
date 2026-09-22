import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { initializeTransaction } from "@/lib/paystack";

export type InitCheckoutResult = { checkoutUrl: string } | { error: string };

function checkoutErrorMessage(message?: string) {
  if (!message) return "Unable to start checkout. Please try again.";
  if (message.includes("PRODUCT_NOT_FOUND")) return "Product not found";
  if (message.includes("SELF_PURCHASE")) return "You cannot buy your own product";
  if (message.includes("PRODUCT_NOT_AVAILABLE")) return "This item is no longer available";
  if (message.includes("SELLER_PAYOUT_REQUIRED")) {
    return "Seller has not completed payout setup. Purchase is unavailable.";
  }
  if (message.includes("PRODUCT_CHECKOUT_RESERVED")) {
    return "Someone is already checking out this item. Please try again in a few minutes.";
  }
  return "Unable to start checkout. Please try again.";
}

// Shared by the web createCheckoutSession() server action (which redirects
// straight to the returned URL) and POST /api/mobile/checkout/init (which
// hands the URL back as JSON for the app to open in a WebView) — both need
// the same reservation + Paystack init sequence. `supabase` must be scoped
// to the calling user (cookie session on web, Bearer token on mobile — see
// lib/supabase/mobile.ts) since reserve_product_for_checkout relies on
// auth.uid().
export async function initCheckout(
  supabase: SupabaseClient,
  productId: string,
  userEmail: string,
): Promise<InitCheckoutResult> {
  const reference = `ORD-${Date.now()}-${productId.slice(0, 5)}`;

  const { data: reservation, error } = await supabase
    .rpc("reserve_product_for_checkout", {
      p_product_id: productId,
      p_reference: reference,
    })
    .single();

  if (error || !reservation) {
    console.error("[checkout] reservation failed:", error);
    return { error: checkoutErrorMessage(error?.message) };
  }

  const reservedOrder = reservation as {
    amount: number | string;
    seller_subaccount_code: string;
  };
  const amountInKobo = Math.round(Number(reservedOrder.amount) * 100);
  const sellerSubaccountCode = reservedOrder.seller_subaccount_code;

  // Split payment: 90% goes to seller's subaccount, 10% stays with KolejSwap.
  // KolejSwap bears the Paystack fee (comes from our 10% cut).
  // Seller's funds are settled when buyer confirms receipt via settleSubaccount().
  try {
    const session = await initializeTransaction({
      email: userEmail,
      amount: amountInKobo,
      reference,
      callback_url: `${process.env.APP_URL}/api/paystack/callback`,
      subaccount: sellerSubaccountCode,
      bearer: "account",
    });
    return { checkoutUrl: session.authorization_url };
  } catch (err: any) {
    const admin = createAdminClient();
    await admin.rpc("release_checkout_reservation", { p_reference: reference });
    return { error: err.message || "Failed to initialize payment." };
  }
}
