import { createClient } from "@/lib/supabase/server";

// Server Actions are directly callable endpoints, so admin-only actions can't
// rely on the /admin layout redirect alone — each one re-checks the flag.
export async function requireAdmin(): Promise<{ id: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return profile?.is_admin ? { id: user.id } : null;
}
