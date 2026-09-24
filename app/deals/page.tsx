import type { Metadata } from "next";
import Link from "next/link";
import { Tag, ShieldCheck, ArrowLeftRight, Bell } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/server";
import { JsonLd } from "@/components/seo/json-ld";
import { ListingGrid, type GridListing } from "@/components/seo/listing-grid";
import {
  LandingHeader, LandingFooter, Breadcrumbs, SectionHead, FaqList, LinkCloud,
} from "@/components/seo/landing-shell";
import { absoluteUrl, breadcrumbLd, faqLd, itemListLd, DEFAULT_OG_IMAGES, type Faq } from "@/lib/seo";
import { productHref, productSlug } from "@/lib/product-slug";

export const revalidate = 900;

const PATH = "/deals";

export const metadata: Metadata = {
  title: "Cheapest Student Deals in Nigeria — Items Under ₦5,000 on Campus",
  description:
    "The cheapest listings on KolejSwap, sorted by price. Find second-hand textbooks, laptops, phones, hostel furniture and clothing at student prices from verified students at UNILAG, UI, OAU, ABU, FUTA, UNIBEN and 50+ Nigerian universities. Escrow protected.",
  keywords: [
    "cheapest items Nigeria students", "cheap things to buy Nigeria campus",
    "affordable items Nigerian university", "buy cheap student items Nigeria",
    "items under 5000 naira Nigeria", "cheap stuff for students Nigeria",
    "second hand items cheap Nigeria", "best price student marketplace Nigeria",
    "cheap textbooks Nigeria", "cheap laptop Nigeria student",
    "cheap phone Nigeria student", "cheap hostel furniture Nigeria",
    "budget shopping Nigerian student", "discount student deals Nigeria",
    "lowest price campus Nigeria", "bargain items Nigerian university",
  ],
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: {
    title: "Cheapest Student Deals in Nigeria | KolejSwap",
    description:
      "Every listing on KolejSwap, cheapest first. Textbooks, laptops, phones, hostel furniture and clothing at student prices — escrow protected.",
    url: absoluteUrl(PATH),
    type: "website",
    images: DEFAULT_OG_IMAGES,
  },
};

const PRICE_BANDS = [
  { label: "Under ₦1,000", max: 1000 },
  { label: "Under ₦2,000", max: 2000 },
  { label: "Under ₦5,000", max: 5000 },
  { label: "Under ₦10,000", max: 10000 },
  { label: "Under ₦25,000", max: 25000 },
  { label: "Under ₦50,000", max: 50000 },
];

const CATEGORIES = [
  { value: "textbooks", label: "Textbooks", plural: "textbooks and course materials" },
  { value: "electronics", label: "Electronics", plural: "laptops, phones and gadgets" },
  { value: "furniture", label: "Furniture", plural: "hostel beds, shelves and room items" },
  { value: "clothing", label: "Clothing", plural: "clothes, shoes and accessories" },
  { value: "other", label: "Other", plural: "everything else students sell" },
];

const TIPS = [
  {
    icon: <Tag size={18} />,
    title: "Sort by price, not by date",
    desc: "The catalogue defaults to newest first. Switching to Price: Low–High, or using a price cap like Under ₦5,000, surfaces the genuinely cheap listings that would otherwise sit on page four.",
  },
  {
    icon: <ArrowLeftRight size={18} />,
    title: "Offer a swap instead of cash",
    desc: "Listings tagged Cash or Swap will take an item in trade. If you are graduating and clearing your room anyway, a swap costs you nothing you were keeping.",
  },
  {
    icon: <Bell size={18} />,
    title: "Shop at the end of a semester",
    desc: "Prices bottom out when final-year students clear hostels. Mattresses, fans, buckets and textbooks all get listed cheap in the same two-week window.",
  },
  {
    icon: <ShieldCheck size={18} />,
    title: "Cheap should still mean escrow",
    desc: "A low price is not a reason to pay outside the platform. Pay through KolejSwap and your money is held until you confirm you received the item — a seller who pushes you to transfer directly is the one risk a bargain is not worth.",
  },
];

