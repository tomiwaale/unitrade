"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { initializeTransaction } from "@/lib/paystack";
import { redirect } from "next/navigation";

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

export async function createCheckoutSession(productId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/product/" + productId);
  }

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
  let checkoutUrl: string;
  try {
    const session = await initializeTransaction({
      email: user.email!,
      amount: amountInKobo,
      reference,
      callback_url: `${process.env.APP_URL}/api/paystack/callback`,
      subaccount: sellerSubaccountCode,
      bearer: "account",
    });
    checkoutUrl = session.authorization_url;
  } catch (err: any) {
    const admin = createAdminClient();
    await admin.rpc("release_checkout_reservation", { p_reference: reference });
    return { error: err.message || "Failed to initialize payment." };
  }

  redirect(checkoutUrl);
}
