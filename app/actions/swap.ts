"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  proposeSwap as proposeSwapShared,
  respondToSwap as respondToSwapShared,
  cancelSwap as cancelSwapShared,
} from "@/lib/swap";

export async function proposeSwap(
  wantedProductId: string,
  offeredProductId: string,
  note?: string,
  cashTopup?: number,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const result = await proposeSwapShared(supabase, user.id, wantedProductId, offeredProductId, note, cashTopup);

  if (!("error" in result)) revalidatePath("/swaps");
  return result;
}

export async function respondToSwap(swapId: string, action: "accepted" | "declined") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not logged in" };

  const result = await respondToSwapShared(user.id, swapId, action);

  if (!("error" in result)) {
    revalidatePath("/swaps");
    revalidatePath("/product/[id]", "page");
  }
  return result;
}

export async function cancelSwap(swapId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not logged in" };

  const result = await cancelSwapShared(user.id, swapId);

  if (!("error" in result)) revalidatePath("/swaps");
  return result;
}
