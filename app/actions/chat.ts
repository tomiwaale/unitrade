"use server";

import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { describeMessageError } from "@/lib/safety";
import { redirect } from "next/navigation";

export async function openConversation(
  productId: string,
  sellerId: string,
  initialMessage?: string,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (user.id === sellerId) {
    return { error: "You cannot message yourself." };
  }

  // Upsert — one conversation per buyer per product
  const { data, error } = await supabase
    .from("conversations")
    .upsert(
      { product_id: productId, buyer_id: user.id, seller_id: sellerId },
      { onConflict: "product_id,buyer_id", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  let convId: string | null = null;

  if (!error && data) {
    convId = data.id;
    // Send initial message for new conversations (e.g. swap proposals)
    if (initialMessage) {
      await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: user.id,
        content: initialMessage,
      });
    }
  } else {
    // Conversation already exists — fetch it
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("product_id", productId)
      .eq("buyer_id", user.id)
      .single();
    if (existing) convId = existing.id;
  }

  if (!convId) {
    // The conversations INSERT policy (031_user_safety.sql) refuses a pair
    // where either side has blocked the other, and the SELECT policy hides
    // the existing row from the blocker, so both lookups above come back
    // empty. Saying so plainly beats a generic failure.
    const { data: blocked } = await supabase
      .from("blocked_users")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", sellerId)
      .maybeSingle();

    if (blocked) {
      return { error: "You've blocked this seller. Unblock them to start a conversation." };
    }

    return { error: "Could not open conversation." };
  }
  redirect(`/messages/${convId}`);
}

export async function sendMessage(conversationId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed) return { error: "Message cannot be empty." };
  if (trimmed.length > 2000) return { error: "Message must be under 2000 characters." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  if (!rateLimit(`msg:${user.id}`, 30, 60_000)) {
    return { error: "Sending too fast. Slow down a little." };
  }

  // Verify the user is actually a participant — don't rely solely on RLS
  const { data: conv } = await supabase
    .from("conversations")
    .select("buyer_id, seller_id")
    .eq("id", conversationId)
    .single();

  if (!conv || (user.id !== conv.buyer_id && user.id !== conv.seller_id)) {
    return { error: "You are not a participant in this conversation." };
  }

  // Notification creation is handled by the on_message_created DB trigger
  // (016_mobile_support.sql) so it fires regardless of which client — web
  // or mobile — inserted the message.
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: trimmed,
  });

  if (error) {
    // The moderation filter and a block both surface here as an opaque
    // Postgres error — translate before this reaches the user.
    return { error: describeMessageError(error) ?? "Failed to send message." };
  }

  return { success: true };
}
