"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/actions/chat";
import { Send, Camera, Tag, Flag } from "lucide-react";
import ReportDialog from "@/components/safety/report-dialog";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  hidden_at?: string | null;
}

interface Props {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatView({ conversationId, currentUserId, initialMessages }: Props) {
  const [messages, setMessages]   = useState<Message[]>(initialMessages);
  const [text, setText]           = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError]         = useState("");
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.new.id)) return prev;
          return [...prev, payload.new as Message];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;

    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      sender_id: currentUserId,
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setError("");

    startTransition(async () => {
      const result = await sendMessage(conversationId, trimmed);
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
    <>
      {/* Messages */}
      <div className="ut-msg-thread-body">
        {messages.length === 0 && (
          <p style={{ textAlign: "center", color: "var(--ut-ink-mute)", fontSize: 13, margin: "auto" }}>
            No messages yet — say hello!
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          const removed = Boolean(msg.hidden_at);
          return (
            <div key={msg.id} className={`ut-msg-bubble-row ${isMe ? "me" : "them"}`}>
              <div className={`ut-bubble ${isMe ? "me" : "them"}${removed ? " removed" : ""}`}>
                {msg.content}
                <small>{formatTime(msg.created_at)}</small>
              </div>
              {/* Only the counterpart's messages, and only ones that are still
                  standing — there is nothing to report about a message a
                  moderator has already taken down. */}
              {!isMe && !removed && !msg.id.startsWith("opt-") && (
                <button
                  type="button"
                  className="ut-msg-report"
                  aria-label="Report this message"
                  title="Report this message"
                  onClick={() => setReportingMessage(msg)}
                >
                  <Flag size={12} />
                </button>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="ut-msg-input">
        {error && (
          <p style={{ position: "absolute", bottom: "100%", left: 14, fontSize: 12, color: "#c53030", marginBottom: 4 }}>
            {error}
          </p>
        )}
        <div style={{ display: "flex", gap: 6 }}>
          <button className="ut-nav-btn" type="button" aria-label="Photo" style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--ut-bg-sunken)" }}>
            <Camera size={15} />
          </button>
          <button className="ut-nav-btn" type="button" aria-label="Offer" style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--ut-bg-sunken)" }}>
            <Tag size={15} />
          </button>
        </div>
        <input
          placeholder="Type a message… (Enter to send)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="ut-send-btn"
          onClick={handleSend}
          disabled={!text.trim() || isPending}
          style={{ opacity: (!text.trim() || isPending) ? 0.4 : 1 }}
        >
          <Send size={14} />
        </button>
      </div>

      <ReportDialog
        open={reportingMessage !== null}
        onClose={() => setReportingMessage(null)}
        targetType="message"
        targetId={reportingMessage?.id ?? ""}
        subject={`"${(reportingMessage?.content ?? "").slice(0, 120)}"`}
      />
    </>
  );
}
