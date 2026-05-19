"use server";

import { createClient } from "@/lib/supabase/server";
import { kycSchema, type KYCInput } from "@/lib/validations/auth";
import { verifyNIN } from "@/lib/nin";
import { revalidatePath } from "next/cache";

export async function submitNINVerification(input: KYCInput) {
  const result = kycSchema.safeParse(input);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in" };
  }

  const { nin } = result.data;

  // Check if profile exists at all
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nin_verified")
    .eq("id", user.id)
    .single();

  if (profile?.nin_verified) {
    return { error: "Your NIN is already verified" };
  }

  // Verify NIN with Prembly
  try {
    await verifyNIN(nin);
  } catch (err: any) {
    return { error: `NIN verification failed: ${err.message}` };
  }

  const ninPayload = {
    nin_last4: nin.slice(-4),
    nin_verified: true,
    nin_verified_at: new Date().toISOString(),
  };

  if (!profile) {
    // Profile was never created (registration completed auth but failed profile insert).
    // Create a minimal profile now so the user can proceed.
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      full_name: user.email?.split("@")[0] ?? "User",
      university: "Unknown",
      ...ninPayload,
    });

    if (insertError) {
      console.error("[kyc] profile insert error:", insertError);
      return { error: "Could not create profile. Please re-register." };
    }
  } else {
    const { error: updateError } = await supabase
      .from("profiles")
      .update(ninPayload)
      .eq("id", user.id);

    if (updateError) {
      console.error("[kyc] update error:", updateError);
      return { error: "Verified but failed to save status. Please try again." };
    }
  }

  revalidatePath("/sell");
  revalidatePath("/", "layout");
  return { success: true };
}
