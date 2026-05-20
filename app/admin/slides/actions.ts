"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function addSlide(formData: FormData) {
  const admin = createAdminClient();

  const title = (formData.get("title") as string) ?? "";
  const subtitle = (formData.get("subtitle") as string) ?? "";
  const image_url = formData.get("image_url") as string;
  const cta_label = (formData.get("cta_label") as string) || "Browse listings";
  const cta_href = (formData.get("cta_href") as string) || "/catalog";

  if (!image_url) return { error: "Image is required" };

  // Place new slide at the end
  const { data: last } = await admin
    .from("hero_slides")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sort_order = (last?.sort_order ?? -1) + 1;

  const { error } = await admin.from("hero_slides").insert({
    title, subtitle, image_url, cta_label, cta_href, sort_order, active: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/slides");
  revalidatePath("/");
}

export async function deleteSlide(id: string) {
  const admin = createAdminClient();
  await admin.from("hero_slides").delete().eq("id", id);
  revalidatePath("/admin/slides");
  revalidatePath("/");
}

export async function toggleSlide(id: string, active: boolean) {
  const admin = createAdminClient();
  await admin.from("hero_slides").update({ active }).eq("id", id);
  revalidatePath("/admin/slides");
  revalidatePath("/");
}

export async function updateSlide(id: string, formData: FormData) {
  const admin = createAdminClient();

  const title     = (formData.get("title")     as string) ?? "";
  const subtitle  = (formData.get("subtitle")  as string) ?? "";
  const cta_label = (formData.get("cta_label") as string) || "Browse listings";
  const cta_href  = (formData.get("cta_href")  as string) || "/catalog";

  const { error } = await admin
    .from("hero_slides")
    .update({ title, subtitle, cta_label, cta_href })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/slides");
  revalidatePath("/");
}

export async function updateSlideInterval(seconds: number) {
  const admin = createAdminClient();
  await admin
    .from("site_settings")
    .upsert({ key: "hero_slide_interval", value: String(seconds), updated_at: new Date().toISOString() });
  revalidatePath("/admin/slides");
  revalidatePath("/");
}

export async function moveSlide(id: string, direction: "up" | "down") {
  const admin = createAdminClient();

  const { data: all } = await admin
    .from("hero_slides")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });

  if (!all) return;

  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= all.length) return;

  const a = all[idx];
  const b = all[swapIdx];

  await Promise.all([
    admin.from("hero_slides").update({ sort_order: b.sort_order }).eq("id", a.id),
    admin.from("hero_slides").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);

  revalidatePath("/admin/slides");
  revalidatePath("/");
}
