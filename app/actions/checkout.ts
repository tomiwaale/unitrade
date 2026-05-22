"use server";

import { createClient } from "@/lib/supabase/server";
import { initializeTransaction } from "@/lib/paystack";
import { redirect } from "next/navigation";

export async function createCheckoutSession(productId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/product/" + productId);
  }

  const { data: product, error } = await supabase
    .from("products")
    .select("*, profiles(full_name, subaccount_code)")
    .eq("id", productId)
    .single();

  if (error || !product) {
    return { error: "Product not found" };
  }

  if (product.seller_id === user.id) {
    return { error: "You cannot buy your own product" };
  }

  if (product.status !== "active") {
    return { error: "This item is no longer available" };
  }

  const sellerSubaccountCode = (product.profiles as any)?.subaccount_code as string | null;
  if (!sellerSubaccountCode) {
    return { error: "Seller has not completed payout setup. Purchase is unavailable." };
  }

  const reference = `ORD-${Date.now()}-${productId.slice(0, 5)}`;
  const amountInKobo = Math.round(product.price * 100);

  const { error: orderError } = await supabase.from("orders").insert({
    product_id: productId,
    buyer_id: user.id,
    amount: product.price,
    paystack_reference: reference,
    status: "pending",
  });

  if (orderError) {
    console.error(orderError);
    return { error: "Failed to create order. Please try again." };
  }

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
    return { error: err.message || "Failed to initialize payment." };
  }

  redirect(checkoutUrl);
}
