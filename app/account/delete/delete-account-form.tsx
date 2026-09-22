"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteAccount } from "@/app/actions/account";

export default function DeleteAccountForm() {
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const canDelete = confirmText.trim().toUpperCase() === "DELETE";

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAccount();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Your account has been deleted.");
      router.push("/");
    });
  }

  return (
    <div>
      <input
        className="ut-input"
        placeholder="Type DELETE to confirm"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        disabled={isPending}
        autoComplete="off"
      />
      <button
        className="ut-cta"
        style={{ width: "100%", justifyContent: "center", marginTop: 14, background: "#9B1C1C" }}
        disabled={!canDelete || isPending}
        onClick={handleDelete}
      >
        {isPending ? "Deleting your account…" : "Permanently delete my account"}
      </button>
    </div>
  );
}
