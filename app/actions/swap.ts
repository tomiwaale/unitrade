"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function proposeSwap(
  wantedProductId: string,
  offeredProductId: string,
  note?: string,
  cashTopup?: number,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: wanted } = await supabase
    .from("products")
    .select("seller_id, title, status, open_to")
    .eq("id", wantedProductId)
    .single();

  if (!wanted || wanted.status !== "active") {
    return { error: "This item is no longer available." };
  }
  if (wanted.seller_id === user.id) {
    return { error: "You cannot swap with yourself." };
  }

  const { data: offered } = await supabase
    .from("products")
    .select("seller_id, title, status")
    .eq("id", offeredProductId)
    .single();

  if (!offered) return { error: "Your offered item was not found." };
  if (offered.seller_id !== user.id) return { error: "You can only offer your own listings." };
  if (offered.status !== "active") return { error: "Your offered item is no longer active." };

  // Guard: no duplicate pending offer for the same pair
  const { data: existing } = await supabase
    .from("swap_offers")
    .select("id")
    .eq("wanted_product_id", wantedProductId)
    .eq("offered_product_id", offeredProductId)
    .eq("buyer_id", user.id)
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
      buyer_id: user.id,
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
      { product_id: wantedProductId, buyer_id: user.id, seller_id: wanted.seller_id },
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
      sender_id: user.id,
      content: msgParts.join("\n"),
    });
  }

  revalidatePath("/swaps");
  return { success: true, swapId: swapOffer.id };
}

export async function respondToSwap(swapId: string, action: "accepted" | "declined") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not logged in" };

  const { data: offer } = await supabase
    .from("swap_offers")
    .select("id, seller_id, buyer_id, wanted_product_id, offered_product_id, status")
    .eq("id", swapId)
    .single();

  if (!offer) return { error: "Swap offer not found" };
  if (offer.seller_id !== user.id) return { error: "Only the seller can respond to this offer" };
  if (offer.status !== "pending") return { error: "This offer is no longer pending" };

  const admin = createAdminClient();
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

  revalidatePath("/swaps");
  revalidatePath(`/product/${offer.wanted_product_id}`);
  revalidatePath(`/product/${offer.offered_product_id}`);
  return { success: true };
}

export async function cancelSwap(swapId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not logged in" };

  const { data: offer } = await supabase
    .from("swap_offers")
    .select("id, buyer_id, status, wanted_product_id, offered_product_id")
    .eq("id", swapId)
    .single();

  if (!offer) return { error: "Swap offer not found" };
  if (offer.buyer_id !== user.id) return { error: "Only the buyer can cancel this offer" };
  if (offer.status !== "pending") return { error: "This offer can no longer be cancelled" };

  const admin = createAdminClient();
  await admin
    .from("swap_offers")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", swapId);

  revalidatePath("/swaps");
  return { success: true };
}
