import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { rateLimit } from "@/lib/rate-limit";
import { sendUserEmail, emailWelcome } from "@/lib/email";

export type RegisterResult = { error: string } | { success: true };

// Shared by the web register() server action and the /api/mobile/register
// route so both platforms enforce identical validation, rate limiting, and
// phone-uniqueness rules instead of drifting apart.
export async function registerUser(input: RegisterInput, ip: string): Promise<RegisterResult> {
  if (!rateLimit(`register:${ip}`, 3, 60 * 60_000)) {
    return { error: "Too many signup attempts. Please try again later." };
  }

  const result = registerSchema.safeParse(input);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { email, phone, password, fullName, university } = result.data;
  const supabase = await createClient();
  const admin = createAdminClient();

  // 1. Enforce phone uniqueness before creating the auth user
  const { data: phoneExists } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (phoneExists) {
    return { error: "An account with this phone number already exists" };
  }

  // 2. Create Supabase auth user (email uniqueness enforced by Supabase)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) {
    return { error: authError?.message || "Failed to create account" };
  }

  // 3. Insert profile
  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    full_name: fullName,
    university,
    phone,
  });

  if (profileError) {
    console.error(profileError);
    return { error: "Account created but failed to save profile. Please contact support." };
  }

  // Fire-and-forget: a slow or failing Resend call must never block signup.
  void (async () => {
    try {
      const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.APP_URL ?? "";
      const { subject, html } = emailWelcome({
        name: fullName,
        university,
        catalogUrl: `${base}/catalog`,
        kycUrl: `${base}/kyc`,
      });
      await sendUserEmail(email, subject, html);
    } catch (err) {
      console.error("[email] Failed to send welcome email:", err);
    }
  })();

  return { success: true };
}
