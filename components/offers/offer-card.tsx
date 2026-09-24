"use client";

import { useTransition } from "react";
import { respondToOffer } from "@/app/actions/offer";
import {
  formatNaira,
  offerExpiryLabel,
  offerStatusLabel,
  canRespondToOffer,
  canWithdrawOffer,
  type OfferEvent,
  type PriceOffer,
} from "@/lib/offers";
import { Tag, ArrowLeftRight, Check, X, Clock, CheckCircle2, XCircle, Ban } from "lucide-react";

interface Props {
  offer: PriceOffer;
  /// Which event this bubble announced. One offer produces several bubbles
  /// (offered → accepted), so the headline comes from the event while the
  /// amount and the available actions come from the live offer row.
  event: OfferEvent;
  currentUserId: string;
  listPrice: number;
  /// Only the newest offer in a thread can still be acted on. An older bubble
  /// keeps its history but loses its buttons, so nobody taps Accept on a price
  /// that has already been superseded.
  isLatest: boolean;
  onCounter: (offer: PriceOffer) => void;
  onChanged?: () => void;
}

const EVENT_KICKER: Record<OfferEvent, { label: string; Icon: typeof Tag }> = {
  offered:   { label: "Offer",         Icon: Tag },
  countered: { label: "Counter-offer", Icon: ArrowLeftRight },
  accepted:  { label: "Accepted",      Icon: CheckCircle2 },
  declined:  { label: "Declined",      Icon: XCircle },
  withdrawn: { label: "Withdrawn",     Icon: Ban },
};

export default function OfferCard({
  offer,
  event,
  currentUserId,
  listPrice,
  isLatest,
  onCounter,
  onChanged,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const kicker = EVENT_KICKER[event] ?? EVENT_KICKER.offered;
  const Icon = kicker.Icon;

  // The response bubbles ('accepted' and friends) are a record of what happened
  // and never carry actions; only the bubble that opened a live offer does.
  const isProposal = event === "offered" || event === "countered";
  const canRespond = isProposal && isLatest && canRespondToOffer(offer, currentUserId);
  const canWithdraw = isProposal && isLatest && canWithdrawOffer(offer, currentUserId);

  const isAgreed = offer.status === "accepted";
  const isDead = ["declined", "withdrawn", "expired", "countered"].includes(offer.status);

  const cardClass = [
    "ut-offer-card",
    canRespond || canWithdraw ? "live" : isAgreed ? "settled" : isDead ? "dead" : "",
  ].filter(Boolean).join(" ");

  function act(action: "accept" | "decline" | "withdraw") {
    if (isPending) return;
    startTransition(async () => {
      const result = await respondToOffer(offer.id, action);
      // A refusal here is nearly always a race — the other side moved first —
      // so refreshing the thread is more use than an error toast.
      if (result && "error" in result && result.error) {
        console.warn("[offer]", result.error);
      }
      onChanged?.();
    });
  }

  return (
    <div className={cardClass}>
      <span className="ut-offer-kicker">
        <Icon size={11} />
        {event === "accepted" ? "Deal agreed" : kicker.label}
      </span>

      <span className="ut-offer-amount">{formatNaira(offer.amount)}</span>

      {listPrice > offer.amount && (
        <span className="ut-offer-was">was {formatNaira(listPrice)}</span>
      )}

      {isProposal && offer.note && <p className="ut-offer-note">{offer.note}</p>}

      {/* A live offer shows its clock; a settled one shows what became of it. */}
      <span className="ut-offer-meta">
        {offer.status === "pending" ? (
          <><Clock size={10} style={{ verticalAlign: -1, marginRight: 4 }} />{offerExpiryLabel(offer)}</>
        ) : isProposal ? (
          offerStatusLabel(offer.status)
        ) : offer.status === "accepted" ? (
          offer.order_id ? "Paid" : offerExpiryLabel(offer)
        ) : (
          offerStatusLabel(offer.status)
        )}
      </span>

      {canRespond && (
        <div className="ut-offer-actions">
          <button
            type="button"
            className="ut-offer-btn accept"
            disabled={isPending}
            onClick={() => act("accept")}
          >
            <Check size={13} /> Accept
          </button>
          <button
            type="button"
            className="ut-offer-btn"
            disabled={isPending}
            onClick={() => onCounter(offer)}
          >
            <ArrowLeftRight size={13} /> Counter
          </button>
          <button
            type="button"
            className="ut-offer-btn danger"
            disabled={isPending}
            onClick={() => act("decline")}
          >
            <X size={13} /> Decline
          </button>
        </div>
      )}

      {canWithdraw && (
        <div className="ut-offer-actions">
          <button
            type="button"
            className="ut-offer-btn danger"
            disabled={isPending}
            onClick={() => act("withdraw")}
          >
            <Ban size={13} /> Withdraw offer
          </button>
        </div>
      )}
    </div>
  );
}
