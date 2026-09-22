"use server";

import { createClient } from "@/lib/supabase/server";
import { confirmOrderReceived as confirmOrderReceivedShared } from "@/lib/orders";

export async function confirmOrderReceived(orderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not logged in" };

  return confirmOrderReceivedShared(orderId, user.id);
}
