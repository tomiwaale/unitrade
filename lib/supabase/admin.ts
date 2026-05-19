import { createClient } from "@supabase/supabase-js";

// Service role client — bypasses RLS entirely.
// Only use in server-side code (Server Actions, API Routes, webhooks).
// NEVER expose this to the client.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
