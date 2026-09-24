import type { MetadataRoute } from "next";
import { absoluteUrl, APP_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private or signed-in-only areas. Paths are written without a trailing
        // slash so they match both /login and /login/... — the previous
        // "/login/" form matched neither.
        disallow: [
          "/admin",
          "/api",
          "/orders",
          "/messages",
          "/swaps",
          "/listings",
          "/profile",
          "/account",
          "/kyc",
          "/notifications",
          "/support",
          "/sell",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/unsubscribe",
          "/auth",
          // Internal search results: infinite crawl space, no unique content.
          "/catalog?*q=",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: APP_URL,
  };
}
