"use server";

import { createClient } from "@/lib/supabase/server";
import type { PayoutInput } from "@/lib/validations/auth";
import { fetchBanks } from "@/lib/paystack";
import { savePayoutDetails } from "@/lib/payout";
import { revalidatePath } from "next/cache";

export async function getBanks() {
  try {
    return await fetchBanks();
  } catch {
    return [];
  }
}

export async function savePayout(input: PayoutInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in" };

  const result = await savePayoutDetails(input, user.id);

  if ("success" in result) {
    revalidatePath("/profile");
    revalidatePath("/sell");
  }

  return result;
}
