"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

const SEEN_KEY = "ut_chat_payment_safety_seen";

export default function PaymentSafetyDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  function dismiss() {
    setOpen(false);
    try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
  }

  if (!open) return null;

  return (
    <div className="ut-modal-backdrop" onClick={dismiss}>
      <div className="ut-modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: 24 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "color-mix(in srgb, var(--ut-yellow, #ca8a04) 15%, transparent)",
            marginBottom: 14,
          }}>
            <AlertTriangle size={20} style={{ color: "var(--ut-yellow, #ca8a04)" }} />
          </div>
          <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 15.5, color: "var(--ut-ink)" }}>
            Keep it on UniTrade
          </p>
          <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "var(--ut-ink-soft)", lineHeight: 1.55 }}>
            Always pay through UniTrade&apos;s escrow — never send money directly to a seller outside
            the app. If you transact off-platform, we can&apos;t protect your payment or step in if
            something goes wrong.
          </p>
          <button
            onClick={dismiss}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 10, fontSize: 13.5, fontWeight: 600,
              background: "var(--ut-primary)", color: "white", border: "none", cursor: "pointer",
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
