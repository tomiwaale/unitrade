"use client";

import { useTransition } from "react";
import { openConversation } from "@/app/actions/chat";
import { MessageCircle } from "lucide-react";

interface Props {
  productId: string;
  sellerId: string;
  sellerFirstName: string;
  unreadCount?: number;
}

export default function MessageSellerBtn({ productId, sellerId, sellerFirstName, unreadCount = 0 }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => { await openConversation(productId, sellerId); });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="ut-cta ut-cta-ghost"
      style={{ justifyContent: "center", padding: "14px 16px", fontSize: 14, borderRadius: 12, position: "relative" }}
    >
      <MessageCircle size={15} />
      {isPending ? "Opening chat…" : `Message ${sellerFirstName}`}
      {unreadCount > 0 && (
        <span style={{
          position: "absolute", top: 8, right: 8,
          minWidth: 18, height: 18, borderRadius: 999,
          background: "var(--ut-accent)", color: "white",
          fontSize: 10, fontWeight: 700,
          fontFamily: "var(--ut-font-mono)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 5px",
          lineHeight: 1,
        }}>
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
