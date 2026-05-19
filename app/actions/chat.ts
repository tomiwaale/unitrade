"use server";

import { createClient } from "@/lib/supabase/server";
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

  if (!convId) return { error: "Could not open conversation." };
  redirect(`/messages/${convId}`);
}

export async function sendMessage(conversationId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed) return { error: "Message cannot be empty." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: trimmed,
  });

  if (error) return { error: "Failed to send message." };
  return { success: true };
}
