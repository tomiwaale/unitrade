"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/actions/chat";
import { createCheckoutSession } from "@/app/actions/checkout";
import { Send, Camera, Tag, Flag, Lock, Loader2 } from "lucide-react";
import ReportDialog from "@/components/safety/report-dialog";
import OfferComposer from "@/components/offers/offer-composer";
import OfferCard from "@/components/offers/offer-card";
import {
  OFFER_SELECT,
  formatNaira,
  isOfferLive,
  type OfferEvent,
  type PriceOffer,
} from "@/lib/offers";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  hidden_at?: string | null;
  offer_id?: string | null;
  offer_event?: OfferEvent | null;
}

interface Props {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
  initialOffers: PriceOffer[];
  /// Null when the listing has been deleted, in which case there is nothing
  /// left to negotiate over and the offer affordances stay hidden.
  product: { id: string; title: string; price: number; allowOffers: boolean; isActive: boolean } | null;
  isBuyer: boolean;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatView({
  conversationId,
  currentUserId,
  initialMessages,
  initialOffers,
  product,
  isBuyer,
}: Props) {
  const [messages, setMessages]   = useState<Message[]>(initialMessages);
  const [offers, setOffers]       = useState<PriceOffer[]>(initialOffers);
  const [text, setText]           = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError]         = useState("");
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [counterTo, setCounterTo] = useState<PriceOffer | null>(null);
  const [isBuying, startBuying]   = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Offer state is read from price_offers rather than from the message, because
  // one offer spans several bubbles and its status changes after the fact.
  // Every offer event also posts a message, so the messages subscription below
  // is a reliable trigger to refetch — no second realtime channel required.
  const refreshOffers = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("price_offers")
      .select(OFFER_SELECT)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (data) setOffers(data as unknown as PriceOffer[]);
  }, [conversationId]);

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
        const incoming = payload.new as Message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
        // The bubble needs the offer's amount and live status, which the
        // message payload does not carry.
        if (incoming.offer_id) void refreshOffers();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, refreshOffers]);

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

  const offersById = new Map(offers.map((o) => [o.id, o]));

  // Only the newest proposal can still be acted on, so the id is computed once
  // here rather than re-derived per bubble.
  const latestProposalId = [...messages]
    .reverse()
    .find((m) => m.offer_id && (m.offer_event === "offered" || m.offer_event === "countered"))
    ?.offer_id ?? null;

  // The buyer's agreed price, if one is standing. Drives the pay banner: a
  // buyer arriving from the "offer accepted" notification lands here, so the
  // action has to be reachable without going back to the listing.
  const agreedOffer = offers.find(
    (o) => o.status === "accepted" && !o.order_id && o.buyer_id === currentUserId && isOfferLive(o),
  );

  const canOffer =
    product !== null && product.isActive && product.allowOffers && !composerOpen;

  function openCounter(offer: PriceOffer) {
    setCounterTo(offer);
    setComposerOpen(true);
  }

  function openFreshOffer() {
    setCounterTo(null);
    setComposerOpen(true);
  }

  function handleBuy() {
    if (!product || !agreedOffer) return;
    startBuying(async () => {
      const result = await createCheckoutSession(product.id, agreedOffer.id);
      if (result?.error) setError(result.error);
    });
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
          const offer = msg.offer_id ? offersById.get(msg.offer_id) : undefined;

          // An offer bubble, as long as the offer row has loaded. Until it does
          // the message's own text ("Offered ₦18,000") is a faithful fallback,
          // which is also what an older mobile build shows.
          if (offer && msg.offer_event && !removed) {
            return (
              <div key={msg.id} className={`ut-msg-bubble-row ${isMe ? "me" : "them"}`}>
                <OfferCard
                  offer={offer}
                  event={msg.offer_event}
                  currentUserId={currentUserId}
                  listPrice={product?.price ?? 0}
                  isLatest={msg.offer_id === latestProposalId}
                  onCounter={openCounter}
                  onChanged={refreshOffers}
                />
              </div>
            );
          }

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

      {/* An agreed price is only worth anything if it gets paid, so it sits
          above the composer until it is spent or lapses. */}
      {agreedOffer && product && (
        <div className="ut-offer-deal">
          <p>
            Agreed at <b>{formatNaira(agreedOffer.amount)}</b> — pay through escrow to lock it in.
          </p>
          <button
            type="button"
            className="ut-offer-btn accept"
            style={{ flex: "0 0 auto" }}
            disabled={isBuying}
            onClick={handleBuy}
          >
            {isBuying
              ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Starting…</>
              : <><Lock size={13} /> Pay {formatNaira(agreedOffer.amount)}</>
            }
          </button>
        </div>
      )}

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
          {/* The buyer opens a negotiation; the seller answers one from the
              offer card itself, so this only appears for the buyer. */}
          {isBuyer && (
            <button
              className="ut-nav-btn"
              type="button"
              aria-label="Make an offer"
              title={canOffer ? "Make an offer" : "This listing isn't taking offers"}
              disabled={!canOffer}
              onClick={openFreshOffer}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "var(--ut-bg-sunken)",
                opacity: canOffer ? 1 : 0.45,
                cursor: canOffer ? "pointer" : "not-allowed",
              }}
            >
              <Tag size={15} />
            </button>
          )}
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

      {product && (
        <OfferComposer
          open={composerOpen}
          onClose={() => { setComposerOpen(false); setCounterTo(null); }}
          productId={product.id}
          productTitle={product.title}
          listPrice={product.price}
          counterTo={counterTo ? { id: counterTo.id, amount: counterTo.amount } : null}
          onPlaced={refreshOffers}
        />
      )}

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
