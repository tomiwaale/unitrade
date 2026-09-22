"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import ReportDialog from "./report-dialog";
import type { ReportTargetType } from "@/lib/safety";

interface Props {
  targetType: ReportTargetType;
  targetId: string;
  subject: string;
  label?: string;
  /** Offers "also block" inside the dialog when the content has an author. */
  blockUserId?: string;
  blockUserName?: string;
}

export default function ReportButton({
  targetType, targetId, subject, label, blockUserId, blockUserName,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: 0, border: 0, background: "transparent", cursor: "pointer",
          fontSize: 12.5, color: "var(--ut-ink-mute)", textDecoration: "underline",
          textUnderlineOffset: 3,
        }}
      >
        <Flag size={12} /> {label ?? "Report this listing"}
      </button>

      <ReportDialog
        open={open}
        onClose={() => setOpen(false)}
        targetType={targetType}
        targetId={targetId}
        subject={subject}
        blockUserId={blockUserId}
        blockUserName={blockUserName}
      />
    </>
  );
}
