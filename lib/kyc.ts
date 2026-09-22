import { createAdminClient } from "@/lib/supabase/admin";
import { verifyNIN } from "@/lib/nin";
import { sendUserEmail, emailNinVerified } from "@/lib/email";

export type SubmitNinResult =
  | { success: true; firstName: string; lastName: string }
  | { error: string };

// Shared by app/actions/kyc.ts:submitNIN and POST /api/mobile/kyc/verify-nin —
// needs the Prembly secret key, so it can only run server-side.
export async function submitNINVerification(nin: string, userId: string): Promise<SubmitNinResult> {
  if (!/^\d{11}$/.test(nin)) {
    return { error: "NIN must be exactly 11 digits" };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("nin_verified, full_name, school_id_status")
    .eq("id", userId)
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
    .eq("id", userId);

  if (updateError) {
    console.error("[kyc] nin update error:", updateError);
    return { error: "Verification succeeded but failed to save. Please try again." };
  }

  // Fire-and-forget so a Resend hiccup can't fail a verification that succeeded.
  void (async () => {
    try {
      const { data: userAuth } = await admin.auth.admin.getUserById(userId);
      if (!userAuth.user?.email) return;

      const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.APP_URL ?? "";
      const { subject, html } = emailNinVerified({
        name: profile?.full_name ?? userAuth.user.user_metadata?.full_name ?? "there",
        ninLast4: nin.slice(-4),
        sellUrl: `${base}/sell`,
        // Selling needs both checks, so tell them what's still outstanding.
        schoolIdPending: profile?.school_id_status !== "approved",
        kycUrl: `${base}/kyc`,
      });
      await sendUserEmail(userAuth.user.email, subject, html);
    } catch (err) {
      console.error("[email] Failed to send NIN verification email:", err);
    }
  })();

  return { success: true, firstName: result.firstName, lastName: result.lastName };
}
