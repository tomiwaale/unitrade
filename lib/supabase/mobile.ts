import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./admin";

// The web authenticates API routes via cookies (lib/supabase/server.ts).
// The Flutter app has no cookie jar — it sends its Supabase access token as
// a Bearer header instead. These two helpers are the mobile-route
// equivalent: one validates the token and returns the user, the other
// builds a client that presents that token so RLS and SECURITY DEFINER
// functions relying on auth.uid() (e.g. reserve_product_for_checkout) see
// the right caller, exactly as they would for a cookie-authenticated web
// request.

export async function getMobileUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();

  if (!token) return { error: "Missing authorization token" as const };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.getUser(token);

  if (error || !data.user) return { error: "Invalid or expired session" as const };

  return { user: data.user, token };
}

export function createUserScopedClient(token: string) {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
}
