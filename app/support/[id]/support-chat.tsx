"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendSupportMessage } from "@/app/actions/support";
import { Send } from "lucide-react";

interface SupportMessage {
  id: string;
  content: string;
  is_admin: boolean;
  sender_id: string;
  sender_name: string | null;
  created_at: string;
}

interface Props {
  ticketId: string;
  currentUserId: string;
  isClosed: boolean;
  initialMessages: SupportMessage[];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export default function SupportChat({ ticketId, currentUserId, isClosed, initialMessages }: Props) {
  const [messages, setMessages]       = useState<SupportMessage[]>(initialMessages);
  const [text, setText]               = useState("");
  const [isPending, startTransition]  = useTransition();
  const [error, setError]             = useState("");
  const bottomRef                     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`support:${ticketId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "support_messages",
        filter: `ticket_id=eq.${ticketId}`,
      }, (payload) => {
        const msg = payload.new as any;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, {
            id: msg.id,
            content: msg.content,
            is_admin: msg.is_admin,
            sender_id: msg.sender_id,
            sender_name: msg.is_admin ? "Support" : null,
            created_at: msg.created_at,
          }];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId]);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || isPending || isClosed) return;

    const optimistic: SupportMessage = {
      id: `opt-${Date.now()}`,
      content: trimmed,
      is_admin: false,
      sender_id: currentUserId,
      sender_name: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setError("");

    startTransition(async () => {
      const result = await sendSupportMessage(ticketId, trimmed);
      if (result?.error) {
        setError(result.error);
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setText(trimmed);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, paddingBottom: 16 }}>
      {/* Message thread */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, padding: "8px 0" }}>
        {messages.length === 0 && (
          <p style={{ textAlign: "center", color: "var(--ut-ink-mute)", fontSize: 13, margin: "auto" }}>
            No messages yet — describe your issue and we&apos;ll reply soon.
          </p>
        )}
        {messages.map((msg, i) => {
          const isMe = !msg.is_admin;
          const showDate = i === 0 || formatDate(messages[i - 1].created_at) !== formatDate(msg.created_at);
          return (
            <div key={msg.id}>
              {showDate && (
                <p style={{ textAlign: "center", fontSize: 11, color: "var(--ut-ink-mute)", margin: "8px 0", fontWeight: 500 }}>
                  {formatDate(msg.created_at)}
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                {msg.is_admin && (
                  <p style={{ margin: "0 0 3px 4px", fontSize: 11, fontWeight: 700, color: "var(--ut-ink-mute)" }}>
                    {msg.sender_name ?? "KolejSwap Support"}
                  </p>
                )}
                <div style={{
                  maxWidth: "78%", padding: "9px 14px", borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: isMe ? "var(--ut-primary)" : "var(--ut-bg-card)",
                  color: isMe ? "white" : "var(--ut-ink)",
                  border: isMe ? "none" : "1px solid var(--ut-line)",
                  fontSize: 14, lineHeight: 1.45,
                }}>
                  {msg.content}
                </div>
                <span style={{ fontSize: 10, color: "var(--ut-ink-mute)", margin: "3px 4px 0", fontFamily: "var(--ut-font-mono)" }}>
                  {formatTime(msg.created_at)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input or closed notice */}
      {isClosed ? (
        <div style={{
          padding: "12px 16px", borderRadius: 12, background: "var(--ut-bg-sunken)",
          border: "1px solid var(--ut-line)", textAlign: "center",
          fontSize: 13, color: "var(--ut-ink-mute)",
        }}>
          This ticket is closed. <a href="/support/new" style={{ color: "var(--ut-primary)", fontWeight: 600 }}>Open a new request</a> if you need further help.
        </div>
      ) : (
        <div style={{
          display: "flex", alignItems: "flex-end", gap: 8,
          background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
          borderRadius: 16, padding: "8px 10px", position: "relative",
        }}>
          {error && (
            <p style={{ position: "absolute", bottom: "100%", left: 12, fontSize: 12, color: "#c53030", marginBottom: 4 }}>
              {error}
            </p>
          )}
          <textarea
            rows={1}
            placeholder="Reply to support…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1, border: "none", background: "transparent", outline: "none",
              fontSize: 14, color: "var(--ut-ink)", resize: "none", fontFamily: "inherit",
              lineHeight: 1.4, maxHeight: 120, overflowY: "auto", padding: "4px 4px",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || isPending}
            style={{
              width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
              background: !text.trim() || isPending ? "var(--ut-line)" : "var(--ut-primary)",
              color: "white", border: "none", cursor: !text.trim() || isPending ? "not-allowed" : "pointer",
              display: "grid", placeItems: "center", transition: "background 0.15s",
            }}
          >
            <Send size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
