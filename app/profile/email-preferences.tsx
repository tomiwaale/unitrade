"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { setMarketingOptIn } from "@/app/actions/profile";

// Mirror of the unsubscribe link's effect, so a user who opted out from an
// email can turn updates back on without hunting for an old message.
export default function EmailPreferences({ optedIn }: { optedIn: boolean }) {
  const [enabled, setEnabled] = useState(optedIn);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      const result = await setMarketingOptIn(next);
      if (result?.error) {
        setEnabled(!next);
        toast.error(result.error);
      } else {
        toast.success(next ? "You'll receive KolejSwap updates" : "Unsubscribed from marketing emails");
      }
    });
  }

  return (
    <div style={{
      background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
      borderRadius: "var(--ut-radius)", padding: "16px 18px",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
    }}>
      <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
        <Mail size={17} style={{ color: "var(--ut-ink-mute)", flexShrink: 0, marginTop: 2 }} />
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 600, color: "var(--ut-ink)" }}>
            Product news and offers
          </p>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--ut-ink-mute)", lineHeight: 1.5 }}>
            Occasional emails about new features and campus deals. Order, payout and account
            emails are always sent.
          </p>
        </div>
      </div>

      <button
        role="switch"
        aria-checked={enabled}
        aria-label="Product news and offers"
        onClick={toggle}
        disabled={isPending}
        style={{
          flexShrink: 0, width: 42, height: 24, borderRadius: 999, border: 0, padding: 3,
          cursor: isPending ? "default" : "pointer", opacity: isPending ? 0.6 : 1,
          background: enabled ? "var(--ut-primary)" : "var(--ut-bg-sunken)",
          transition: "background 0.15s",
        }}
      >
        <span style={{
          display: "block", width: 18, height: 18, borderRadius: 999, background: "#fff",
          transform: enabled ? "translateX(18px)" : "translateX(0)", transition: "transform 0.15s",
        }} />
      </button>
    </div>
  );
}
