"use client";

import { useTransition } from "react";
import { openConversation } from "@/app/actions/chat";
import { ArrowLeftRight, Loader2 } from "lucide-react";

interface Props {
  productId: string;
  sellerId: string;
  productTitle: string;
}

export default function ProposeSwapBtn({ productId, sellerId, productTitle }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const message = `Hi! I'd like to propose a swap for your listing "${productTitle}". I can offer [describe what you'd swap]. Would you be interested?`;
    startTransition(async () => {
      await openConversation(productId, sellerId, message);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="ut-cta"
      style={{
        justifyContent: "center", width: "100%",
        padding: "14px 16px", fontSize: 14, borderRadius: 12,
        background: "var(--ut-ink)", color: "white",
        opacity: isPending ? 0.6 : 1,
      }}
    >
      {isPending
        ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Opening chat…</>
        : <><ArrowLeftRight size={15} /> Propose a swap</>
      }
    </button>
  );
}
