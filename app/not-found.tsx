import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <Link href="/" className="ut-logo" style={{ justifyContent: "center", marginBottom: 32, display: "flex" }}>
        <span className="ut-logo-mark">u</span>
        <span>KolejSwap</span>
      </Link>

      <p style={{ fontSize: 64, fontWeight: 700, margin: "0 0 4px", lineHeight: 1, color: "var(--ut-primary)" }}>
        404
      </p>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>Page not found</h1>
      <p style={{ fontSize: 14, color: "var(--ut-ink-soft)", margin: "0 0 28px", maxWidth: 360 }}>
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          href="/catalog"
          className="ut-cta ut-cta-primary"
          style={{ padding: "11px 22px", borderRadius: 10 }}
        >
          Browse listings
        </Link>
        <Link
          href="/"
          className="ut-cta ut-cta-ghost"
          style={{ padding: "11px 22px", borderRadius: 10 }}
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
