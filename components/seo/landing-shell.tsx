import Link from "next/link";
import { LogoMark } from "@/components/ui/logo-mark";
import type { Faq } from "@/lib/seo";

/** Public header used by the crawlable landing pages (no auth state, no cookies). */
export function LandingHeader() {
  return (
    <header className="ut-nav">
      <div className="ut-nav-inner">
        <Link href="/" className="ut-logo">
          <LogoMark />
          <span>KolejSwap</span>
        </Link>
        <div style={{ flex: 1 }} />
        <div className="ut-nav-actions">
          <Link href="/catalog" className="ut-cta ut-cta-ghost" style={{ fontSize: 13, padding: "8px 14px" }}>Browse</Link>
          <Link href="/login" className="ut-cta ut-cta-ghost" style={{ fontSize: 13, padding: "8px 14px" }}>Sign in</Link>
          <Link href="/register" className="ut-cta ut-cta-primary" style={{ fontSize: 13, padding: "8px 14px" }}>Join free</Link>
        </div>
      </div>
    </header>
  );
}

export function Breadcrumbs({ trail }: { trail: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" style={{ fontSize: 12.5, color: "var(--ut-ink-mute)", marginBottom: 18 }}>
      {trail.map((crumb, i) => (
        <span key={crumb.path}>
          {i > 0 && <span style={{ margin: "0 7px" }}>/</span>}
          {i === trail.length - 1 ? (
            <span aria-current="page">{crumb.name}</span>
          ) : (
            <Link href={crumb.path} style={{ color: "var(--ut-ink-mute)", textDecoration: "none" }}>
              {crumb.name}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

export function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="ut-section-head">
      <div>
        <span className="ut-sub">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
    </div>
  );
}

/**
 * Visible FAQ. The matching FAQPage JSON-LD is emitted by the page itself —
 * Google requires the answer text to be on the page, not only in the markup.
 */
export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      {faqs.map((faq) => (
        <details
          key={faq.q}
          style={{
            borderBottom: "1px solid var(--ut-line)",
            padding: "14px 0",
          }}
        >
          <summary style={{ fontSize: 15, fontWeight: 600, color: "var(--ut-ink)", cursor: "pointer", listStyle: "none" }}>
            {faq.q}
          </summary>
          <p style={{ margin: "10px 0 0", fontSize: 14.5, lineHeight: 1.7, color: "var(--ut-ink-soft)" }}>
            {faq.a}
          </p>
        </details>
      ))}
    </div>
  );
}

/** Keyword-bearing internal links — how Google finds the deeper category pages. */
export function LinkCloud({ links }: { links: { label: string; href: string }[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {links.map((link) => (
        <Link key={link.href + link.label} href={link.href} className="ut-chip">
          {link.label}
        </Link>
      ))}
    </div>
  );
}

export function LandingFooter() {
  return (
    <>
      <div className="ut-ticker">
        <span>KolejSwap</span>
        <span>Campus-only marketplace</span>
        <span><b>Escrow</b> protected</span>
        <span><b>NIN</b> verified sellers</span>
      </div>
      <div style={{
        display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap",
        padding: "20px 0 8px", fontSize: 12.5, color: "var(--ut-ink-mute)",
      }}>
        <Link href="/catalog" style={{ color: "var(--ut-ink-mute)", textDecoration: "none" }}>Browse listings</Link>
        <span>·</span>
        <Link href="/deals" style={{ color: "var(--ut-ink-mute)", textDecoration: "none" }}>Cheapest deals</Link>
        <span>·</span>
        <Link href="/tutors" style={{ color: "var(--ut-ink-mute)", textDecoration: "none" }}>Private tutors</Link>
        <span>·</span>
        <Link href="/privacy" style={{ color: "var(--ut-ink-mute)", textDecoration: "none" }}>Privacy Policy</Link>
        <span>·</span>
        <Link href="/terms" style={{ color: "var(--ut-ink-mute)", textDecoration: "none" }}>Terms of Use</Link>
      </div>
    </>
  );
}