function buildFaqs(cheapest: number | null, underFive: number, total: number): Faq[] {
  return [
    {
      q: "What is the cheapest thing I can buy on KolejSwap right now?",
      a: cheapest !== null
        ? `The lowest-priced active listing is currently ₦${cheapest.toLocaleString()}. Prices move daily as students list and sell, so the grid on this page is re-sorted by price several times an hour.`
        : "Prices move daily as students list and sell. This page sorts every active listing by price, cheapest first, so the top of the grid is always the lowest price on the platform right now.",
    },
    {
      q: "How many items are available under ₦5,000?",
      a: underFive > 0
        ? `There are ${underFive.toLocaleString()} active listings priced at ₦5,000 or below out of ${total.toLocaleString()} total. Most of them are textbooks, hostel odds and ends, and clothing.`
        : "Listings under ₦5,000 come and go quickly — they are usually textbooks, hostel odds and ends, and clothing. Use the Under ₦5,000 filter to see what is live at the moment.",
    },
    {
      q: "Why are things cheaper here than in the market?",
      a: "Because there is no middleman. You are buying directly from another student who is clearing their room or upgrading their laptop, not from a trader who bought the item to resell at a margin. There are also no listing fees, so sellers are not pricing a platform charge into what they ask.",
    },
    {
      q: "Is it safe to buy the cheapest listing?",
      a: "Yes, as long as you pay through KolejSwap. Every seller is NIN-verified and tied to a university, and your payment sits in Paystack-backed escrow until you confirm you have the item. If it never arrives, or it is not what was described, you open a dispute instead of releasing the money.",
    },
    {
      q: "Can I negotiate the price?",
      a: "On most listings, yes. You can send the seller a price offer, or message them first. Sellers who are clearing out before the end of a semester are usually the most flexible.",
    },
    {
      q: "Do I pay for delivery on top of the price?",
      a: "That is between you and the seller. Most campus trades are hand-to-hand — you meet somewhere public on campus, which costs nothing. Agree the arrangement in chat before you pay.",
    },
  ];
}

