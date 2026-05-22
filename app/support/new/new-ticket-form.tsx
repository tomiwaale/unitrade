"use client";

import { useTransition, useState } from "react";
import { openSupportTicket } from "@/app/actions/support";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const CATEGORIES = [
  { value: "order_issue", label: "Order issue" },
  { value: "payment",     label: "Payment" },
  { value: "account",     label: "Account" },
  { value: "other",       label: "Other" },
];

export default function NewTicketForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const result = await openSupportTicket(data);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Link
        href="/support"
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 13, color: "var(--ut-ink-mute)", textDecoration: "none", marginBottom: 4,
        }}
      >
        <ChevronLeft size={14} /> My requests
      </Link>

      {/* Category */}
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ut-ink)", marginBottom: 8 }}>
          Category
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {CATEGORIES.map((cat) => (
            <label
              key={cat.value}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                border: "1.5px solid var(--ut-line)", background: "var(--ut-bg-card)",
                fontSize: 13, fontWeight: 500, color: "var(--ut-ink)",
              }}
            >
              <input
                type="radio"
                name="category"
                value={cat.value}
                required
                style={{ accentColor: "var(--ut-primary)", width: 15, height: 15 }}
              />
              {cat.label}
            </label>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label
          htmlFor="subject"
          style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ut-ink)", marginBottom: 8 }}
        >
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          required
          maxLength={120}
          placeholder="e.g. My payment was deducted but order wasn't confirmed"
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 10,
            border: "1.5px solid var(--ut-line)", background: "var(--ut-bg-card)",
            fontSize: 14, color: "var(--ut-ink)", outline: "none", boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Message */}
      <div>
        <label
          htmlFor="message"
          style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ut-ink)", marginBottom: 8 }}
        >
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          maxLength={3000}
          placeholder="Describe your issue in as much detail as possible…"
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 10,
            border: "1.5px solid var(--ut-line)", background: "var(--ut-bg-card)",
            fontSize: 14, color: "var(--ut-ink)", outline: "none", resize: "vertical",
            boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.5,
          }}
        />
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: 13, color: "#c53030", fontWeight: 500 }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        style={{
          padding: "12px 20px", borderRadius: 999, fontSize: 14, fontWeight: 700,
          background: isPending ? "var(--ut-line)" : "var(--ut-primary)",
          color: "white", border: "none", cursor: isPending ? "not-allowed" : "pointer",
          transition: "background 0.15s",
        }}
      >
        {isPending ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}
