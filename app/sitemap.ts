import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl =
    process.env.APP_URL?.startsWith("http")
      ? process.env.APP_URL
      : "https://campswap.app";
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, updated_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(5000);

  const productUrls: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `${appUrl}/product/${p.id}`,
    lastModified: new Date(p.updated_at ?? Date.now()),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [
    { url: appUrl,                    lastModified: new Date(), changeFrequency: "daily",  priority: 1.0 },
    { url: `${appUrl}/catalog`,       lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${appUrl}/terms`,         lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${appUrl}/privacy`,       lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    ...productUrls,
  ];
}
