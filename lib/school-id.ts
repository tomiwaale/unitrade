import { createAdminClient } from "@/lib/supabase/admin";

const SCHOOL_ID_BUCKET = "school-ids";

export async function createSchoolIdSignedUrl(value: string | null | undefined) {
  if (!value) return null;

  // Backward compatibility for older rows that stored public URLs.
  if (/^https?:\/\//i.test(value)) return value;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(SCHOOL_ID_BUCKET)
    .createSignedUrl(value, 60 * 60);

  if (error) {
    console.error("[school-id] failed to create signed URL:", error);
    return null;
  }

  return data.signedUrl;
}
