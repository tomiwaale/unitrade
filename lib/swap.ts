import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { notify } from "@/lib/notifications";

export type ProposeSwapResult = { success: true; swapId: string } | { error: string };
export type SwapActionResult = { success: true } | { error: string };

// Shared by app/actions/swap.ts proposeSwap() (cookie-scoped client) and
// POST /api/mobile/swaps (Bearer-token-scoped client — see
// lib/supabase/mobile.ts:createUserScopedClient). RLS on swap_offers INSERT
// already enforces the wanted/offered-product invariants
// (015_launch_hardening.sql); this adds the conversation/chat-message side
// effect and notification on top of the raw insert.
export async function proposeSwap(
  supabase: SupabaseClient,
  userId: string,
  wantedProductId: string,
  offeredProductId: string,
  note?: string,
  cashTopup?: number,
): Promise<ProposeSwapResult> {
  if (!rateLimit(`swap:${userId}`, 10, 60_000)) {
    return { error: "You're sending offers too quickly. Please wait a moment." };
  }

  const { data: wanted } = await supabase
    .from("products")
    .select("seller_id, title, status, open_to")
    .eq("id", wantedProductId)
    .single();

  if (!wanted || wanted.status !== "active") {
    return { error: "This item is no longer available." };
  }
  if (!["cash-or-swap", "swap-only"].includes(wanted.open_to ?? "")) {
    return { error: "This seller is not accepting swap offers for this item." };
  }
  if (wanted.seller_id === userId) {
    return { error: "You cannot swap with yourself." };
  }

  const { data: offered } = await supabase
    .from("products")
    .select("seller_id, title, status")
    .eq("id", offeredProductId)
    .single();

  if (!offered) return { error: "Your offered item was not found." };
  if (offered.seller_id !== userId) return { error: "You can only offer your own listings." };
  if (offered.status !== "active") return { error: "Your offered item is no longer active." };

  // Guard: no duplicate pending offer for the same pair
  const { data: existing } = await supabase
    .from("swap_offers")
    .select("id")
    .eq("wanted_product_id", wantedProductId)
    .eq("offered_product_id", offeredProductId)
    .eq("buyer_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return { error: "You already have a pending swap offer for this pair." };
  }

  const topup = cashTopup && cashTopup > 0 ? cashTopup : 0;

  const { data: swapOffer, error } = await supabase
    .from("swap_offers")
    .insert({
      wanted_product_id: wantedProductId,
      offered_product_id: offeredProductId,
      buyer_id: userId,
      seller_id: wanted.seller_id,
      note: note?.trim() || null,
      cash_topup: topup,
    })
    .select("id")
    .single();

  if (error || !swapOffer) {
    return { error: "Failed to create swap offer. Please try again." };
  }

  // Open/reuse conversation and drop a message so the seller is notified in chat
  const { data: conv } = await supabase
    .from("conversations")
    .upsert(
      { product_id: wantedProductId, buyer_id: userId, seller_id: wanted.seller_id },
      { onConflict: "product_id,buyer_id", ignoreDuplicates: false },
    )
    .select("id")
    .single();

  if (conv) {
    const offerLine = topup > 0
      ? `I'm offering: "${offered.title}" + ₦${topup.toLocaleString()} cash`
      : `I'm offering: "${offered.title}"`;

    const msgParts = [
      `I'd like to swap for your "${wanted.title}".`,
      offerLine,
      note?.trim() ? `\n${note.trim()}` : "",
      `\nReview the offer → /swaps`,
    ].filter(Boolean);

    await supabase.from("messages").insert({
      conversation_id: conv.id,
      sender_id: userId,
      content: msgParts.join("\n"),
    });
  }

  void notify(
    wanted.seller_id,
    "swap",
    "New swap offer",
    `Someone wants to swap for "${wanted.title}"`,
    swapOffer.id,
  );

  return { success: true, swapId: swapOffer.id };
}

// Shared by app/actions/swap.ts respondToSwap() and POST
// /api/mobile/swaps/[id]/respond. Uses the admin client since UPDATE on
// swap_offers is revoked for anon/authenticated (015_launch_hardening.sql).
export async function respondToSwap(
  userId: string,
  swapId: string,
  action: "accepted" | "declined",
): Promise<SwapActionResult> {
  const admin = createAdminClient();

  const { data: offer } = await admin
    .from("swap_offers")
    .select("id, seller_id, buyer_id, wanted_product_id, offered_product_id, status")
    .eq("id", swapId)
    .single();

  if (!offer) return { error: "Swap offer not found" };
  if (offer.seller_id !== userId) return { error: "Only the seller can respond to this offer" };
  if (offer.status !== "pending") return { error: "This offer is no longer pending" };

  const now = new Date().toISOString();

  await admin
    .from("swap_offers")
    .update({ status: action, updated_at: now })
    .eq("id", swapId);

  if (action === "accepted") {
    // Mark both items sold
    await admin.from("products").update({ status: "sold" }).eq("id", offer.wanted_product_id);
    await admin.from("products").update({ status: "sold" }).eq("id", offer.offered_product_id);

    // Auto-decline every other pending offer touching either product
    await admin
      .from("swap_offers")
      .update({ status: "declined", updated_at: now })
      .neq("id", swapId)
      .eq("status", "pending")
      .or(
        [
          `wanted_product_id.eq.${offer.wanted_product_id}`,
          `offered_product_id.eq.${offer.wanted_product_id}`,
          `wanted_product_id.eq.${offer.offered_product_id}`,
          `offered_product_id.eq.${offer.offered_product_id}`,
        ].join(","),
      );
  }

  void notify(
    offer.buyer_id,
    "swap",
    action === "accepted" ? "Swap offer accepted!" : "Swap offer declined",
    action === "accepted"
      ? "Your swap offer was accepted. Check your swaps to coordinate the exchange."
      : "Your swap offer was not accepted this time.",
    offer.wanted_product_id,
  );

  return { success: true };
}

// Shared by app/actions/swap.ts cancelSwap() and POST
// /api/mobile/swaps/[id]/cancel.
export async function cancelSwap(userId: string, swapId: string): Promise<SwapActionResult> {
  const admin = createAdminClient();

  const { data: offer } = await admin
    .from("swap_offers")
    .select("id, buyer_id, status, wanted_product_id, offered_product_id")
    .eq("id", swapId)
    .single();

  if (!offer) return { error: "Swap offer not found" };
  if (offer.buyer_id !== userId) return { error: "Only the buyer can cancel this offer" };
  if (offer.status !== "pending") return { error: "This offer can no longer be cancelled" };

  await admin
    .from("swap_offers")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", swapId);

  return { success: true };
}
