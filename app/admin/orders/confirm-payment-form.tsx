"use client";

import { useState } from "react";
import { adminConfirmPaymentByEmail } from "@/app/actions/admin";

export function ConfirmPaymentForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setResult(null);
    const res = await adminConfirmPaymentByEmail(email.trim());
    setLoading(false);
    if (res.error) {
      setResult({ type: "error", message: res.error });
    } else {
      setResult({ type: "success", message: res.message ?? "Done." });
      setEmail("");
    }
  }

  return (
    <div style={{
      background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
      borderRadius: "var(--ut-radius)", padding: "20px 24px", marginBottom: 28,
    }}>
      <p style={{ fontWeight: 700, fontSize: 14, color: "var(--ut-ink)", marginBottom: 4 }}>
        Manually confirm pending payment
      </p>
      <p style={{ fontSize: 13, color: "var(--ut-ink-mute)", marginBottom: 14 }}>
        Enter the buyer's email — all their pending orders will be re-verified against Paystack and marked paid if confirmed.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="buyer@email.com"
          required
          style={{
            flex: "1 1 240px", padding: "9px 14px", borderRadius: "var(--ut-radius)",
            border: "1px solid var(--ut-line)", fontSize: 13, color: "var(--ut-ink)",
            background: "var(--ut-bg)", outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "9px 20px", borderRadius: "var(--ut-radius)",
            background: loading ? "var(--ut-bg-sunken)" : "var(--ut-primary)",
            color: loading ? "var(--ut-ink-mute)" : "white",
            fontWeight: 700, fontSize: 13, border: "none", cursor: loading ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {loading ? "Verifying…" : "Confirm payment"}
        </button>
      </form>

      {result && (
        <p style={{
          marginTop: 12, fontSize: 13, fontWeight: 600,
          color: result.type === "success" ? "#065F46" : "#9B1C1C",
          background: result.type === "success" ? "#ECFDF5" : "#FDEAEA",
          borderRadius: 6, padding: "8px 12px", display: "inline-block",
        }}>
          {result.type === "success" ? "✓ " : "✗ "}{result.message}
        </p>
      )}
    </div>
  );
}
