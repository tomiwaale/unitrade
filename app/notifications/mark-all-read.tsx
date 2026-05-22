"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function MarkAllRead({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleMarkAll = () => {
    startTransition(async () => {
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);
      router.refresh();
    });
  };

  return (
    <button
      onClick={handleMarkAll}
      disabled={isPending}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "7px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600,
        background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
        color: "var(--ut-ink-soft)", cursor: isPending ? "not-allowed" : "pointer",
        opacity: isPending ? 0.6 : 1,
      }}
    >
      <CheckCircle2 size={14} />
      {isPending ? "Marking…" : "Mark all read"}
    </button>
  );
}
