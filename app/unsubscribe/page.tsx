import Link from "next/link";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";
import UnsubscribeForm from "./unsubscribe-form";
import { LogoMark } from "@/components/ui/logo-mark";

export const metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

// The opt-out happens on an explicit button press rather than on page load, so
// inbox link scanners can't unsubscribe someone by prefetching the footer link.
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const email = t ? verifyUnsubscribeToken(t) : null;

  return (
    <div className="ut-auth-page">
      <div style={{ width: "100%", maxWidth: 460 }} className="ut-fade-up">
        <Link href="/" className="ut-logo" style={{ justifyContent: "center", marginBottom: 28, display: "flex" }}>
          <LogoMark />
          <span>KolejSwap</span>
        </Link>

        <div className="ut-auth-card">
          <div className="ut-auth-card-head">
            <h1>Email preferences</h1>
            <p>Manage the marketing emails you receive from KolejSwap.</p>
          </div>

          {email ? (
            <UnsubscribeForm token={t!} email={email} />
          ) : (
            <div className="ut-auth-card-body" style={{ textAlign: "center" }}>
              <p style={{ fontSize: 13.5, color: "var(--ut-ink-soft)", margin: "0 0 20px", lineHeight: 1.6 }}>
                This unsubscribe link is invalid or has expired. You can change your email
                preferences from your profile settings instead.
              </p>
              <Link
                href="/profile"
                className="ut-cta ut-cta-ghost"
                style={{ justifyContent: "center", padding: "11px 20px", borderRadius: 12 }}
              >
                Go to profile
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
