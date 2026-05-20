"use client";

import { useTransition } from "react";
import { respondToSwap, cancelSwap } from "@/app/actions/swap";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Ban } from "lucide-react";

export function SellerSwapActions({ swapId }: { swapId: string }) {
  const [acceptPending, startAccept] = useTransition();
  const [declinePending, startDecline] = useTransition();
  const router = useRouter();

  function handleAccept() {
    startAccept(async () => {
      const result = await respondToSwap(swapId, "accepted");
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Swap accepted! Both items are now marked as sold.");
        router.refresh();
      }
    });
  }

  function handleDecline() {
    startDecline(async () => {
      const result = await respondToSwap(swapId, "declined");
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Offer declined.");
        router.refresh();
      }
    });
  }

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
      <button
        onClick={handleAccept}
        disabled={acceptPending || declinePending}
        className="ut-cta ut-cta-primary"
        style={{
          flex: 1, justifyContent: "center",
          padding: "10px 14px", fontSize: 13, borderRadius: 10,
          opacity: acceptPending || declinePending ? 0.6 : 1,
        }}
      >
        {acceptPending
          ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Accepting…</>
          : <><CheckCircle2 size={13} /> Accept swap</>
        }
      </button>
      <button
        onClick={handleDecline}
        disabled={acceptPending || declinePending}
        style={{
          flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          color: "#9B1C1C", background: "#FDEAEA", border: "1.5px solid #FBBABA",
          cursor: acceptPending || declinePending ? "not-allowed" : "pointer",
          opacity: acceptPending || declinePending ? 0.6 : 1,
        }}
      >
        {declinePending
          ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Declining…</>
          : <><XCircle size={13} /> Decline</>
        }
      </button>
    </div>
  );
}

export function BuyerCancelAction({ swapId }: { swapId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelSwap(swapId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Swap offer cancelled.");
        router.refresh();
      }
    });
  }

  return (
    <button
      onClick={handleCancel}
      disabled={isPending}
      style={{
        marginTop: 14, width: "100%",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
        color: "var(--ut-ink-mute)", background: "var(--ut-bg-sunken)", border: "1px solid var(--ut-line)",
        cursor: isPending ? "not-allowed" : "pointer",
        opacity: isPending ? 0.6 : 1,
      }}
    >
      {isPending
        ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Cancelling…</>
        : <><Ban size={13} /> Cancel offer</>
      }
    </button>
  );
}
