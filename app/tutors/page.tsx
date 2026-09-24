import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ShieldCheck, Wallet, MessageSquare } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/server";
import { JsonLd } from "@/components/seo/json-ld";
import { ListingGrid, type GridListing } from "@/components/seo/listing-grid";
import {
  LandingHeader, LandingFooter, Breadcrumbs, SectionHead, FaqList, LinkCloud,
} from "@/components/seo/landing-shell";
import { APP_URL, absoluteUrl, breadcrumbLd, faqLd, itemListLd, DEFAULT_OG_IMAGES, type Faq } from "@/lib/seo";
import { productSlug } from "@/lib/product-slug";

export const revalidate = 1800;

const PATH = "/tutors";

export const metadata: Metadata = {
  title: "Private Tutors for Nigerian University Students — Hire on Your Campus",
  description:
    "Find affordable private tutors at Nigerian universities. Hire verified student tutors for Maths, Physics, Chemistry, Accounting, Statistics, Programming and project work at UNILAG, UI, OAU, ABU, FUTA, UNIBEN and 50+ campuses. Pay safely with escrow.",
  keywords: [
    "private tutor Nigeria", "student tutor Nigeria", "university tutor Nigeria",
    "hire a private tutor Nigeria", "affordable tutor Nigerian university",
    "home lesson teacher Nigeria", "maths tutor Nigeria university",
    "physics tutor Nigeria student", "chemistry tutor Nigeria campus",
    "accounting tutor Nigeria", "statistics tutor Nigeria university",
    "programming tutor Nigeria student", "project supervisor help Nigeria",
    "tutor UNILAG", "tutor UI Ibadan", "tutor OAU", "tutor ABU Zaria",
    "tutor FUTA", "tutor UNIBEN", "campus tutor near me Nigeria",
    "cheap tutor Nigerian student", "one on one tutorial Nigeria university",
  ],
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: {
    title: "Private Tutors at Nigerian Universities | KolejSwap",
    description:
      "Hire verified student tutors on your campus — Maths, Physics, Chemistry, Accounting, Programming and project help. Affordable rates, escrow-protected payment.",
    url: absoluteUrl(PATH),
    type: "website",
    images: DEFAULT_OG_IMAGES,
  },
};

const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Accounting", "Economics",
  "Statistics", "Programming", "Engineering", "Pharmacology", "Anatomy", "Law",
  "French", "Project & Thesis help", "GST / Use of English", "JAMB & Post-UTME",
];

const CAMPUSES = [
  "University of Lagos (UNILAG)",
  "University of Ibadan (UI)",
  "Obafemi Awolowo University (OAU)",
  "Ahmadu Bello University (ABU)",
  "University of Benin (UNIBEN)",
  "University of Nigeria, Nsukka (UNN)",
  "University of Ilorin (UNILORIN)",
  "Federal University of Technology, Akure (FUTA)",
  "University of Port Harcourt (UNIPORT)",
  "Lagos State University (LASU)",
  "Nnamdi Azikiwe University (UNIZIK)",
  "Covenant University",
];

const HOW_IT_WORKS = [
  {
    icon: <BookOpen size={18} />,
    title: "Find a tutor who takes your course",
    desc: "Every tutor here is a student on a Nigerian campus, so they have sat the same courses, with the same lecturers, often in the same semester.",
  },
  {
    icon: <MessageSquare size={18} />,
    title: "Message before you pay",
    desc: "Agree the subject, the number of sessions and whether you are meeting on campus or online. Chat is built in — you never have to hand over your phone number first.",
  },
  {
    icon: <Wallet size={18} />,
    title: "Pay into escrow",
    desc: "Your money is held by Paystack, not by the tutor. It is only released after you confirm the session actually happened.",
  },
  {
    icon: <ShieldCheck size={18} />,
    title: "Confirm and review",
    desc: "Release payment when you are satisfied, then leave a review so the next student knows what to expect.",
  },
];

