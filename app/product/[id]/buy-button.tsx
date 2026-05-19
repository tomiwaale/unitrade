"use client";

import { useTransition } from "react";
import { createCheckoutSession } from "@/app/actions/checkout";
import { toast } from "sonner";
import { Lock, ArrowRight, Loader2 } from "lucide-react";

export default function BuyButton({ productId, price }: { productId: string; price: number }) {
  const [isPending, startTransition] = useTransition();

  const handleBuy = () => {
    startTransition(async () => {
      const result = await createCheckoutSession(productId);
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
      ) : (
        <><Lock size={15} /> Buy with escrow</>
      )}
    </button>
  );
}
