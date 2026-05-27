"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notify } from "@/lib/notifications";

export async function submitReview(orderId: string, rating: number, comment: string) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Rating must be between 1 and 5" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in" };

  const { data: order } = await supabase
    .from("orders")
    .select("buyer_id, status, products(seller_id, id)")
    .eq("id", orderId)
    .single();

  if (!order) return { error: "Order not found" };
  if (order.buyer_id !== user.id) return { error: "Only the buyer can leave a review" };
  if (order.status !== "confirmed") return { error: "Order must be completed before reviewing" };

  const sellerId = (order.products as any)?.seller_id;
  const productId = (order.products as any)?.id;
  if (!sellerId) return { error: "Seller not found" };

  const trimmed = comment.trim().slice(0, 500);

  const { error } = await supabase.from("reviews").insert({
    order_id: orderId,
    reviewer_id: user.id,
    seller_id: sellerId,
    product_id: productId,
    rating,
    comment: trimmed || null,
  });

  if (error?.code === "23505") return { error: "You've already reviewed this order" };
  if (error) {
    console.error("[review] insert error:", error);
    return { error: "Failed to submit review. Please try again." };
  }

  void notify(
    sellerId,
    "review",
    `You received a ${rating}-star review`,
    trimmed || undefined,
    orderId,
  );

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/product/[id]", "page");
  return { success: true };
}
