"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle, MailX, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { confirmUnsubscribe, undoUnsubscribe } from "./actions";

export default function UnsubscribeForm({ token, email }: { token: string; email: string }) {
  const [state, setState] = useState<"idle" | "done" | "resubscribed">("idle");
  const [isPending, startTransition] = useTransition();

  function handleUnsubscribe() {
    startTransition(async () => {
      const result = await confirmUnsubscribe(token);
      if ("error" in result && result.error) toast.error(result.error);
      else setState("done");
    });
  }

  function handleUndo() {
    startTransition(async () => {
      const result = await undoUnsubscribe(token);
      if ("error" in result && result.error) toast.error(result.error);
      else setState("resubscribed");
    });
  }

  if (state === "resubscribed") {
    return (
      <div className="ut-auth-card-body" style={{ textAlign: "center" }}>
        <CheckCircle size={30} style={{ color: "var(--ut-primary)", marginBottom: 12 }} />
        <p style={{ fontSize: 14.5, color: "var(--ut-ink)", margin: "0 0 6px", fontWeight: 600 }}>
          You&apos;re back on the list
        </p>
        <p style={{ fontSize: 13.5, color: "var(--ut-ink-mute)", margin: "0 0 20px" }}>
          {email} will keep receiving KolejSwap updates.
        </p>
        <Link
          href="/catalog"
          className="ut-cta ut-cta-ghost"
          style={{ justifyContent: "center", padding: "11px 20px", borderRadius: 12 }}
        >
          Browse listings
        </Link>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="ut-auth-card-body" style={{ textAlign: "center" }}>
        <CheckCircle size={30} style={{ color: "var(--ut-primary)", marginBottom: 12 }} />
        <p style={{ fontSize: 14.5, color: "var(--ut-ink)", margin: "0 0 6px", fontWeight: 600 }}>
          You&apos;ve been unsubscribed
        </p>
        <p style={{ fontSize: 13.5, color: "var(--ut-ink-mute)", margin: "0 0 20px", lineHeight: 1.6 }}>
          {email} won&apos;t receive marketing emails from KolejSwap any more. You&apos;ll still get
          essential messages about your orders, payouts and account.
        </p>
        <button
          onClick={handleUndo}
          disabled={isPending}
          className="ut-cta ut-cta-ghost"
          style={{ justifyContent: "center", padding: "11px 20px", borderRadius: 12, width: "100%" }}
        >
          <Undo2 size={15} />
          {isPending ? "Working…" : "Undo — resubscribe me"}
        </button>
      </div>
    );
  }

  return (
    <div className="ut-auth-card-body" style={{ textAlign: "center" }}>
      <MailX size={30} style={{ color: "var(--ut-ink-mute)", marginBottom: 12 }} />
      <p style={{ fontSize: 13.5, color: "var(--ut-ink-soft)", margin: "0 0 20px", lineHeight: 1.6 }}>
        Unsubscribe <strong style={{ color: "var(--ut-ink)" }}>{email}</strong> from KolejSwap
        marketing emails? You&apos;ll still receive essential messages about your orders, payouts
        and account.
      </p>
      <button
        onClick={handleUnsubscribe}
        disabled={isPending}
        className="ut-cta ut-cta-primary"
        style={{ justifyContent: "center", padding: "13px 20px", borderRadius: 12, width: "100%" }}
      >
        {isPending ? "Unsubscribing…" : "Unsubscribe me"}
      </button>
      <Link
        href="/catalog"
        style={{
          display: "inline-block",
          marginTop: 16,
          fontSize: 13.5,
          color: "var(--ut-ink-mute)",
          textDecoration: "none",
        }}
      >
        No thanks, keep me subscribed
      </Link>
    </div>
  );
}