function buildFaqs(count: number, cheapest: number | null, median: number | null): Faq[] {
  const priceAnswer =
    cheapest !== null && median !== null
      ? `Tutors set their own rates on KolejSwap. Across the tutoring listings live right now, rates start at ₦${cheapest.toLocaleString()} and the middle of the range sits around ₦${median.toLocaleString()} per session or package, depending on the subject and how many sessions you book. Because you are hiring a fellow student rather than an agency, rates are usually well below what a commercial lesson centre charges.`
      : "Tutors set their own rates on KolejSwap, and because you are hiring a fellow student rather than a commercial lesson centre, rates are usually far lower. Browse the listings above to see current prices for your subject.";

  return [
    {
      q: "How much does a private tutor cost in Nigeria?",
      a: priceAnswer,
    },
    {
      q: "Are the tutors on KolejSwap verified?",
      a: "Yes. Every seller on KolejSwap, tutors included, verifies their identity with their NIN and their university before they can list anything. You can see which campus a tutor is on before you book.",
    },
    {
      q: "Can I get a tutor on my own campus?",
      a: "That is the point of the platform. You can filter tutors by university, so you can find someone at UNILAG, UI, OAU, ABU, FUTA, UNIBEN, UNIPORT, UNN or any of the 50+ Nigerian campuses on KolejSwap and meet for lessons in person.",
    },
    {
      q: "What subjects can I find tutors for?",
      a: "Tutors here cover Mathematics, Physics, Chemistry, Biology, Accounting, Economics, Statistics, Programming, Engineering, medical and pharmacy courses, Law, languages, GST and Use of English, plus JAMB and Post-UTME preparation and final-year project or thesis support.",
    },
    {
      q: "Is it safe to pay a tutor upfront?",
      a: "You never pay the tutor directly. Payment goes into escrow held by Paystack and is released to the tutor only after you confirm the session took place. If something goes wrong, you can open a dispute before releasing the funds.",
    },
    {
      q: "Can tutors teach online instead of meeting in person?",
      a: "Many do. Message the tutor through KolejSwap before booking and agree whether sessions are on campus, at a hostel, or online over video — the listing price covers whichever arrangement you settle on.",
    },
    {
      q: "I want to tutor other students. How do I start?",
      a: `Create a free account, verify your identity, then post a tutoring service from the sell page. Listing is free — KolejSwap only takes a cut when you actually get paid. There are ${count > 0 ? `${count} tutoring listings` : "tutoring listings"} on the platform to benchmark your rate against.`,
    },
  ];
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

export default async function TutorsPage() {
  const supabase = createPublicClient();

  const { data } = await supabase
    .from("products")
    .select("id, title, price, images, category, location, listing_type")
    .eq("status", "active")
    .eq("listing_type", "service")
    .eq("category", "tutoring")
    .order("created_at", { ascending: false })
    .limit(48);

  const tutors = (data ?? []) as GridListing[];
  const prices = tutors.map((t) => Number(t.price)).filter((p) => p > 0);
  const cheapest = prices.length ? Math.min(...prices) : null;
  const typical = median(prices);

  const faqs = buildFaqs(tutors.length, cheapest, typical);

  const trail = [
    { name: "Home", path: "/" },
    { name: "Services", path: "/catalog?type=services" },
    { name: "Private tutors", path: PATH },
  ];

  const ld = [
    breadcrumbLd(trail),
    faqLd(faqs),
    itemListLd({
      name: "Private tutors at Nigerian universities",
      path: PATH,
      description:
        "Verified student tutors offering paid lessons at Nigerian universities, listed on KolejSwap.",
      items: tutors.map((t) => ({
        id: t.id,
        title: t.title,
        price: t.price,
        images: t.images,
        url: `/product/${productSlug(t.title, t.id)}`,
      })),
    }),
    {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: "Private tutoring",
      name: "Private tutoring for Nigerian university students",
      description:
        "One-to-one and small-group tutoring offered by verified students at Nigerian universities, booked and paid for through KolejSwap escrow.",
      provider: { "@type": "Organization", name: "KolejSwap", url: APP_URL },
      areaServed: { "@type": "Country", name: "Nigeria" },
      audience: { "@type": "EducationalAudience", educationalRole: "student" },
      ...(cheapest !== null
        ? {
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "NGN",
              lowPrice: cheapest.toFixed(2),
              ...(prices.length ? { highPrice: Math.max(...prices).toFixed(2) } : {}),
              offerCount: tutors.length,
            },
          }
        : {}),
    },
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
            Campus services · Tutoring
          </span>
          <h1 style={{
            fontFamily: "var(--ut-font-display)", fontSize: "clamp(30px, 4.4vw, 46px)",
            fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.08,
            color: "var(--ut-ink)", margin: "0 0 16px",
          }}>
            Private tutors at Nigerian universities
          </h1>
          <p style={{ fontSize: 16.5, lineHeight: 1.65, color: "var(--ut-ink-soft)", margin: "0 0 12px" }}>
            Hire a private tutor who is already on your campus. Every tutor on KolejSwap is a
            NIN-verified student at a Nigerian university — someone who has sat the course you are
            struggling with, under the same lecturers, recently enough to remember it.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ut-ink-mute)", margin: "0 0 20px" }}>
            Browse tutors for Mathematics, Physics, Chemistry, Accounting, Statistics, Programming,
            medical courses and final-year project work at UNILAG, UI, OAU, ABU, FUTA, UNIBEN,
            UNIPORT, UNN and 50+ other campuses. You pay into escrow, and the tutor is only paid
            once you confirm the session happened.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/catalog?type=services&category=tutoring" className="ut-cta ut-cta-primary">
              Browse all tutors
            </Link>
            <Link href="/sell" className="ut-cta ut-cta-ghost">
              Offer tutoring
            </Link>
          </div>
        </section>

        {/* ── Subjects ── */}
        <SectionHead eyebrow="By subject" title="Find a tutor for your course" />
        <LinkCloud
          links={SUBJECTS.map((subject) => ({
            label: subject,
            href: `/catalog?type=services&category=tutoring&q=${encodeURIComponent(subject)}`,
          }))}
        />

        {/* ── Live listings ── */}
        <SectionHead
          eyebrow={tutors.length > 0 ? `${tutors.length} tutor${tutors.length === 1 ? "" : "s"} available` : "Available now"}
          title="Tutors taking students right now"
        />
        <ListingGrid
          items={tutors}
          priceUnit="/ rate"
          emptyMessage="No tutors are listed at this moment. New tutoring listings go up every week — check the services catalogue, or post your own tutoring listing if you want to be the first."
        />

        {/* ── How it works ── */}
        <SectionHead eyebrow="How it works" title="Booking a tutor on KolejSwap" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.title} style={{
              border: "1px solid var(--ut-line)", borderRadius: "var(--ut-radius)",
              padding: "18px 18px 20px", background: "var(--ut-bg-card)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ color: "var(--ut-primary-ink)" }}>{step.icon}</span>
                <span style={{
                  fontFamily: "var(--ut-font-mono)", fontSize: 11,
                  color: "var(--ut-ink-mute)", letterSpacing: "0.1em",
                }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 style={{ fontSize: 15.5, fontWeight: 600, color: "var(--ut-ink)", margin: "0 0 6px", letterSpacing: "-0.01em" }}>
                {step.title}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ut-ink-mute)", margin: 0 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        {/* ── Campuses ── */}
        <SectionHead eyebrow="By campus" title="Tutors on your university" />
        <LinkCloud
          links={CAMPUSES.map((campus) => ({
            label: campus.replace(/\s*\(([^)]+)\)/, " · $1"),
            href: `/catalog?type=services&category=tutoring&university=${encodeURIComponent(campus)}`,
          }))}
        />

        {/* ── FAQ ── */}
        <SectionHead eyebrow="Questions" title="Private tutoring in Nigeria — FAQ" />
        <div style={{ maxWidth: 780 }}>
          <FaqList faqs={faqs} />
        </div>

        {/* ── Related ── */}
        <SectionHead eyebrow="Also on KolejSwap" title="Other things students hire and buy" />
        <LinkCloud
          links={[
            { label: "Cheapest listings on campus", href: "/deals" },
            { label: "Tech help & laptop repair", href: "/catalog?type=services&category=tech-help" },
            { label: "Graphic design", href: "/catalog?type=services&category=design" },
            { label: "Campus photography", href: "/catalog?type=services&category=photography" },
            { label: "Second-hand textbooks", href: "/catalog?category=textbooks" },
            { label: "Cheap laptops & phones", href: "/catalog?category=electronics" },
            { label: "Hostel furniture", href: "/catalog?category=furniture" },
            { label: "All campus services", href: "/catalog?type=services" },
          ]}
        />

        <LandingFooter />
      </main>
    </div>
  );
}
