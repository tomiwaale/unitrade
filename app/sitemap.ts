import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 50_000; // Sitemap protocol max per file

const STATIC_PAGES = (appUrl: string): MetadataRoute.Sitemap => [
  { url: appUrl,                            lastModified: new Date(), changeFrequency: "daily",  priority: 1.0 },
  { url: `${appUrl}/catalog`,               lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
  { url: `${appUrl}/catalog?type=services`, lastModified: new Date(), changeFrequency: "daily",  priority: 0.85 },
  ...["textbooks", "electronics", "furniture", "clothing", "other"].map((cat) => ({
    url: `${appUrl}/catalog?category=${cat}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.85,
  })),
  { url: `${appUrl}/terms`,   lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
  { url: `${appUrl}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
];

function getAppUrl() {
  return process.env.APP_URL?.startsWith("http")
    ? process.env.APP_URL
    : "https://kolejswap.com";
}

export async function generateSitemaps() {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  const productPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  return Array.from({ length: productPages }, (_, i) => ({ id: i }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const appUrl = getAppUrl();
  const supabase = createAdminClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, updated_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(id * PAGE_SIZE, (id + 1) * PAGE_SIZE - 1);

  const productUrls: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `${appUrl}/product/${p.id}`,
    lastModified: new Date(p.updated_at ?? Date.now()),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // Static pages only go in the first sitemap segment
  return [
    ...(id === 0 ? STATIC_PAGES(appUrl) : []),
    ...productUrls,
  ];
}
