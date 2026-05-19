"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { adminDeactivateProduct } from "@/app/actions/admin";

export default function DeactivateBtn({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handle = () => {
    startTransition(async () => {
      const result = await adminDeactivateProduct(productId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Product deactivated");
        router.refresh();
      }
    });
  };

  return (
    <button
      onClick={handle}
      disabled={isPending}
      style={{
        padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
        color: "#9B1C1C", background: "#FDEAEA", border: "1.5px solid #FBBABA",
        cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1,
      }}
    >
      {isPending ? "…" : "Deactivate"}
    </button>
  );
}
