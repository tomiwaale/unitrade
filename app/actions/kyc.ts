"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitSchoolId(schoolIdUrl: string) {
  if (!schoolIdUrl || !schoolIdUrl.startsWith("http")) {
    return { error: "Invalid school ID URL" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in" };
  }

  const { data: profile } = await supabase
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

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      school_id_url: schoolIdUrl,
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
