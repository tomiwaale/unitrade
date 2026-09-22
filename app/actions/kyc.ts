"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSchoolIdSignedUrl } from "@/lib/school-id";
import { submitNINVerification } from "@/lib/kyc";
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

  const result = await submitNINVerification(nin, user.id);

  if ("success" in result) {
    revalidatePath("/kyc");
    revalidatePath("/sell");
  }

  return result;
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
