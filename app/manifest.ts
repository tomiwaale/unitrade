import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KolejSwap — Buy, Sell & Swap at Nigerian Universities",
    short_name: "KolejSwap",
    description:
      "Nigeria's student marketplace. Buy, sell and swap hostel items, textbooks, laptops and more with verified students on your campus.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F7F4EE",
    theme_color: "#0F8A4F",
    lang: "en-NG",
    categories: ["shopping", "education"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
