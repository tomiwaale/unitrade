"use server";

import { createClient } from "@/lib/supabase/server";
import { initCheckout } from "@/lib/checkout";
import { redirect } from "next/navigation";

export async function createCheckoutSession(productId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/product/" + productId);
  }

  const result = await initCheckout(supabase, productId, user.email!);

  if ("error" in result) {
    return result;
  }

  redirect(result.checkoutUrl);
}
