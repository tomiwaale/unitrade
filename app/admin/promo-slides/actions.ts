"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROMO_ICON_KEYS } from "./icons";

function readSlideFields(formData: FormData) {
  const title       = (formData.get("title") as string) ?? "";
  const subtitle    = (formData.get("subtitle") as string) ?? "";
  const icon        = (formData.get("icon") as string) || "megaphone";
  const color_start = (formData.get("color_start") as string) || "#0F8A4F";
  const color_end   = (formData.get("color_end") as string) || "#073B22";
  const route       = ((formData.get("route") as string) || "").trim() || null;
  const image_url   = ((formData.get("image_url") as string) || "").trim() || null;

  return {
    title,
    subtitle,
    icon: PROMO_ICON_KEYS.includes(icon as any) ? icon : "megaphone",
    color_start,
    color_end,
    route,
    image_url,
  };
}

export async function addPromoSlide(formData: FormData) {
  const admin = createAdminClient();
  const fields = readSlideFields(formData);

  if (!fields.title.trim()) return { error: "Title is required" };

  // Place new slide at the end
  const { data: last } = await admin
    .from("promo_slides")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sort_order = (last?.sort_order ?? -1) + 1;

  const { error } = await admin.from("promo_slides").insert({
    ...fields, sort_order, active: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/promo-slides");
}

export async function updatePromoSlide(id: string, formData: FormData) {
  const admin = createAdminClient();
  const fields = readSlideFields(formData);

  if (!fields.title.trim()) return { error: "Title is required" };

  const { error } = await admin
    .from("promo_slides")
    .update(fields)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/promo-slides");
}

export async function deletePromoSlide(id: string) {
  const admin = createAdminClient();
  await admin.from("promo_slides").delete().eq("id", id);
  revalidatePath("/admin/promo-slides");
}

export async function togglePromoSlide(id: string, active: boolean) {
  const admin = createAdminClient();
  await admin.from("promo_slides").update({ active }).eq("id", id);
  revalidatePath("/admin/promo-slides");
}

export async function movePromoSlide(id: string, direction: "up" | "down") {
  const admin = createAdminClient();

  const { data: all } = await admin
    .from("promo_slides")
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
    admin.from("promo_slides").update({ sort_order: b.sort_order }).eq("id", a.id),
    admin.from("promo_slides").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);

  revalidatePath("/admin/promo-slides");
}
