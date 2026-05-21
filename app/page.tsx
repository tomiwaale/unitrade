import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ShieldCheck, Lock, MessageSquare, ArrowUpRight, Package } from "lucide-react";
import HeroSlider from "@/components/hero-slider";
import { LandingNav } from "@/components/landing-nav";

export const metadata: Metadata = {
  title: "KolejSwap — Buy, Sell & Swap at Nigerian Universities",
  description:
    "Nigeria's student marketplace. Buy cheap hostel items, second-hand textbooks, laptops and electronics from verified students. Secure escrow payments. Free to join.",
  openGraph: {
    title: "KolejSwap — Buy, Sell & Swap at Nigerian Universities",
    description:
      "Buy hostel furniture, textbooks, electronics and more from students at UNILAG, UI, OAU, LASU, FUTA, UNIPORT and 50+ campuses across Nigeria.",
    type: "website",
  },
};

const categories = [
  { name: "Textbooks",   emoji: "📚", value: "textbooks"   },
  { name: "Electronics", emoji: "💻", value: "electronics" },
  { name: "Furniture",   emoji: "🛋️", value: "furniture"   },
  { name: "Clothing",    emoji: "👗", value: "clothing"    },
  { name: "Other",       emoji: "📦", value: "other"       },
];

export default async function Home() {
  const supabase = await createClient();

  // Fetch live stats
  const [
    { count: listingCount },
    { data: featured },
    { data: slides },
    { data: intervalSetting },
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("products")
      .select("id, title, price, images, category")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(2),
    supabase
      .from("hero_slides")
      .select("id, title, subtitle, image_url, cta_label, cta_href")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "hero_slide_interval")
      .single(),
  ]);

  const featuredItem    = featured?.[0] ?? null;
  const activeCount     = (listingCount ?? 0).toLocaleString();
  const heroSlides      = slides ?? [];
  const slideInterval   = Number(intervalSetting?.value ?? 10);

  return (
    <div className="ut-app">
      {/* Landing header */}
      <LandingNav />

      <main className="ut-main ut-landing-main">
        {/* ── Hero ── */}
        <section className="ut-hero">
          <HeroSlider slides={heroSlides} activeCount={activeCount} interval={slideInterval} />

          <div className="ut-hero-side">
            {/* Featured product card */}
            <div className="ut-hero-card">
              <div>
                <span className="ut-eye">Featured · On Campus Now</span>
                {featuredItem ? (
                  <>
                    <h3>{featuredItem.title}</h3>
                    <p>Just listed — be the first to grab it at this price.</p>
                  </>
                ) : (
                  <>
                    <h3>Textbooks, gadgets &amp; more</h3>
                    <p>Students are listing items right now. Find your next great deal.</p>
                  </>
                )}
              </div>
              <div className="ut-hero-card-foot">
                {featuredItem && (
                  <span style={{ fontFamily: "var(--ut-font-mono)", fontWeight: 700, fontSize: 17, color: "var(--ut-ink)" }}>
                    ₦{Number(featuredItem.price).toLocaleString()}
                  </span>
                )}
                <Link href={featuredItem ? `/product/${featuredItem.id}` : "/catalog"}>
                  View <ArrowUpRight size={12} style={{ display: "inline", verticalAlign: "middle" }} />
                </Link>
              </div>
            </div>

            {/* Escrow trust card */}
            <div className="ut-hero-card dark">
              <div>
                <span className="ut-eye" style={{ color: "var(--ut-accent)" }}>Escrow · Zero Risk</span>
                <h3>Trade safely with escrow protection</h3>
                <p>Funds are held until you confirm receipt — sellers get paid only when you're satisfied.</p>
              </div>
              <div className="ut-hero-card-foot">
                <span style={{ fontFamily: "var(--ut-font-mono)", fontSize: 12, opacity: 0.7 }}>
                  <Lock size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                  Paystack-backed
                </span>
                <Link href="/register">Join now →</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Categories ── */}
        <div className="ut-cat-row">
          {categories.map((cat) => (
            <Link key={cat.name} href={`/catalog?category=${cat.value}`} className="ut-cat">
              <span className="ut-cat-icon" style={{ fontSize: 20 }}>{cat.emoji}</span>
              <span className="ut-cat-text">
                <b>{cat.name}</b>
                <span>Browse →</span>
              </span>
            </Link>
          ))}
        </div>

        {/* ── Mobile trust bar ── */}
        <div className="ut-mobile-trust">
          <span className="ut-mobile-trust-item">
            <Lock size={11} /> Escrow protected
          </span>
          <span className="ut-mobile-trust-sep">·</span>
          <span className="ut-mobile-trust-item">
            <ShieldCheck size={11} /> Verified sellers
          </span>
          <span className="ut-mobile-trust-sep">·</span>
          <span className="ut-mobile-trust-item">Free to list</span>
        </div>

        {/* ── How it works ── */}
        <div className="ut-mobile-hide">
        <div className="ut-section-head">
          <div>
            <span className="ut-sub">Simple &amp; safe</span>
            <h2>How KolejSwap works</h2>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {[
            {
              step: "01", icon: <ShieldCheck size={20} />,
              title: "Verify your identity",
              desc: "Sign up with your NIN and university. Takes under 2 minutes — you're verified once, trade forever.",
            },
            {
              step: "02", icon: <Package size={20} />,
              title: "Post or browse",
              desc: "List items for free — textbooks, electronics, hostel essentials, services. Or browse what's near you.",
            },
            {
              step: "03", icon: <MessageSquare size={20} />,
              title: "Chat & agree",
              desc: "Message sellers directly. Negotiate price, arrange a campus meetup, confirm the deal.",
            },
            {
              step: "04", icon: <Lock size={20} />,
              title: "Pay with escrow",
              desc: "Funds are held safely. Inspect the item, then release — seller gets paid instantly via Paystack.",
            },
          ].map((item) => (
            <div key={item.step} style={{
              background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
              borderRadius: "var(--ut-radius)", padding: 20,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "var(--ut-primary-tint)", color: "var(--ut-primary-ink)",
                  display: "grid", placeItems: "center", flexShrink: 0,
                }}>
                  {item.icon}
                </span>
                <span style={{ fontFamily: "var(--ut-font-mono)", fontSize: 11, color: "var(--ut-ink-mute)", letterSpacing: "0.1em" }}>
                  STEP {item.step}
                </span>
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600 }}>{item.title}</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--ut-ink-soft)", lineHeight: 1.55 }}>{item.desc}</p>
            </div>
          ))}
        </div>
        </div>{/* end ut-mobile-hide: how it works */}

        {/* ── Universities ── */}
        <div style={{ marginTop: 48 }}>
          <div className="ut-section-head">
            <div>
              <span className="ut-sub">Nationwide</span>
              <h2>Built for every campus in Nigeria</h2>
            </div>
          </div>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--ut-ink-soft)", lineHeight: 1.6, maxWidth: 560 }}>
            Students from over 50 universities already use KolejSwap to buy and sell hostel items, textbooks,
            electronics, and services — safely, on campus, student-to-student.
          </p>
          <div className="ut-uni-pills">
            {[
              "UNILAG", "University of Ibadan", "OAU Ile-Ife",
              "LASU", "FUTA", "UNIPORT", "ABU Zaria",
              "Covenant University", "Babcock University", "UNIBEN",
              "UNILORIN", "UNIJOS", "BUK", "UNN",
              "Redeemer's University", "Pan-Atlantic University",
              "LASUSTECH", "MAPOLY", "YABATECH", "FUPRE",
            ].map((uni) => (
              <span
                key={uni}
                style={{
                  padding: "5px 12px", borderRadius: 999, fontSize: 12.5,
                  background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
                  color: "var(--ut-ink-soft)", fontWeight: 500,
                }}
              >
                {uni}
              </span>
            ))}
            <span style={{
              padding: "5px 12px", borderRadius: 999, fontSize: 12.5,
              background: "var(--ut-primary-tint)", border: "1px solid color-mix(in srgb, var(--ut-primary) 20%, transparent)",
              color: "var(--ut-primary-ink)", fontWeight: 500,
            }}>
              + many more
            </span>
          </div>

          {/* Popular search intents — semantic keywords for Google */}
          <div className="ut-search-intents">
            {[
              { label: "Cheap hostel furniture",    href: "/catalog?category=furniture",   emoji: "🛋️" },
              { label: "Second-hand textbooks",     href: "/catalog?category=textbooks",   emoji: "📚" },
              { label: "Used laptops & phones",     href: "/catalog?category=electronics", emoji: "💻" },
              { label: "Campus fashion & clothing", href: "/catalog?category=clothing",    emoji: "👗" },
              { label: "Student services & tutoring", href: "/catalog?type=services",      emoji: "⚡" },
              { label: "Everything else",           href: "/catalog?category=other",       emoji: "📦" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px", borderRadius: "var(--ut-radius)",
                  background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
                  textDecoration: "none", color: "var(--ut-ink)",
                  fontSize: 13.5, fontWeight: 500,
                  transition: "border-color 0.15s",
                }}
              >
                <span style={{ fontSize: 20 }}>{item.emoji}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div className="ut-bottom-cta" style={{
          marginTop: 48, borderRadius: "var(--ut-radius-lg)",
          background: "linear-gradient(135deg, var(--ut-primary) 0%, var(--ut-primary-ink) 100%)",
          padding: "40px 36px", color: "white",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 24, flexWrap: "wrap", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 90% 50%, rgba(255,90,31,0.3), transparent 50%)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <p style={{ margin: "0 0 4px", fontFamily: "var(--ut-font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.7 }}>
              Ready to start?
            </p>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em" }}>
              Join your campus marketplace today
            </h2>
          </div>
          <div style={{ display: "flex", gap: 10, position: "relative" }}>
            <Link href="/register" className="ut-cta" style={{ background: "white", color: "var(--ut-primary-ink)" }}>
              Create free account
            </Link>
            <Link href="/catalog" className="ut-cta ut-cta-ghost ut-mobile-cta-secondary" style={{ color: "white", borderColor: "rgba(255,255,255,0.3)" }}>
              Browse first
            </Link>
          </div>
        </div>

        <div className="ut-ticker">
          <span>KolejSwap</span>
          <span>Campus-only marketplace</span>
          <span><b>Escrow</b> protected</span>
          <span><b>NIN</b> verified sellers</span>
          <span>Powered by <b>Paystack</b></span>
        </div>

        {/* Footer links */}
        <div style={{
          display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap",
          padding: "20px 0 8px", fontSize: 12.5, color: "var(--ut-ink-mute)",
        }}>
          <Link href="/privacy" style={{ color: "var(--ut-ink-mute)", textDecoration: "none" }}>Privacy Policy</Link>
          <span>·</span>
          <Link href="/terms" style={{ color: "var(--ut-ink-mute)", textDecoration: "none" }}>Terms of Use</Link>
          <span>·</span>
          <span>© {new Date().getFullYear()} KolejSwap</span>
        </div>
      </main>
    </div>
  );
}
