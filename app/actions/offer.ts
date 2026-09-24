"use server";

import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import {
  placeOffer as placeOfferShared,
  respondToOffer as respondToOfferShared,
} from "@/lib/offers";

// Thin wrappers over lib/offers.ts, which is itself thin over the RPCs in
// 033_price_offers.sql. Mirrors app/actions/swap.ts: authenticate, rate-limit,
// delegate, revalidate.
//
// The RPCs already refuse everything that matters (who may answer an offer,
// whether the listing takes offers, the amount bounds) and they carry their own
// per-actor throttle, since the mobile app calls them directly. The limiter
// here is the cheaper first line for the web.

export async function makeOffer(
  productId: string,
  amount: number,
  note?: string,
  countersId?: string,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Please sign in to make an offer." };

  if (!rateLimit(`offer:${user.id}`, 12, 60_000)) {
    return { error: "You're sending offers too quickly. Give it a minute." };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter an amount greater than ₦0." };
  }

  const result = await placeOfferShared(supabase, {
    productId,
    amount,
    note,
    countersId: countersId ?? null,
  });

  if ("error" in result) return result;

  if (result.offer.conversation_id) {
    revalidatePath(`/messages/${result.offer.conversation_id}`);
  }
  revalidatePath("/messages");
  revalidatePath("/offers");

  return { success: true as const, offer: result.offer };
}

export async function respondToOffer(
  offerId: string,
  action: "accept" | "decline" | "withdraw",
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Please sign in first." };

  if (!rateLimit(`offer-respond:${user.id}`, 30, 60_000)) {
    return { error: "Too many changes at once. Give it a moment." };
  }

  const result = await respondToOfferShared(supabase, offerId, action);

  if ("error" in result) return result;

  if (result.offer.conversation_id) {
    revalidatePath(`/messages/${result.offer.conversation_id}`);
  }
  revalidatePath("/messages");
  revalidatePath("/offers");
  // An accepted offer changes the price the product page offers to charge.
  revalidatePath("/product/[id]", "page");

  return { success: true as const, offer: result.offer };
}
