"use server";

import { createClient } from "@/lib/supabase/server";
import { payoutSchema, type PayoutInput } from "@/lib/validations/auth";
import { resolveAccount, createTransferRecipient, createSubaccount, fetchBanks } from "@/lib/paystack";
import { revalidatePath } from "next/cache";

export async function getBanks() {
  try {
    return await fetchBanks();
  } catch {
    return [];
  }
}

export async function savePayout(input: PayoutInput) {
  const result = payoutSchema.safeParse(input);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { bankCode, accountNumber, bankName } = result.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in" };

  // Verify bank account is real
  let accountName: string;
  try {
    const resolved = await resolveAccount(accountNumber, bankCode);
    accountName = resolved.account_name;
  } catch (err: any) {
    return { error: `Bank verification failed: ${err.message}` };
  }

  // Create Paystack transfer recipient (kept for backward compat with existing pending orders)
  let recipientCode: string;
  try {
    recipientCode = await createTransferRecipient(accountName, accountNumber, bankCode);
  } catch (err: any) {
    return { error: `Failed to register payout account: ${err.message}` };
  }

  // Create Paystack subaccount for split payments (seller keeps 90%)
  let subaccountCode: string;
  try {
    subaccountCode = await createSubaccount(accountName, accountNumber, bankCode, 90);
  } catch (err: any) {
    return { error: `Failed to create subaccount: ${err.message}` };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      recipient_code: recipientCode,
      subaccount_code: subaccountCode,
      account_name: accountName,
      account_number: accountNumber,
      bank_code: bankCode,
      bank_name: bankName,
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("[payout] update error:", updateError);
    return { error: "Failed to save payout details. Please try again." };
  }

  revalidatePath("/profile");
  revalidatePath("/sell");
  return { success: true, accountName, bankName };
}
