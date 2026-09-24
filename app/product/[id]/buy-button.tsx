"use client";

import { useTransition } from "react";
import { createCheckoutSession } from "@/app/actions/checkout";
import { formatNaira } from "@/lib/offers";
import { toast } from "sonner";
import { Lock, Loader2 } from "lucide-react";

interface Props {
  productId: string;
  price: number;
  /// The buyer's live agreed price, when they have negotiated one. Passed to
  /// checkout as a hint only — reserve_product_for_checkout resolves the offer
  /// itself, so the amount charged never comes from this component.
  agreedOffer?: { id: string; amount: number } | null;
}

export default function BuyButton({ productId, price, agreedOffer = null }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleBuy = () => {
    startTransition(async () => {
      const result = await createCheckoutSession(productId, agreedOffer?.id ?? null);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  };

  return (
    <button
      onClick={handleBuy}
      disabled={isPending}
      className="ut-cta ut-cta-primary"
      style={{ justifyContent: "center", padding: "14px 16px", fontSize: 14, borderRadius: 12, opacity: isPending ? 0.6 : 1 }}
    >
      {isPending ? (
        <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Initializing…</>
      ) : agreedOffer ? (
        // Naming the agreed amount is the whole reassurance: the buyer is about
        // to be charged less than the price on the page.
        <><Lock size={15} /> Buy at {formatNaira(agreedOffer.amount)}</>
      ) : (
        <><Lock size={15} /> Buy with escrow</>
      )}
    </button>
  );
}
