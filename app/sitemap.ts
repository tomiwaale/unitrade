import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/server";
import { productSlug } from "@/lib/product-slug";
import { sitemapUrl } from "@/lib/seo";

export const revalidate = 3600;

// The sitemap protocol caps a single file at 50,000 URLs. Staying under it in
// one file keeps the sitemap at /sitemap.xml — the URL robots.txt advertises
// and the one Search Console expects. Splitting via generateSitemaps() would
// move it to /sitemap/0.xml and leave /sitemap.xml returning a 404.
const MAX_PRODUCT_URLS = 45_000;

const ITEM_CATEGORIES = ["textbooks", "electronics", "furniture", "clothing", "other"];
const SERVICE_CATEGORIES = ["tutoring", "tech-help", "design", "photography", "delivery", "food"];

function staticPages(now: Date): MetadataRoute.Sitemap {
  return [
    { url: sitemapUrl("/"),            lastModified: now, changeFrequency: "daily",  priority: 1.0 },
    { url: sitemapUrl("/catalog"),    lastModified: now, changeFrequency: "hourly", priority: 0.9 },

    // High-intent landing pages
    { url: sitemapUrl("/deals"),      lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: sitemapUrl("/tutors"),     lastModified: now, changeFrequency: "daily",  priority: 0.9 },

    { url: sitemapUrl("/catalog?type=services"), lastModified: now, changeFrequency: "daily", priority: 0.85 },
    ...ITEM_CATEGORIES.map((cat) => ({
      url: sitemapUrl(`/catalog?category=${cat}`),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.85,
    })),
    ...SERVICE_CATEGORIES.map((cat) => ({
      url: sitemapUrl(`/catalog?type=services&category=${cat}`),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),

    { url: sitemapUrl("/terms"),   lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: sitemapUrl("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Anon client, not the service-role one: this is exactly the view a crawler
  // gets, so the sitemap cannot advertise URLs that Googlebot is then unable to
  // fetch. Once 031_user_safety.sql is applied, that also means suspended
  // sellers' listings drop out of the sitemap for free, via the products
  // SELECT policy — the service-role client would bypass it.
  const supabase = createPublicClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, title, updated_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(MAX_PRODUCT_URLS);

  const productUrls: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: sitemapUrl(`/product/${productSlug(p.title, p.id)}`),
    lastModified: new Date(p.updated_at ?? now),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticPages(now), ...productUrls];
}
