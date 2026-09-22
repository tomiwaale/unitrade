import { createAdminClient } from "@/lib/supabase/admin";
import { payoutSchema, type PayoutInput } from "@/lib/validations/auth";
import { resolveAccount, createTransferRecipient, createSubaccount } from "@/lib/paystack";

export type SavePayoutResult =
  | { success: true; accountName: string; bankName: string }
  | { error: string };

// Shared by app/actions/payout.ts:savePayout and POST /api/mobile/payout/save —
// needs the Paystack secret key for account resolution + subaccount creation.
export async function savePayoutDetails(input: PayoutInput, userId: string): Promise<SavePayoutResult> {
  const result = payoutSchema.safeParse(input);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { bankCode, accountNumber, bankName } = result.data;

  let accountName: string;
  try {
    const resolved = await resolveAccount(accountNumber, bankCode);
    accountName = resolved.account_name;
  } catch (err: any) {
    return { error: `Bank verification failed: ${err.message}` };
  }

  // Kept for backward compat with existing pending orders.
  let recipientCode: string;
  try {
    recipientCode = await createTransferRecipient(accountName, accountNumber, bankCode);
  } catch (err: any) {
    return { error: `Failed to register payout account: ${err.message}` };
  }

  // Split payments: seller keeps 90%.
  let subaccountCode: string;
  try {
    subaccountCode = await createSubaccount(accountName, accountNumber, bankCode, 90);
  } catch (err: any) {
    return { error: `Failed to create subaccount: ${err.message}` };
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      recipient_code: recipientCode,
      subaccount_code: subaccountCode,
      account_name: accountName,
      account_number: accountNumber,
      bank_code: bankCode,
      bank_name: bankName,
    })
    .eq("id", userId);

  if (updateError) {
    console.error("[payout] update error:", updateError);
    return { error: "Failed to save payout details. Please try again." };
  }

  return { success: true, accountName, bankName };
}
