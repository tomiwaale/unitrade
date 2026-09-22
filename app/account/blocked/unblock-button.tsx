"use client";

import { useState, useTransition } from "react";
import { unblockUser } from "@/app/actions/safety";

export default function UnblockButton({ blockedId, name }: { blockedId: string; name: string }) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleUnblock() {
    setError("");
    startTransition(async () => {
      const result = await unblockUser(blockedId);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <div style={{ textAlign: "right" }}>
      <button
        onClick={handleUnblock}
        disabled={isPending}
        aria-label={`Unblock ${name}`}
        style={{
          padding: "7px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
          background: "var(--ut-bg-sunken)", color: "var(--ut-ink-soft)",
          border: "1px solid var(--ut-line)", cursor: isPending ? "default" : "pointer",
          opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? "Unblocking…" : "Unblock"}
      </button>
      {error && (
        <p style={{ margin: "5px 0 0", fontSize: 11.5, color: "var(--ut-danger, #dc2626)" }}>{error}</p>
      )}
    </div>
  );
}
