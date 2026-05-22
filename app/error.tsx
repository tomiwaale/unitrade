"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

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

      <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>Something went wrong</h1>
      <p style={{ fontSize: 14, color: "var(--ut-ink-soft)", margin: "0 0 28px", maxWidth: 380 }}>
        An unexpected error occurred. You can try again or go back to the homepage.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={reset}
          className="ut-cta ut-cta-primary"
          style={{ padding: "11px 22px", borderRadius: 10 }}
        >
          Try again
        </button>
        <Link
          href="/"
          className="ut-cta ut-cta-ghost"
          style={{ padding: "11px 22px", borderRadius: 10 }}
        >
          Go home
        </Link>
      </div>

      {error.digest && (
        <p style={{ marginTop: 24, fontSize: 11, color: "var(--ut-ink-mute)" }}>
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
