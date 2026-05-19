"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteProduct } from "@/app/actions/product";

export default function DeleteListingBtn({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handle = () => {
    if (!confirm("Delete this listing? This can't be undone.")) return;

    startTransition(async () => {
      const result = await deleteProduct(productId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Listing deleted");
        router.refresh();
      }
    });
  };

  return (
    <button
      onClick={handle}
      disabled={isPending}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "5px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500,
        color: "#9B1C1C", background: "transparent",
        border: "1px solid #FBBABA", cursor: isPending ? "not-allowed" : "pointer",
        opacity: isPending ? 0.6 : 1,
      }}
    >
      <Trash2 size={11} />
      {isPending ? "…" : "Delete"}
    </button>
  );
}
