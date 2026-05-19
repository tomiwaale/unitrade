"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleWishlist(productId: string): Promise<{ liked?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not logged in" };

  const { data: existing } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .single();

  if (existing) {
    await supabase.from("wishlists").delete().eq("id", existing.id);
    revalidatePath("/catalog");
    return { liked: false };
  }

  await supabase.from("wishlists").insert({ user_id: user.id, product_id: productId });
  revalidatePath("/catalog");
  return { liked: true };
}
