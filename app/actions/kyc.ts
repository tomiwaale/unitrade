"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSchoolIdSignedUrl } from "@/lib/school-id";
import { verifyNIN } from "@/lib/nin";
import { revalidatePath } from "next/cache";

export async function getMyKycStatus() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in" };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("school_id_url, school_id_status, nin_verified, nin_last4")
    .eq("id", user.id)
    .single();

  return {
    status: profile?.school_id_status ?? "none",
    signedUrl: await createSchoolIdSignedUrl(profile?.school_id_url),
    ninVerified: profile?.nin_verified ?? false,
    ninLast4: profile?.nin_last4 ?? null,
  };
}

export async function submitNIN(nin: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "You must be logged in" };

  if (!/^\d{11}$/.test(nin)) {
    return { error: "NIN must be exactly 11 digits" };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("nin_verified")
    .eq("id", user.id)
    .single();

  if (profile?.nin_verified) {
    return { error: "Your NIN is already verified" };
  }

  let result;
  try {
    result = await verifyNIN(nin);
  } catch (err: any) {
    return { error: err.message ?? "NIN verification failed. Please check the number and try again." };
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      nin_verified: true,
      nin_last4: nin.slice(-4),
      nin_verified_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("[kyc] nin update error:", updateError);
    return { error: "Verification succeeded but failed to save. Please try again." };
  }

  revalidatePath("/kyc");
  revalidatePath("/sell");
  return { success: true, firstName: result.firstName, lastName: result.lastName };
}

export async function submitSchoolId(schoolIdPath: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in" };
  }

  if (!schoolIdPath || /^https?:\/\//i.test(schoolIdPath) || !schoolIdPath.startsWith(`${user.id}/`)) {
    return { error: "Invalid school ID upload" };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, school_id_status")
    .eq("id", user.id)
    .single();

  if (profile?.school_id_status === "approved") {
    return { error: "Your school ID is already approved" };
  }

  if (profile?.school_id_status === "pending") {
    return { error: "Your school ID is already under review" };
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      school_id_url: schoolIdPath,
      school_id_status: "pending",
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("[kyc] update error:", updateError);
    return { error: "Failed to submit. Please try again." };
  }

  revalidatePath("/sell");
  revalidatePath("/kyc");
  return { success: true };
}
