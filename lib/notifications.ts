import { createAdminClient } from "@/lib/supabase/admin";

export async function notify(
  userId: string,
  type: string,
  title: string,
  body?: string,
  relatedId?: string,
) {
  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert({
      user_id: userId,
      type,
      title,
      body: body ?? null,
      related_id: relatedId ?? null,
    });
  } catch (err) {
    console.error("[notify] Failed to create notification:", err);
  }
}
