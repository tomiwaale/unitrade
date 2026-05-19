"use server";

import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@/lib/validations/auth";
import { resolveAccount, createTransferRecipient } from "@/lib/paystack";
import { verifyNIN } from "@/lib/nin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const BANKS: Record<string, string> = {
  "044": "Access Bank",
  "058": "GTBank",
  "057": "Zenith Bank",
  "011": "First Bank",
  "033": "UBA",
  "232": "Sterling Bank",
  "070": "Fidelity Bank",
  "214": "FCMB",
  "221": "Stanbic IBTC",
  "032": "Union Bank",
  "035": "Wema Bank",
  "050": "Ecobank",
  "076": "Polaris Bank",
  "082": "Keystone Bank",
  "999992": "Opay",
  "090267": "Kuda Bank",
  "50515": "Moniepoint",
  "999991": "PalmPay",
  "301": "Jaiz Bank",
};

export async function login(input: LoginInput) {
  const result = loginSchema.safeParse(input);
  if (!result.success) {
    return { error: "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/catalog");
}

export async function register(input: RegisterInput) {
  const result = registerSchema.safeParse(input);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { email, password, fullName, university, bankCode, accountNumber, nin } = result.data;
  const bankName = BANKS[bankCode] ?? "Unknown Bank";

  // 1. Verify the bank account number is real
  let accountName: string;
  try {
    const resolved = await resolveAccount(accountNumber, bankCode);
    accountName = resolved.account_name;
  } catch (err: any) {
    return { error: `Bank verification failed: ${err.message}` };
  }

  // 2. Register bank as a Paystack transfer recipient (payout handle for this seller)
  let recipientCode: string;
  try {
    recipientCode = await createTransferRecipient(accountName, accountNumber, bankCode);
  } catch (err: any) {
    return { error: `Failed to register payout account: ${err.message}` };
  }

  // 3. Attempt NIN verification — soft gate: failure doesn't block account creation,
  //    but user won't be able to list items until verified via /kyc.
  let ninVerified = false;
  try {
    await verifyNIN(nin);
    ninVerified = true;
  } catch {
    // intentionally silent — user can complete KYC at /kyc after signing up
  }

  // 4. Create Supabase auth user
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) {
    return { error: authError?.message || "Failed to create account" };
  }

  // 5. Insert profile
  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    full_name: fullName,
    university,
    recipient_code: recipientCode,
    account_name: accountName,
    bank_code: bankCode,
    bank_name: bankName,
    nin_last4: nin.slice(-4),
    nin_verified: ninVerified,
    nin_verified_at: ninVerified ? new Date().toISOString() : null,
  });

  if (profileError) {
    console.error(profileError);
    return { error: "Account created but failed to save profile. Please contact support." };
  }

  revalidatePath("/", "layout");
  redirect("/catalog");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
