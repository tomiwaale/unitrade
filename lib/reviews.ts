import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications";

export type ReviewActionResult = { success: true } | { error: string };

// Shared by app/actions/review.ts and POST /api/mobile/orders/[id]/review.
export async function submitReview(
  orderId: string,
  rating: number,
  comment: string,
  userId: string,
): Promise<ReviewActionResult> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Rating must be between 1 and 5" };
  }

  const admin = createAdminClient();

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("buyer_id, status, products(seller_id, id)")
    .eq("id", orderId)
    .single();

  if (orderError || !order) return { error: "Order not found" };
  if (order.buyer_id !== userId) return { error: "Only the buyer can leave a review" };
  if (order.status !== "confirmed") return { error: "Order must be completed before reviewing" };

  const sellerId = (order.products as any)?.seller_id;
  const productId = (order.products as any)?.id;
  if (!sellerId) return { error: "Seller not found" };

  const trimmed = comment.trim().slice(0, 500);

  const { error } = await admin.from("reviews").insert({
    order_id: orderId,
    reviewer_id: userId,
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

  void notify(sellerId, "review", `You received a ${rating}-star review`, trimmed || undefined, orderId);

  return { success: true };
}
