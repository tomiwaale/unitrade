"use server";

import { createClient } from "@/lib/supabase/server";
import { initCheckout } from "@/lib/checkout";
import { redirect } from "next/navigation";

// `offerId` is passed when the buyer is checking out at a price they
// negotiated. It is a hint only — reserve_product_for_checkout resolves the
// offer itself, so omitting it still charges the agreed price.
export async function createCheckoutSession(productId: string, offerId?: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/product/" + productId);
  }

  const result = await initCheckout(supabase, productId, user.email!, offerId);

  if ("error" in result) {
    return result;
  }

  redirect(result.checkoutUrl);
}
