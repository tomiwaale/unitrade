import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BookOpen, Laptop, Sofa, Shirt, Package, ShieldCheck, ArrowRight, Zap, Lock, MessageSquare, Tag, ArrowUpRight } from "lucide-react";

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
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("products")
      .select("id, title, price, images, category")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(2),
  ]);

  const featuredItem  = featured?.[0] ?? null;
  const secondItem    = featured?.[1] ?? null;
  const activeCount   = (listingCount ?? 0).toLocaleString();

  return (
    <div className="ut-app">
      {/* Landing header */}
      <header className="ut-nav">
        <div className="ut-nav-inner">
          <Link href="/" className="ut-logo">
            <span className="ut-logo-mark">u</span>
            <span>CampSwap</span>
          </Link>
          <div style={{ flex: 1 }} />
          <div className="ut-nav-actions">
            <Link href="/catalog" className="ut-cta ut-cta-ghost" style={{ fontSize: 13, padding: "8px 14px" }}>
              Browse
            </Link>
            <Link href="/login" className="ut-cta ut-cta-ghost" style={{ fontSize: 13, padding: "8px 14px" }}>
              Sign in
            </Link>
            <Link href="/register" className="ut-cta ut-cta-primary" style={{ fontSize: 13, padding: "8px 14px" }}>
              Join free
            </Link>
          </div>
        </div>
      </header>

      <main className="ut-main">
        {/* ── Hero ── */}
        <section className="ut-hero">
          <div className="ut-hero-main">
            <div>
              <span className="ut-hero-eyebrow">Live · Campus Marketplace</span>
              <h1 className="ut-hero-title">
                Buy, sell, or <em>swap</em> with students next door.
              </h1>
            </div>
            <div className="ut-hero-meta">
              <span><b>{activeCount}</b> active listings</span>
              <span><b>₦0</b> listing fees</span>
              <span><b>Escrow</b> protected</span>
            </div>
            <div className="ut-hero-cta-row">
              <Link href="/sell" className="ut-cta">
                <Zap size={14} /> Post a listing
              </Link>
              <Link href="/catalog" className="ut-cta ut-cta-ghost">
                <ArrowRight size={14} /> Browse listings
              </Link>
            </div>
          </div>

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

        {/* ── How it works ── */}
        <div className="ut-section-head">
          <div>
            <span className="ut-sub">Simple &amp; safe</span>
            <h2>How CampSwap works</h2>
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

        {/* ── Bottom CTA ── */}
        <div style={{
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
            <Link href="/catalog" className="ut-cta ut-cta-ghost" style={{ color: "white", borderColor: "rgba(255,255,255,0.3)" }}>
              Browse first
            </Link>
          </div>
        </div>

        <div className="ut-ticker">
          <span>CampSwap</span>
          <span>Campus-only marketplace</span>
          <span><b>Escrow</b> protected</span>
          <span><b>NIN</b> verified sellers</span>
          <span>Powered by <b>Paystack</b></span>
        </div>
      </main>
    </div>
  );
}
