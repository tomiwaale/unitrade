"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { submitReview as submitReviewShared } from "@/lib/reviews";

export async function submitReview(orderId: string, rating: number, comment: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in" };

  const result = await submitReviewShared(orderId, rating, comment, user.id);

  if ("success" in result) {
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/product/[id]", "page");
  }

  return result;
}
