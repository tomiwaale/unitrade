import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const appUrl =
    process.env.APP_URL?.startsWith("http")
      ? process.env.APP_URL
      : "https://campswap.app";
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/catalog", "/product/"],
      disallow: [
        "/admin/", "/api/", "/orders/", "/messages/",
        "/swaps/", "/listings/", "/profile/", "/kyc/",
        "/sell/", "/login/", "/register/",
      ],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