export default async function DealsPage() {
  const supabase = createPublicClient();

  const [cheapestRes, totalRes, underFiveRes, ...categoryRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, title, price, images, category, location, listing_type")
      .eq("status", "active")
      .eq("listing_type", "item")
      .gt("price", 0)
      .order("price", { ascending: true })
      .limit(48),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("listing_type", "item"),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("listing_type", "item")
      .lte("price", 5000),
    ...CATEGORIES.map((cat) =>
      supabase
        .from("products")
        .select("id, title, price")
        .eq("status", "active")
        .eq("listing_type", "item")
        .eq("category", cat.value)
        .gt("price", 0)
        .order("price", { ascending: true })
        .limit(1)
    ),
  ]);

  const items = (cheapestRes.data ?? []) as GridListing[];
  const total = totalRes.count ?? 0;
  const underFive = underFiveRes.count ?? 0;
  const cheapest = items.length ? Number(items[0].price) : null;

  const categoryFloors = CATEGORIES.map((cat, i) => {
    const row = categoryRes[i]?.data?.[0] as { id: string; title: string; price: number } | undefined;
    return { ...cat, floor: row ? Number(row.price) : null, example: row ?? null };
  });

  const faqs = buildFaqs(cheapest, underFive, total);

  const trail = [
    { name: "Home", path: "/" },
    { name: "Browse", path: "/catalog" },
    { name: "Cheapest deals", path: PATH },
  ];

  const ld = [
    breadcrumbLd(trail),
    faqLd(faqs),
    itemListLd({
      name: "Cheapest student listings in Nigeria",
      path: PATH,
      description:
        "Active KolejSwap listings sorted by price, lowest first — second-hand items from verified students at Nigerian universities.",
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        price: item.price,
        images: item.images,
        url: `/product/${productSlug(item.title, item.id)}`,
      })),
    }),
  ];

  return (
    <div className="ut-app">
      <JsonLd data={ld} />
      <LandingHeader />

      <main className="ut-main" style={{ paddingTop: 28 }}>
        <Breadcrumbs trail={trail} />

        {/* ── Hero ── */}
        <section style={{ maxWidth: 780, marginBottom: 32 }}>
          <span style={{
            fontFamily: "var(--ut-font-mono)", fontSize: 11, textTransform: "uppercase",
            letterSpacing: "0.12em", color: "var(--ut-ink-mute)", display: "block", marginBottom: 12,
          }}>
            Best prices · Updated hourly
          </span>
          <h1 style={{
            fontFamily: "var(--ut-font-display)", fontSize: "clamp(30px, 4.4vw, 46px)",
            fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.08,
            color: "var(--ut-ink)", margin: "0 0 16px",
          }}>
            The cheapest student listings in Nigeria
          </h1>
          <p style={{ fontSize: 16.5, lineHeight: 1.65, color: "var(--ut-ink-soft)", margin: "0 0 12px" }}>
            Every active listing on KolejSwap, sorted by price with the lowest first.
            {cheapest !== null && (
              <> Prices start at <b>₦{cheapest.toLocaleString()}</b>
                {underFive > 0 && <>, and {underFive.toLocaleString()} listings are ₦5,000 or below</>}.
              </>
            )}
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ut-ink-mute)", margin: "0 0 20px" }}>
            These are second-hand textbooks, laptops, phones, hostel furniture and clothing sold
            directly by NIN-verified students at UNILAG, UI, OAU, ABU, FUTA, UNIBEN, UNIPORT, UNN and
            50+ other Nigerian campuses. No trader margin, no listing fees — and payment is held in
            escrow until you confirm you have the item.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/catalog?sort=price-asc" className="ut-cta ut-cta-primary">
              Browse cheapest first
            </Link>
            <Link href="/catalog?max_price=5000" className="ut-cta ut-cta-ghost">
              Everything under ₦5,000
            </Link>
          </div>
        </section>

        {/* ── Price bands ── */}
        <SectionHead eyebrow="By budget" title="Shop to a price cap" />
        <LinkCloud
          links={PRICE_BANDS.map((band) => ({
            label: band.label,
            href: `/catalog?max_price=${band.max}&sort=price-asc`,
          }))}
        />

        {/* ── Live cheapest listings ── */}
        <SectionHead
          eyebrow={items.length > 0 ? `${items.length} lowest-priced listings` : "Lowest priced"}
          title="Cheapest on the platform right now"
        />
        <ListingGrid
          items={items}
          emptyMessage="No listings are active at this moment. New items go up daily — check the full catalogue, or list something yourself."
        />

        {/* ── Cheapest by category ── */}
        <SectionHead eyebrow="By category" title="Where prices start in each category" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
          {categoryFloors.map((cat) => (
            <Link
              key={cat.value}
              href={`/catalog?category=${cat.value}&sort=price-asc`}
              style={{
                border: "1px solid var(--ut-line)", borderRadius: "var(--ut-radius)",
                padding: "18px", background: "var(--ut-bg-card)", textDecoration: "none",
                display: "block",
              }}
            >
              <h3 style={{ fontSize: 15.5, fontWeight: 600, color: "var(--ut-ink)", margin: "0 0 6px", letterSpacing: "-0.01em" }}>
                Cheap {cat.label.toLowerCase()}
              </h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ut-ink-mute)", margin: "0 0 10px" }}>
                Second-hand {cat.plural} from students on your campus.
              </p>
              <span style={{
                fontFamily: "var(--ut-font-mono)", fontSize: 13, fontWeight: 700,
                color: "var(--ut-primary-ink)",
              }}>
                {cat.floor !== null ? `From ₦${cat.floor.toLocaleString()}` : "Browse listings →"}
              </span>
            </Link>
          ))}
        </div>

        {/* ── Featured cheapest per category, as text links Google can read ── */}
        {categoryFloors.some((c) => c.example) && (
          <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--ut-ink-mute)", marginTop: 18, maxWidth: 780 }}>
            Right now the lowest-priced listing in each category is{" "}
            {categoryFloors
              .filter((c) => c.example)
              .map((c, i, arr) => (
                <span key={c.value}>
                  <Link
                    href={productHref(c.example!.title, c.example!.id)}
                    style={{ color: "var(--ut-primary-ink)", textDecoration: "none", fontWeight: 500 }}
                  >
                    {c.example!.title}
                  </Link>{" "}
                  at ₦{Number(c.example!.price).toLocaleString()}
                  {i < arr.length - 2 ? ", " : i === arr.length - 2 ? " and " : "."}
                </span>
              ))}
          </p>
        )}

        {/* ── Tips ── */}
        <SectionHead eyebrow="Buying smart" title="How to get the lowest price on campus" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
          {TIPS.map((tip) => (
            <div key={tip.title} style={{
              border: "1px solid var(--ut-line)", borderRadius: "var(--ut-radius)",
              padding: "18px 18px 20px", background: "var(--ut-bg-card)",
            }}>
              <span style={{ color: "var(--ut-primary-ink)", display: "block", marginBottom: 10 }}>{tip.icon}</span>
              <h3 style={{ fontSize: 15.5, fontWeight: 600, color: "var(--ut-ink)", margin: "0 0 6px", letterSpacing: "-0.01em" }}>
                {tip.title}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ut-ink-mute)", margin: 0 }}>
                {tip.desc}
              </p>
            </div>
          ))}
        </div>

        {/* ── FAQ ── */}
        <SectionHead eyebrow="Questions" title="Cheap campus buying — FAQ" />
        <div style={{ maxWidth: 780 }}>
          <FaqList faqs={faqs} />
        </div>

        {/* ── Related ── */}
        <SectionHead eyebrow="Also on KolejSwap" title="Keep browsing" />
        <LinkCloud
          links={[
            { label: "Private tutors on campus", href: "/tutors" },
            { label: "Second-hand textbooks", href: "/catalog?category=textbooks" },
            { label: "Cheap laptops & phones", href: "/catalog?category=electronics" },
            { label: "Hostel furniture", href: "/catalog?category=furniture" },
            { label: "Campus fashion", href: "/catalog?category=clothing" },
            { label: "Swap instead of buying", href: "/catalog?open_to=cash-or-swap" },
            { label: "Posted today", href: "/catalog?today=1" },
            { label: "All campus services", href: "/catalog?type=services" },
          ]}
        />

        <LandingFooter />
      </main>
    </div>
  );
}
