"use client";

import { useState, useTransition } from "react";
import { adminSendSupportMessage, adminCloseTicket, adminReopenTicket } from "@/app/actions/support";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

export default function AdminSupportReply({
  ticketId,
  isClosed,
  adminName,
}: {
  ticketId: string;
  isClosed: boolean;
  adminName: string;
}) {
  const [text, setText]               = useState("");
  const [isPending, startTransition]  = useTransition();
  const [error, setError]             = useState("");
  const router                        = useRouter();

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;
    setError("");
    startTransition(async () => {
      const result = await adminSendSupportMessage(ticketId, trimmed);
      if (result?.error) { setError(result.error); return; }
      setText("");
      router.refresh();
    });
  }

  function handleClose() {
    startTransition(async () => {
      const result = await adminCloseTicket(ticketId);
      if (result?.error) { setError(result.error); return; }
      router.refresh();
    });
  }

  function handleReopen() {
    startTransition(async () => {
      const result = await adminReopenTicket(ticketId);
      if (result?.error) { setError(result.error); return; }
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {error && (
        <p style={{ margin: 0, fontSize: 13, color: "#c53030", fontWeight: 500 }}>{error}</p>
      )}

      {!isClosed && (
        <div style={{
          background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
          borderRadius: 14, padding: "10px 12px",
        }}>
          <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "var(--ut-ink-mute)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Replying as {adminName}
          </p>
          <textarea
            rows={3}
            placeholder="Type your reply…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend(); }}
            style={{
              width: "100%", border: "none", background: "transparent", outline: "none",
              fontSize: 14, color: "var(--ut-ink)", resize: "vertical", fontFamily: "inherit",
              lineHeight: 1.5, boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button
              onClick={handleSend}
              disabled={!text.trim() || isPending}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 700,
                background: !text.trim() || isPending ? "var(--ut-line)" : "var(--ut-primary)",
                color: "white", border: "none",
                cursor: !text.trim() || isPending ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
            >
              <Send size={13} />
              {isPending ? "Sending…" : "Send reply"}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        {isClosed ? (
          <button
            onClick={handleReopen}
            disabled={isPending}
            style={{
              padding: "9px 18px", borderRadius: 999, fontSize: 13, fontWeight: 700,
              background: "var(--ut-bg-card)", color: "var(--ut-ink-soft)",
              border: "1.5px solid var(--ut-line)", cursor: isPending ? "not-allowed" : "pointer",
            }}
          >
            {isPending ? "Reopening…" : "Reopen ticket"}
          </button>
        ) : (
          <button
            onClick={handleClose}
            disabled={isPending}
            style={{
              padding: "9px 18px", borderRadius: 999, fontSize: 13, fontWeight: 700,
              background: "var(--ut-bg-card)", color: "#9B1C1C",
              border: "1.5px solid #FBBABA", cursor: isPending ? "not-allowed" : "pointer",
            }}
          >
            {isPending ? "Closing…" : "Close ticket"}
          </button>
        )}
      </div>
    </div>
  );
}
