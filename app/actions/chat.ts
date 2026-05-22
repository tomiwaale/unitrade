"use server";

import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { redirect } from "next/navigation";
import { notify } from "@/lib/notifications";

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

  if (!convId) return { error: "Could not open conversation." };
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
    .select("buyer_id, seller_id, products(title)")
    .eq("id", conversationId)
    .single();

  if (!conv || (user.id !== conv.buyer_id && user.id !== conv.seller_id)) {
    return { error: "You are not a participant in this conversation." };
  }

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: trimmed,
  });

  if (error) return { error: "Failed to send message." };

  const recipientId = user.id === conv.buyer_id ? conv.seller_id : conv.buyer_id;
  const productTitle = (conv as any).products?.title as string | undefined;
  void notify(
    recipientId,
    "message",
    "New message",
    productTitle ? `About "${productTitle}"` : undefined,
    conversationId,
  );

  return { success: true };
}
