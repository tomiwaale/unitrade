"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmOrderReceived } from "@/app/actions/confirm-order";
import { disputeOrder } from "@/app/actions/dispute-order";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

export default function OrderActions({
  orderId,
  sellerPayout,
}: {
  orderId: string;
  sellerPayout: string;
}) {
  const router = useRouter();
  const [confirmPending, startConfirm] = useTransition();
  const [disputePending, startDispute] = useTransition();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);

  function handleConfirm() {
    startConfirm(async () => {
      const result = await confirmOrderReceived(orderId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Receipt confirmed! Payment released to seller.");
        router.refresh();
      }
      setShowConfirmDialog(false);
    });
  }

  function handleDispute() {
    startDispute(async () => {
      const result = await disputeOrder(orderId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Dispute filed. We'll review and contact you shortly.");
        router.refresh();
      }
      setShowDisputeDialog(false);
    });
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => setShowConfirmDialog(true)}
          className="ut-cta ut-cta-primary"
          style={{ justifyContent: "center", padding: "14px 16px", fontSize: 14, borderRadius: 12 }}
        >
          <CheckCircle2 size={15} />
          I received this
        </button>

        <button
          onClick={() => setShowDisputeDialog(true)}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "14px 16px", borderRadius: 12, fontSize: 14, fontWeight: 600,
            color: "#9B1C1C", background: "#FDEAEA",
            border: "1.5px solid #FBBABA", cursor: "pointer",
          }}
        >
          <AlertTriangle size={15} />
          Report a problem
        </button>
      </div>

      {showConfirmDialog && (
        <ConfirmDialog
          title="Confirm you received this item"
          description={`This will immediately release ₦${sellerPayout} to the seller. Only confirm if you have physically received the item in good condition. This cannot be undone.`}
          confirmLabel="Yes, I received it"
          confirmStyle={{ background: "var(--ut-primary)" }}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirmDialog(false)}
          isPending={confirmPending}
        />
      )}

      {showDisputeDialog && (
        <ConfirmDialog
          title="Report a problem with this order"
          description="This will freeze the payment and notify CampSwap to review your case. Use this only if you did not receive the item or it was significantly different from the listing."
          confirmLabel="File Dispute"
          confirmStyle={{ background: "#9B1C1C" }}
          onConfirm={handleDispute}
          onCancel={() => setShowDisputeDialog(false)}
          isPending={disputePending}
        />
      )}
    </>
  );
}

function ConfirmDialog({
  title, description, confirmLabel, confirmStyle, onConfirm, onCancel, isPending,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  confirmStyle: React.CSSProperties;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      background: "rgba(0,0,0,0.4)",
    }}>
      <div style={{
        width: "100%", maxWidth: 380, borderRadius: 20, padding: 24,
        background: "var(--ut-bg-card)", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 15, color: "var(--ut-ink)" }}>
          {title}
        </p>
        <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "var(--ut-ink-soft)", lineHeight: 1.5 }}>
          {description}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={isPending}
            style={{
              flex: 1, padding: "11px 0", borderRadius: 10, fontSize: 13.5, fontWeight: 600,
              background: "var(--ut-bg-sunken)", color: "var(--ut-ink-soft)", border: "none", cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            style={{
              flex: 1, padding: "11px 0", borderRadius: 10, fontSize: 13.5, fontWeight: 600,
              color: "white", border: "none", cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.7 : 1,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
              ...confirmStyle,
            }}
          >
            {isPending ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
