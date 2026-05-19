"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { adminReleaseToSeller, adminMarkRefunded } from "@/app/actions/admin";

export default function DisputeActions({
  orderId,
  hasPayout,
}: {
  orderId: string;
  hasPayout: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRelease = () => {
    startTransition(async () => {
      const result = await adminReleaseToSeller(orderId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Funds released to seller");
        router.refresh();
      }
    });
  };

  const handleRefund = () => {
    startTransition(async () => {
      const result = await adminMarkRefunded(orderId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Order marked as refunded");
        router.refresh();
      }
    });
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {hasPayout && (
        <button
          onClick={handleRelease}
          disabled={isPending}
          style={{
            padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
            color: "white", background: "var(--ut-primary)", border: "none",
            cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1,
          }}
        >
          Release to Seller
        </button>
      )}
      <button
        onClick={handleRefund}
        disabled={isPending}
        style={{
          padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
          color: "#9B1C1C", background: "#FDEAEA", border: "1.5px solid #FBBABA",
          cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? "…" : "Refund Buyer"}
      </button>
    </div>
  );
}
