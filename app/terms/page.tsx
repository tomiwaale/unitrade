import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use · CampSwap",
  description: "The rules and agreements that govern your use of CampSwap.",
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

const Ul = ({ items }: { items: React.ReactNode[] }) => (
  <ul style={{ margin: "0 0 12px", paddingLeft: 20 }}>
    {items.map((item, i) => <li key={i} style={{ marginBottom: 6 }}>{item}</li>)}
  </ul>
);

export default function TermsPage() {
  return (
    <div className="ut-app">
      <header className="ut-nav">
        <div className="ut-nav-inner">
          <Link href="/" className="ut-logo">
            <span className="ut-logo-mark">u</span>
            <span>CampSwap</span>
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
            Legal · Terms
          </span>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--ut-ink)", margin: "0 0 12px", letterSpacing: "-0.03em" }}>
            Terms of Use
          </h1>
          <p style={{ fontSize: 14, color: "var(--ut-ink-mute)", margin: 0 }}>
            Effective date: {EFFECTIVE_DATE} &nbsp;·&nbsp; Read carefully before using CampSwap
          </p>
        </div>

        {/* Quick summary banner */}
        <div style={{
          background: "var(--ut-primary-tint)", border: "1px solid #B6DEC8",
          borderRadius: "var(--ut-radius)", padding: "16px 20px", marginBottom: 40,
          fontSize: 14, color: "var(--ut-primary-ink)", lineHeight: 1.6,
        }}>
          <b>Plain-English summary:</b> CampSwap is for verified Nigerian university students only.
          Be honest in your listings, trade fairly, and use our escrow system for all payments.
          Fraud, prohibited items, or abuse will result in permanent account suspension.
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
            ["#acceptance", "1. Acceptance of Terms"],
            ["#eligibility", "2. Eligibility"],
            ["#account", "3. Your Account"],
            ["#listings", "4. Listings & Transactions"],
            ["#prohibited", "5. Prohibited Items & Conduct"],
            ["#escrow", "6. Escrow & Payments"],
            ["#disputes", "7. Disputes"],
            ["#fees", "8. Fees"],
            ["#intellectual-property", "9. Intellectual Property"],
            ["#liability", "10. Limitation of Liability"],
            ["#termination", "11. Termination"],
            ["#governing-law", "12. Governing Law"],
            ["#contact", "13. Contact Us"],
          ].map(([href, label]) => (
            <div key={href} style={{ marginBottom: 4 }}>
              <a href={href} style={{ fontSize: 14, color: "var(--ut-primary)", textDecoration: "none", fontWeight: 500 }}>
                {label}
              </a>
            </div>
          ))}
        </div>

        {/* Sections */}
        <Section id="acceptance" title="1. Acceptance of Terms">
          <P>
            By registering for or using CampSwap (&quot;the Platform&quot;), you agree to be bound by
            these Terms of Use (&quot;Terms&quot;) and our{" "}
            <Link href="/privacy" style={{ color: "var(--ut-primary)" }}>Privacy Policy</Link>.
            If you do not agree to these Terms, you may not use the Platform.
          </P>
          <P>
            These Terms constitute a legally binding agreement between you and CampSwap.
            We reserve the right to update these Terms at any time. Continued use of the Platform
            after any change constitutes acceptance of the updated Terms.
          </P>
        </Section>

        <Section id="eligibility" title="2. Eligibility">
          <P>To use CampSwap, you must:</P>
          <Ul items={[
            "Be at least 18 years of age",
            "Be a current or recently graduated student of a recognised Nigerian university or polytechnic",
            "Hold a valid Nigerian National Identification Number (NIN)",
            "Have a valid Nigerian bank account for payouts",
            "Not have been previously suspended or banned from CampSwap",
          ]} />
          <P>
            By creating an account, you confirm that all information you provide — including your
            NIN, university affiliation, and bank details — is accurate and belongs to you.
            Providing false information is grounds for immediate account termination and may
            constitute a criminal offence under Nigerian law.
          </P>
        </Section>

        <Section id="account" title="3. Your Account">
          <P>
            You are responsible for maintaining the confidentiality of your login credentials.
            You must not share your account with anyone else or allow others to access the Platform
            under your identity. You are responsible for all activity that occurs under your account.
          </P>
          <P>
            If you suspect unauthorised access to your account, notify us immediately at{" "}
            <a href="mailto:support@campswap.ng" style={{ color: "var(--ut-primary)" }}>support@campswap.ng</a>.
          </P>
          <P>
            Each person may hold only one CampSwap account. Creating multiple accounts to circumvent
            a ban, boost ratings, or gain unfair advantage is prohibited.
          </P>
        </Section>

        <Section id="listings" title="4. Listings & Transactions">
          <P><b>As a seller, you agree to:</b></P>
          <Ul items={[
            "Only list items you own and have the right to sell",
            "Provide accurate, honest descriptions and clear photographs",
            "Set a fair price and honour it once a buyer confirms purchase",
            "Deliver the item as described within the agreed timeframe",
            "Respond to buyer messages within a reasonable time",
            "Not cancel confirmed orders without a valid reason",
          ]} />
          <P><b>As a buyer, you agree to:</b></P>
          <Ul items={[
            "Only initiate a purchase if you intend to complete the transaction",
            "Pay promptly once you confirm an order",
            "Inspect the item upon receipt before releasing escrow funds",
            "Raise any disputes within 48 hours of receiving the item",
            "Not abuse the dispute or refund process",
          ]} />
          <P>
            CampSwap is a marketplace platform. We are not a party to transactions between buyers
            and sellers. We do not guarantee the quality, safety, or legality of listed items.
          </P>
        </Section>

        <Section id="prohibited" title="5. Prohibited Items & Conduct">
          <P>
            The following are strictly prohibited on CampSwap. Violations will result in immediate
            account suspension and may be reported to law enforcement:
          </P>
          <P><b>Prohibited items:</b></P>
          <Ul items={[
            "Illegal drugs, narcotics, or controlled substances",
            "Weapons, firearms, ammunition, or explosives",
            "Stolen goods or items obtained by fraud",
            "Counterfeit, pirated, or trademark-infringing products",
            "Prescription medications without valid authorisation",
            "Exam papers, academic credentials, or course materials obtained illegally",
            "Alcohol sold to minors",
            "Pornographic or sexually explicit material",
            "Live animals",
            "Any item whose sale is prohibited under Nigerian law",
          ]} />
          <P><b>Prohibited conduct:</b></P>
          <Ul items={[
            "Scamming, deceiving, or defrauding other users",
            "Harassment, threats, or abusive communication",
            "Creating fake reviews or manipulating ratings",
            "Attempting to conduct transactions outside the CampSwap escrow system",
            "Sharing another user's personal information without consent",
            "Using automated bots or scrapers on the Platform",
            "Impersonating another person or entity",
          ]} />
        </Section>

        <Section id="escrow" title="6. Escrow & Payments">
          <P>
            All payments on CampSwap are processed through our escrow system, powered by Paystack.
            Here is how it works:
          </P>
          <Ul items={[
            <><b>Buyer pays:</b> Funds are deducted from the buyer and held securely in escrow — not released to the seller.</>,
            <><b>Delivery:</b> The seller delivers the item as agreed (in-person meetup or delivery).</>,
            <><b>Buyer confirms:</b> The buyer inspects the item and confirms receipt in the app.</>,
            <><b>Seller paid:</b> Funds are released to the seller&apos;s registered bank account via Paystack.</>,
            <><b>Dispute window:</b> If the buyer does not confirm or raise a dispute within 48 hours of the agreed delivery time, funds are automatically released to the seller.</>,
          ]} />
          <P>
            <b>You must not</b> arrange payment outside the escrow system (e.g. direct bank transfers,
            cash, or mobile money). CampSwap provides no buyer or seller protection for off-platform
            transactions.
          </P>
          <P>
            Paystack&apos;s standard transaction fees apply and are displayed at checkout.
            CampSwap does not charge additional listing or transaction fees at this time.
          </P>
        </Section>

        <Section id="disputes" title="7. Disputes">
          <P>
            If you have a problem with a transaction, use the &quot;Raise a dispute&quot; option in your
            order page within <b>48 hours</b> of the agreed delivery time.
          </P>
          <P>Our dispute resolution process:</P>
          <Ul items={[
            "Both parties are notified and asked to provide evidence (photos, chat logs, receipts)",
            "A CampSwap moderator reviews the case within 3–5 business days",
            "We may request additional information from either party",
            "Our decision on fund release is final and binding",
            "Repeated frivolous disputes may result in account restriction",
          ]} />
          <P>
            CampSwap acts as a neutral mediator. We reserve the right to refund the buyer or
            release funds to the seller based on the evidence presented.
          </P>
        </Section>

        <Section id="fees" title="8. Fees">
          <P>
            Listing on CampSwap is currently <b>free</b>. We do not charge sellers a commission
            or listing fee. Paystack&apos;s standard payment processing fees (1.5% + ₦100 per
            transaction, capped at ₦2,000) are passed through at checkout.
          </P>
          <P>
            We reserve the right to introduce fees in the future. Any new fees will be communicated
            to users at least 30 days in advance.
          </P>
        </Section>

        <Section id="intellectual-property" title="9. Intellectual Property">
          <P>
            By uploading images or content to CampSwap, you grant us a non-exclusive, royalty-free
            licence to display that content on the Platform for the purposes of operating the
            marketplace. You retain full ownership of your content.
          </P>
          <P>
            The CampSwap name, logo, design, and platform code are owned by CampSwap and may not
            be copied, reproduced, or used without written permission.
          </P>
        </Section>

        <Section id="liability" title="10. Limitation of Liability">
          <P>
            CampSwap is a marketplace platform and is not responsible for:
          </P>
          <Ul items={[
            "The quality, safety, accuracy, or legality of listed items",
            "The conduct or reliability of any user",
            "Losses arising from transactions conducted outside our escrow system",
            "Service interruptions, data loss, or technical errors",
          ]} />
          <P>
            To the fullest extent permitted by Nigerian law, CampSwap&apos;s total liability to
            you for any claim arising from your use of the Platform shall not exceed the amount
            of the transaction in dispute.
          </P>
        </Section>

        <Section id="termination" title="11. Termination">
          <P>
            You may close your account at any time by contacting us. Upon closure, your listings
            will be removed and your personal data deleted in accordance with our{" "}
            <Link href="/privacy" style={{ color: "var(--ut-primary)" }}>Privacy Policy</Link>.
            Any pending escrow transactions must be resolved before account closure.
          </P>
          <P>
            We may suspend or permanently ban your account without notice if you:
          </P>
          <Ul items={[
            "Violate these Terms",
            "Engage in fraudulent or abusive behaviour",
            "Provide false identity or verification information",
            "Repeatedly receive substantiated complaints from other users",
          ]} />
          <P>
            Suspended users may appeal by emailing{" "}
            <a href="mailto:support@campswap.ng" style={{ color: "var(--ut-primary)" }}>support@campswap.ng</a>.
            We are not obligated to restore access.
          </P>
        </Section>

        <Section id="governing-law" title="12. Governing Law">
          <P>
            These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes
            arising from these Terms that cannot be resolved informally shall be submitted to the
            jurisdiction of the courts of Nigeria.
          </P>
        </Section>

        <Section id="contact" title="13. Contact Us">
          <P>For any questions about these Terms, reach us at:</P>
          <div style={{
            background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
            borderRadius: "var(--ut-radius-sm)", padding: "16px 20px", fontSize: 14,
          }}>
            <p style={{ margin: "0 0 4px" }}><b>CampSwap Support</b></p>
            <p style={{ margin: "0 0 4px", color: "var(--ut-ink-soft)" }}>
              Email:{" "}
              <a href="mailto:support@campswap.ng" style={{ color: "var(--ut-primary)" }}>
                support@campswap.ng
              </a>
            </p>
            <p style={{ margin: 0, color: "var(--ut-ink-soft)" }}>Response time: within 2 business days</p>
          </div>
        </Section>

        {/* Footer nav */}
        <div style={{
          borderTop: "1px solid var(--ut-line)", paddingTop: 32, marginTop: 16,
          display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13, color: "var(--ut-ink-mute)",
        }}>
          <Link href="/" style={{ color: "var(--ut-ink-mute)", textDecoration: "none" }}>← Home</Link>
          <Link href="/privacy" style={{ color: "var(--ut-primary)", textDecoration: "none" }}>Privacy Policy</Link>
          <span>© {new Date().getFullYear()} CampSwap</span>
        </div>
      </main>
    </div>
  );
}
