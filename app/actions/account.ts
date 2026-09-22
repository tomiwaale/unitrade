"use server";

import { createClient } from "@/lib/supabase/server";
import { deleteUserAccount } from "@/lib/account";

export async function deleteAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not logged in" };

  const result = await deleteUserAccount(user.id);
  if ("error" in result) return result;

  await supabase.auth.signOut();
  return { success: true } as const;
}
