"use server";

import { createClient } from "@/lib/supabase/server";
import { disputeOrder as disputeOrderShared } from "@/lib/orders";

export async function disputeOrder(orderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not logged in" };

  return disputeOrderShared(orderId, user.id);
}
