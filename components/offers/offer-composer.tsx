"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { makeOffer } from "@/app/actions/offer";
import { formatNaira } from "@/lib/offers";
import { Tag, X, Loader2, ArrowLeftRight } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  productId: string;
  productTitle: string;
  /// The asking price, for the quick-pick chips and the "N% below asking" line.
  /// Not a bound — the server enforces those.
  listPrice: number;
  /// Set when countering someone else's offer, which changes the copy and tells
  /// the server which offer this one answers.
  counterTo?: { id: string; amount: number } | null;
  onPlaced?: (offerId: string) => void;
}

/// Bottom sheet for naming a price. Shared by the product page ("Make an
/// offer"), the chat composer's tag button, and the seller's "Counter" action —
/// all three are the same form with different copy, and one component keeps the
/// quick-pick maths and the validation in one place.
///
/// The sheet itself is a separate component mounted only while open, so each
/// time it opens it starts on a blank form without an effect reaching in to
/// reset one.
export default function OfferComposer({ open, ...props }: Props) {
  if (!open) return null;
  return <OfferSheet {...props} />;
}

function OfferSheet({
  onClose,
  productId,
  productTitle,
  listPrice,
  counterTo = null,
  onPlaced,
}: Omit<Props, "open">) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const isCounter = counterTo !== null;

  useEffect(() => {
    // Focus after the sheet has painted, or iOS Safari drops it.
    const timer = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed > 0;
  // Meeting in the middle is the commonest counter, so it is a chip rather than
  // mental arithmetic.
  const chips = isCounter
    ? [
        { label: "Split the difference", value: Math.round((counterTo!.amount + listPrice) / 2) },
        { label: "Hold at asking", value: listPrice },
      ]
    : [0.9, 0.8, 0.7].map((factor) => ({
        label: `${Math.round((1 - factor) * 100)}% off`,
        value: Math.round((listPrice * factor) / 50) * 50,
      }));

  const discount = valid && listPrice > 0 ? Math.round((1 - parsed / listPrice) * 100) : 0;

  function submit() {
    if (!valid || isPending) return;
    setError("");
    startTransition(async () => {
      const result = await makeOffer(productId, parsed, note, counterTo?.id);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      if (result && "offer" in result && result.offer) onPlaced?.(result.offer.id);
      onClose();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isCounter ? "Counter this offer" : "Make an offer"}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%", maxWidth: 520,
        background: "var(--ut-bg-card)",
        borderRadius: "20px 20px 0 0",
        padding: "22px 20px 32px",
        maxHeight: "88vh", overflowY: "auto",
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 17, color: "var(--ut-ink)" }}>
              {isCounter ? "Counter their offer" : "Make an offer"}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--ut-ink-mute)" }}>
              {isCounter
                ? `They offered ${formatNaira(counterTo!.amount)} · asking ${formatNaira(listPrice)}`
                : `${productTitle} · asking ${formatNaira(listPrice)}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--ut-ink-mute)" }}
          >
            <X size={20} />
          </button>
        </div>

        <div>
          <label
            htmlFor="offer-amount"
            style={{
              display: "block", marginBottom: 8,
              fontSize: 11, fontFamily: "var(--ut-font-mono)",
              textTransform: "uppercase", letterSpacing: "0.1em",
              color: "var(--ut-ink-mute)",
            }}
          >
            Your price
          </label>
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              fontSize: 19, color: "var(--ut-ink-mute)", pointerEvents: "none",
              fontFamily: "var(--ut-font-mono)",
            }}>
              ₦
            </span>
            <input
              id="offer-amount"
              ref={inputRef}
              type="number"
              inputMode="numeric"
              min="1"
              step="50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              placeholder="0"
              style={{
                width: "100%", padding: "13px 14px 13px 34px", borderRadius: 11,
                border: "1.5px solid var(--ut-line)", background: "var(--ut-bg-sunken)",
                fontSize: 19, fontWeight: 600, color: "var(--ut-ink)",
                fontFamily: "var(--ut-font-mono)",
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          {valid && discount > 0 && (
            <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "var(--ut-ink-mute)" }}>
              {discount}% below the asking price
            </p>
          )}
          {valid && discount < 0 && (
            <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "var(--ut-ink-mute)" }}>
              {Math.abs(discount)}% above the asking price
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => setAmount(String(chip.value))}
              style={{
                padding: "7px 12px", borderRadius: 999,
                border: "1.5px solid var(--ut-line)", background: "var(--ut-bg-card)",
                fontSize: 12, color: "var(--ut-ink-soft)", cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {chip.label} · {formatNaira(chip.value)}
            </button>
          ))}
        </div>

        <div>
          <label
            htmlFor="offer-note"
            style={{
              display: "block", marginBottom: 8,
              fontSize: 11, fontFamily: "var(--ut-font-mono)",
              textTransform: "uppercase", letterSpacing: "0.1em",
              color: "var(--ut-ink-mute)",
            }}
          >
            Add a note (optional)
          </label>
          <textarea
            id="offer-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isCounter ? "Best I can do — it's barely used." : "I can pick up on campus today."}
            rows={2}
            maxLength={500}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 10,
              border: "1.5px solid var(--ut-line)", background: "var(--ut-bg-sunken)",
              fontSize: 13.5, color: "var(--ut-ink)", resize: "none", outline: "none",
              fontFamily: "inherit", boxSizing: "border-box",
            }}
          />
        </div>

        {error && (
          <p role="alert" style={{ margin: 0, fontSize: 12.5, color: "#C53030" }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={!valid || isPending}
          className="ut-cta ut-cta-primary"
          style={{
            justifyContent: "center", padding: "14px", fontSize: 14, borderRadius: 12,
            opacity: !valid || isPending ? 0.5 : 1,
            cursor: !valid || isPending ? "not-allowed" : "pointer",
          }}
        >
          {isPending ? (
            <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Sending…</>
          ) : isCounter ? (
            <><ArrowLeftRight size={15} /> Send counter-offer</>
          ) : (
            <><Tag size={15} /> Send offer</>
          )}
        </button>

        <p style={{ margin: 0, fontSize: 11.5, color: "var(--ut-ink-mute)", textAlign: "center" }}>
          {isCounter
            ? "They have 48 hours to accept before this lapses."
            : "The seller has 48 hours to reply. Pay through escrow once they accept."}
        </p>
      </div>
    </div>
  );
}
