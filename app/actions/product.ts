"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const VALID_CATEGORIES = [
  // Current form categories
  "textbooks", "electronics", "fashion", "hostel", "services", "other",
  // Legacy (backward compat with existing listings)
  "furniture", "clothing",
  "tutoring", "tech-help", "design", "photography", "delivery", "food", "services-other",
] as const;

const productSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.coerce.number().positive("Price must be greater than 0"),
  imageUrls: z.array(z.string().url()).max(6).default([]),
  category: z.enum(VALID_CATEGORIES, { message: "Please select a category" }),
  condition: z.enum(["new", "like-new", "good", "fair", "poor"]).optional(),
  open_to: z.enum(["cash-only", "cash-or-swap", "swap-only"]).default("cash-only"),
  location: z.string().min(2, "Location is required"),
});

function parseImages(formData: FormData): string[] {
  return formData.getAll("imageUrl").map(String).filter(Boolean);
}

export async function createProduct(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nin_verified")
    .eq("id", user.id)
    .single();

  if (!profile?.nin_verified) {
    return { error: "NIN verification required before listing items. Please complete KYC at /kyc." };
  }

  const input = {
    title: formData.get("title"),
    description: formData.get("description"),
    price: formData.get("price"),
    imageUrls: parseImages(formData),
    category: formData.get("category"),
    condition: formData.get("condition") || undefined,
    open_to: formData.get("open_to") || "cash-only",
    location: formData.get("location"),
  };

  const result = productSchema.safeParse(input);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { title, description, price, imageUrls, category, condition, open_to, location } = result.data;
  const listing_type = category === "services" ? "service" : "item";

  const { error } = await supabase.from("products").insert({
    seller_id: user.id,
    title,
    description,
    price,
    images: imageUrls,
    category,
    condition,
    open_to,
    location,
    listing_type,
    status: "active",
  });

  if (error) {
    console.error(error);
    return { error: "Failed to create listing" };
  }

  revalidatePath("/catalog");
  redirect("/listings");
}

export async function updateProduct(productId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in" };

  const input = {
    title: formData.get("title"),
    description: formData.get("description"),
    price: formData.get("price"),
    imageUrls: parseImages(formData),
    category: formData.get("category"),
    condition: formData.get("condition") || undefined,
    open_to: formData.get("open_to") || "cash-only",
    location: formData.get("location"),
  };

  const result = productSchema.safeParse(input);
  if (!result.success) return { error: result.error.issues[0].message };

  const { title, description, price, imageUrls, category, condition, open_to, location } = result.data;
  const listing_type = category === "services" ? "service" : "item";

  const { error } = await supabase
    .from("products")
    .update({
      title,
      description,
      price,
      images: imageUrls,
      category,
      condition,
      open_to,
      location,
      listing_type,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("seller_id", user.id);

  if (error) return { error: "Failed to update listing" };

  revalidatePath("/listings");
  revalidatePath("/catalog");
  redirect("/listings");
}

export async function deleteProduct(productId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in" };

  const { data: product } = await supabase
    .from("products")
    .select("seller_id")
    .eq("id", productId)
    .single();

  if (!product || product.seller_id !== user.id) return { error: "Not found" };

  const { data: activeOrders } = await supabase
    .from("orders")
    .select("id")
    .eq("product_id", productId)
    .in("status", ["paid", "disputed"]);

  if (activeOrders?.length) {
    return { error: "Can't delete — this item has an active order in escrow" };
  }

  await supabase.from("products").delete().eq("id", productId);

  revalidatePath("/listings");
  revalidatePath("/catalog");
  return { success: true };
}
