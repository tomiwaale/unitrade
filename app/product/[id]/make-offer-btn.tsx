"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag } from "lucide-react";
import OfferComposer from "@/components/offers/offer-composer";

interface Props {
  productId: string;
  productTitle: string;
  price: number;
  /// Set when this buyer already has an offer awaiting a reply, which turns the
  /// button into a pointer at the thread rather than a way to pile on a second
  /// one — the database keeps a single live offer per buyer anyway.
  pendingConversationId?: string | null;
}

export default function MakeOfferBtn({
  productId,
  productTitle,
  price,
  pendingConversationId = null,
}: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (pendingConversationId) {
    return (
      <button
        type="button"
        onClick={() => router.push(`/messages/${pendingConversationId}`)}
        className="ut-cta ut-cta-ghost"
        style={{ justifyContent: "center", width: "100%", padding: "14px 16px", fontSize: 14, borderRadius: 12 }}
      >
        <Tag size={15} /> View your offer
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ut-cta ut-cta-ghost"
        style={{ justifyContent: "center", width: "100%", padding: "14px 16px", fontSize: 14, borderRadius: 12 }}
      >
        <Tag size={15} /> Make an offer
      </button>

      <OfferComposer
        open={open}
        onClose={() => setOpen(false)}
        productId={productId}
        productTitle={productTitle}
        listPrice={price}
        // The negotiation lives in the thread, so that is where the buyer goes
        // to see the seller's reply.
        onPlaced={() => router.push("/messages")}
      />
    </>
  );
}
