import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except:
     *  - Next internals and static image requests
     *  - SEO / metadata routes. These are hit by crawlers with no session, and
     *    running a Supabase auth round-trip on each one only slows the crawl
     *    down (and risks a redirect landing on a file Google is fetching).
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|robots.txt|sitemap.xml|opengraph-image|twitter-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|xml|txt|webmanifest)$).*)",
  ],
};
