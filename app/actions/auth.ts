"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, type LoginInput, type RegisterInput } from "@/lib/validations/auth";
import { rateLimit } from "@/lib/rate-limit";
import { registerUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

export async function login(input: LoginInput) {
  const ip = await getIp();
  if (!rateLimit(`login:${ip}`, 10, 60_000)) {
    return { error: "Too many login attempts. Please wait a minute." };
  }

  const result = loginSchema.safeParse(input);
  if (!result.success) {
    return { error: "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/catalog");
}

export async function register(input: RegisterInput) {
  const ip = await getIp();
  const result = await registerUser(input, ip);

  if ("error" in result) {
    return result;
  }

  revalidatePath("/", "layout");
  redirect("/catalog");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function requestPasswordReset(email: string) {
  const parsed = loginSchema.shape.email.safeParse(email);
  if (!parsed.success) {
    return { error: "Enter a valid email address" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
