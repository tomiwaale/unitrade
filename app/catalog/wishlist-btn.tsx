"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleWishlist } from "@/app/actions/wishlist";

interface Props {
  productId: string;
  initialLiked: boolean;
}

export default function WishlistBtn({ productId, initialLiked }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const result = await toggleWishlist(productId);
      if (!result.error) setLiked(result.liked ?? !liked);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      style={{
        width: 30, height: 30, borderRadius: "50%",
        background: "rgba(255,255,255,0.92)", border: "none", cursor: "pointer",
        display: "grid", placeItems: "center", backdropFilter: "blur(4px)",
        flexShrink: 0, opacity: isPending ? 0.6 : 1, transition: "opacity 0.15s",
      }}
      aria-label={liked ? "Remove from wishlist" : "Save to wishlist"}
    >
      <Heart
        size={13}
        fill={liked ? "#FF5A1F" : "none"}
        style={{ color: liked ? "#FF5A1F" : "var(--ut-ink-soft)", transition: "color 0.15s, fill 0.15s" }}
      />
    </button>
  );
}
