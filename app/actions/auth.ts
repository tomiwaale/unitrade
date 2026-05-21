"use server";

import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@/lib/validations/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function login(input: LoginInput) {
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
  const result = registerSchema.safeParse(input);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { email, phone, password, fullName, university } = result.data;
  const supabase = await createClient();

  // 1. Enforce phone uniqueness before creating the auth user
  const { data: phoneExists } = await supabase
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
    school_id_status: "none",
  });

  if (profileError) {
    console.error(profileError);
    return { error: "Account created but failed to save profile. Please contact support." };
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
