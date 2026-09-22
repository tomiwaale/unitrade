"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { applyResubscribe, applyUnsubscribe } from "@/lib/unsubscribe";
import { z } from "zod";

const profileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(80),
  phone: z.string().regex(/^(\+234|0)[789]\d{9}$/, "Enter a valid Nigerian phone number"),
  university: z.string().min(2, "Please select your university"),
});

export async function updateProfile(input: unknown) {
  const result = profileSchema.safeParse(input);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { fullName, phone, university } = result.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not logged in" };

  // Check phone uniqueness (excluding current user)
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .neq("id", user.id)
    .maybeSingle();

  if (existing) return { error: "That phone number is already linked to another account" };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone, university })
    .eq("id", user.id);

  if (error) {
    console.error("[profile] update error:", error);
    return { error: "Failed to update profile. Please try again." };
  }

  revalidatePath("/profile");
  return { success: true };
}

// Marketing opt-in toggle. Writes both the profile flag and the suppression
// list so it stays consistent with the unsubscribe link in campaign emails.
export async function setMarketingOptIn(optIn: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) return { error: "Not logged in" };

  try {
    if (optIn) {
      await applyResubscribe(user.email, user.id);
    } else {
      await applyUnsubscribe(user.email);
    }
  } catch (err) {
    console.error("[profile] marketing opt-in error:", err);
    return { error: "Failed to update your email preferences. Please try again." };
  }

  revalidatePath("/profile");
  return { success: true };
}
