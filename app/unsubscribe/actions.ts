"use server";

import { applyUnsubscribe, applyResubscribe, verifyUnsubscribeToken } from "@/lib/unsubscribe";

export async function confirmUnsubscribe(token: string) {
  const email = verifyUnsubscribeToken(token);
  if (!email) return { error: "This unsubscribe link is invalid or has expired." };

  try {
    await applyUnsubscribe(email);
  } catch (err) {
    console.error("[unsubscribe] failed:", err);
    return { error: "Something went wrong. Please try again." };
  }

  return { success: true, email };
}

export async function undoUnsubscribe(token: string) {
  const email = verifyUnsubscribeToken(token);
  if (!email) return { error: "This link is invalid or has expired." };

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data: userId } = await admin.rpc("user_id_for_email", { p_email: email });
    await applyResubscribe(email, userId ?? null);
  } catch (err) {
    console.error("[unsubscribe] undo failed:", err);
    return { error: "Something went wrong. Please try again." };
  }

  return { success: true };
}
