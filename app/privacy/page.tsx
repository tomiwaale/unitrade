import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · KolejSwap",
  description: "How KolejSwap collects, uses, and protects your personal information.",
};

const EFFECTIVE_DATE = "20 May 2025";

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} style={{ marginBottom: 40 }}>
    <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--ut-ink)", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
      {title}
    </h2>
    <div style={{ fontSize: 14.5, color: "var(--ut-ink-soft)", lineHeight: 1.75 }}>
      {children}
    </div>
  </section>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ margin: "0 0 12px" }}>{children}</p>
);

const Ul = ({ items }: { items: string[] }) => (
  <ul style={{ margin: "0 0 12px", paddingLeft: 20 }}>
    {items.map((item, i) => <li key={i} style={{ marginBottom: 6 }}>{item}</li>)}
  </ul>
);

export default function PrivacyPage() {
  return (
    <div className="ut-app">
      <header className="ut-nav">
        <div className="ut-nav-inner">
          <Link href="/" className="ut-logo">
            <span className="ut-logo-mark">u</span>
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

      <main className="ut-main" style={{ maxWidth: 760, paddingTop: 40, paddingBottom: 80 }}>
        {/* Page header */}
        <div style={{ marginBottom: 40 }}>
          <span style={{
            fontFamily: "var(--ut-font-mono)", fontSize: 11, textTransform: "uppercase",
            letterSpacing: "0.12em", color: "var(--ut-ink-mute)", display: "block", marginBottom: 10,
          }}>
            Legal · Privacy
          </span>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--ut-ink)", margin: "0 0 12px", letterSpacing: "-0.03em" }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: 14, color: "var(--ut-ink-mute)", margin: 0 }}>
            Effective date: {EFFECTIVE_DATE} &nbsp;·&nbsp; Applies to all KolejSwap users
          </p>
        </div>

        {/* Quick summary banner */}
        <div style={{
          background: "var(--ut-primary-tint)", border: "1px solid #B6DEC8",
          borderRadius: "var(--ut-radius)", padding: "16px 20px", marginBottom: 40,
          fontSize: 14, color: "var(--ut-primary-ink)", lineHeight: 1.6,
        }}>
          <b>Plain-English summary:</b> We collect only what we need to run a safe campus marketplace.
          We don&apos;t sell your data. We share it only with the payment and infrastructure providers
          that power KolejSwap. You can request deletion of your account at any time.
        </div>

        {/* Table of contents */}
        <div style={{
          background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
          borderRadius: "var(--ut-radius)", padding: "20px 24px", marginBottom: 48,
        }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, fontFamily: "var(--ut-font-mono)", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ut-ink-mute)" }}>
            Contents
          </p>
          {[
            ["#who-we-are", "1. Who We Are"],
            ["#data-we-collect", "2. Data We Collect"],
            ["#how-we-use-data", "3. How We Use Your Data"],
            ["#third-parties", "4. Third-Party Services"],
            ["#data-retention", "5. Data Retention"],
            ["#your-rights", "6. Your Rights (NDPR)"],
            ["#cookies", "7. Cookies & Tracking"],
            ["#children", "8. Children's Privacy"],
            ["#changes", "9. Changes to This Policy"],
            ["#contact", "10. Contact Us"],
          ].map(([href, label]) => (
            <div key={href} style={{ marginBottom: 4 }}>
              <a href={href} style={{ fontSize: 14, color: "var(--ut-primary)", textDecoration: "none", fontWeight: 500 }}>
                {label}
              </a>
            </div>
          ))}
        </div>

        {/* Sections */}
        <Section id="who-we-are" title="1. Who We Are">
          <P>
            KolejSwap is a peer-to-peer campus marketplace that allows Nigerian university students
            to buy, sell, and swap goods and services within their campus communities. References to
            &quot;KolejSwap&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot; in this policy refer to the platform operator.
          </P>
          <P>
            This Privacy Policy explains how we collect, use, disclose, and safeguard your personal
            information when you use our website and services. By creating an account or using KolejSwap,
            you agree to the practices described here.
          </P>
        </Section>

        <Section id="data-we-collect" title="2. Data We Collect">
          <P><b>Information you provide directly:</b></P>
          <Ul items={[
            "Full name and email address (used for your account and communications)",
            "National Identification Number (NIN) — collected for identity verification only",
            "University name and academic status",
            "Bank account details (account number and bank name) — used to receive Paystack payouts",
            "Profile photo (optional)",
            "Listing content: titles, descriptions, prices, and product images",
            "Messages sent through our in-app chat",
          ]} />

          <P><b>Information collected automatically:</b></P>
          <Ul items={[
            "IP address and approximate location (city-level, for fraud prevention)",
            "Device type, browser, and operating system",
            "Pages visited and actions taken on the platform (e.g., items viewed, searches)",
            "Session timestamps and referral sources",
          ]} />

          <P><b>We do not collect:</b></P>
          <Ul items={[
            "Your BVN (Bank Verification Number)",
            "Full card numbers or CVV codes — all payment data goes directly to Paystack",
            "Precise GPS location",
          ]} />
        </Section>

        <Section id="how-we-use-data" title="3. How We Use Your Data">
          <P>We use your information solely to provide and improve KolejSwap:</P>
          <Ul items={[
            "Create and manage your account",
            "Verify your identity and student status via NIN",
            "Process payments and escrow transactions through Paystack",
            "Display your listings to other users",
            "Facilitate buyer-seller communication via our chat system",
            "Detect and prevent fraud, scams, and policy violations",
            "Send transactional emails (order updates, dispute notices, payment confirmations)",
            "Comply with applicable Nigerian law",
          ]} />
          <P>
            We do <b>not</b> use your data for advertising profiling, sell it to third parties,
            or share it for any purpose outside of running KolejSwap.
          </P>
        </Section>

        <Section id="third-parties" title="4. Third-Party Services">
          <P>We rely on the following trusted providers. Each has its own privacy policy:</P>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "0 0 12px" }}>
            {[
              {
                name: "Paystack",
                role: "Payment processing, escrow, and seller payouts. Your bank details are shared with Paystack to initiate transfers.",
                url: "https://paystack.com/privacy",
              },
              {
                name: "Supabase",
                role: "Database and authentication infrastructure. Your account data is stored on Supabase-managed servers.",
                url: "https://supabase.com/privacy",
              },
              {
                name: "Vercel",
                role: "Web hosting and CDN. Serves the KolejSwap website globally.",
                url: "https://vercel.com/legal/privacy-policy",
              },
            ].map(({ name, role }) => (
              <div key={name} style={{
                background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
                borderRadius: "var(--ut-radius-sm)", padding: "14px 16px",
              }}>
                <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: "var(--ut-ink)" }}>{name}</p>
                <p style={{ margin: 0, fontSize: 13.5, color: "var(--ut-ink-soft)" }}>{role}</p>
              </div>
            ))}
          </div>
          <P>
            We do not share your data with any other third parties, including advertisers,
            analytics companies, or data brokers.
          </P>
        </Section>

        <Section id="data-retention" title="5. Data Retention">
          <P>
            We retain your personal data for as long as your account is active or as needed to
            provide our services. Specifically:
          </P>
          <Ul items={[
            "Active account data is retained indefinitely while your account is open",
            "After account deletion, we remove your profile, listings, and messages within 30 days",
            "NIN verification records are deleted within 14 days of verification completion",
            "Transaction records (orders, escrow history) are retained for 7 years to comply with Nigerian financial regulations",
            "Chat messages are deleted 90 days after the associated order is closed",
          ]} />
        </Section>

        <Section id="your-rights" title="6. Your Rights (NDPR)">
          <P>
            Under the Nigeria Data Protection Regulation (NDPR) 2019 and the Nigeria Data
            Protection Act 2023, you have the following rights:
          </P>
          <Ul items={[
            "Right to access: request a copy of the personal data we hold about you",
            "Right to rectification: correct inaccurate or incomplete data",
            "Right to erasure: request deletion of your data (subject to legal retention requirements)",
            "Right to restriction: ask us to limit how we process your data",
            "Right to data portability: receive your data in a machine-readable format",
            "Right to object: object to processing based on our legitimate interests",
          ]} />
          <P>
            To exercise any of these rights, email us at{" "}
            <a href="mailto:privacy@kolejswap.com" style={{ color: "var(--ut-primary)" }}>privacy@kolejswap.com</a>.
            We will respond within 30 days.
          </P>
        </Section>

        <Section id="cookies" title="7. Cookies & Tracking">
          <P>
            KolejSwap uses essential cookies only — specifically session cookies required for
            authentication and security. We do not use advertising cookies, third-party tracking
            pixels, or analytics services that fingerprint individual users.
          </P>
          <P>
            You can disable cookies in your browser settings, but doing so will prevent you
            from logging in to your account.
          </P>
        </Section>

        <Section id="children" title="8. Children's Privacy">
          <P>
            KolejSwap is intended for university students aged 18 and above. We do not knowingly
            collect personal information from anyone under 18. If we become aware that a minor has
            created an account, we will delete the account and associated data promptly.
          </P>
        </Section>

        <Section id="changes" title="9. Changes to This Policy">
          <P>
            We may update this Privacy Policy from time to time. When we make material changes,
            we will notify you by email and display a notice on the platform at least 14 days
            before the change takes effect. Continued use of KolejSwap after the effective date
            constitutes acceptance of the updated policy.
          </P>
        </Section>

        <Section id="contact" title="10. Contact Us">
          <P>If you have questions, concerns, or requests related to your privacy, contact us:</P>
          <div style={{
            background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
            borderRadius: "var(--ut-radius-sm)", padding: "16px 20px", fontSize: 14,
          }}>
            <p style={{ margin: "0 0 4px" }}><b>KolejSwap Data Privacy</b></p>
            <p style={{ margin: "0 0 4px", color: "var(--ut-ink-soft)" }}>
              Email:{" "}
              <a href="mailto:privacy@kolejswap.com" style={{ color: "var(--ut-primary)" }}>
                privacy@kolejswap.com
              </a>
            </p>
            <p style={{ margin: 0, color: "var(--ut-ink-soft)" }}>Response time: within 30 days</p>
          </div>
        </Section>

        {/* Footer nav */}
        <div style={{
          borderTop: "1px solid var(--ut-line)", paddingTop: 32, marginTop: 16,
          display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13, color: "var(--ut-ink-mute)",
        }}>
          <Link href="/" style={{ color: "var(--ut-ink-mute)", textDecoration: "none" }}>← Home</Link>
          <Link href="/terms" style={{ color: "var(--ut-primary)", textDecoration: "none" }}>Terms of Use</Link>
          <span>© {new Date().getFullYear()} KolejSwap</span>
        </div>
      </main>
    </div>
  );
}
