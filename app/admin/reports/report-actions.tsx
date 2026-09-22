"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, ShieldOff, ShieldCheck, Check, X, Clock } from "lucide-react";
import {
  adminClaimReport, adminResolveReport, adminHideMessage,
  adminRemoveProduct, adminSetSuspension,
} from "@/app/actions/admin-moderation";

interface Props {
  reportId: string;
  status: string;
  targetType: string;
  targetId: string;
  reportedUserId: string | null;
  reportedUserName: string;
  reportedUserSuspended: boolean;
}

export default function ReportActions({
  reportId, status, targetType, targetId,
  reportedUserId, reportedUserName, reportedUserSuspended,
}: Props) {
  const [resolution, setResolution] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function run(fn: () => Promise<{ success: true } | { error: string }>, okMessage: string) {
    startTransition(async () => {
      const result = await fn();
      if ("error" in result) toast.error(result.error);
      else { toast.success(okMessage); router.refresh(); }
    });
  }

  // Taking content down is a separate decision from closing the report: a
  // moderator often removes the message and then still has to decide whether
  // the account itself goes.
  const takedown = targetType === "message"
    ? { label: "Remove message", run: () => adminHideMessage(targetId, resolution || "Breached community rules") }
    : targetType === "product"
    ? { label: "Take listing down", run: () => adminRemoveProduct(targetId, resolution || "Breached community rules") }
    : null;

  return (
    <div style={{ borderTop: "1px solid var(--ut-line)", paddingTop: 14, marginTop: 4 }}>
      <label
        htmlFor={`resolution-${reportId}`}
        style={{
          display: "block", fontSize: 10.5, fontWeight: 700, marginBottom: 6,
          textTransform: "uppercase", letterSpacing: "0.08em",
          color: "var(--ut-ink-mute)", fontFamily: "var(--ut-font-mono)",
        }}
      >
        Decision note — shown to no one but kept on the record
      </label>
      <textarea
        id={`resolution-${reportId}`}
        value={resolution}
        onChange={(e) => setResolution(e.target.value.slice(0, 2000))}
        rows={2}
        placeholder="What did you find, and what did you do about it?"
        style={{
          width: "100%", padding: "9px 11px", borderRadius: 8, marginBottom: 12,
          border: "1px solid var(--ut-line)", background: "var(--ut-bg)",
          fontSize: 12.5, color: "var(--ut-ink)", resize: "vertical", fontFamily: "inherit",
        }}
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {status === "open" && (
          <button
            onClick={() => run(() => adminClaimReport(reportId), "Marked as reviewing")}
            disabled={isPending}
            style={neutralBtn}
          >
            <Clock size={12} /> Start review
          </button>
        )}

        {takedown && (
          <button
            onClick={() => run(takedown.run, `${takedown.label} — done`)}
            disabled={isPending}
            style={warnBtn}
          >
            <Trash2 size={12} /> {takedown.label}
          </button>
        )}

        {reportedUserId && (
          reportedUserSuspended ? (
            <button
              onClick={() => run(
                () => adminSetSuspension(reportedUserId, false, ""),
                `${reportedUserName} reinstated`,
              )}
              disabled={isPending}
              style={neutralBtn}
            >
              <ShieldCheck size={12} /> Reinstate account
            </button>
          ) : (
            <button
              onClick={() => run(
                () => adminSetSuspension(reportedUserId, true, resolution || "Breached community rules"),
                `${reportedUserName} suspended`,
              )}
              disabled={isPending}
              style={dangerBtn}
            >
              <ShieldOff size={12} /> Suspend account
            </button>
          )
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={() => run(
              () => adminResolveReport(reportId, "dismissed", resolution),
              "Report dismissed",
            )}
            disabled={isPending}
            style={neutralBtn}
          >
            <X size={12} /> Dismiss
          </button>
          <button
            onClick={() => run(
              () => adminResolveReport(reportId, "actioned", resolution),
              "Report closed",
            )}
            disabled={isPending}
            style={primaryBtn}
          >
            <Check size={12} /> Close as actioned
          </button>
        </div>
      </div>
    </div>
  );
}

const base: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
  cursor: "pointer", border: "1px solid transparent",
};

const neutralBtn: React.CSSProperties = {
  ...base, background: "var(--ut-bg-card)", color: "var(--ut-ink-soft)",
  borderColor: "var(--ut-line)",
};

const warnBtn: React.CSSProperties = {
  ...base, background: "#FFFBEB", color: "#92400E", borderColor: "#FDE68A",
};

const dangerBtn: React.CSSProperties = {
  ...base, background: "#FEF2F2", color: "#991B1B", borderColor: "#FECACA",
};

const primaryBtn: React.CSSProperties = {
  ...base, background: "var(--ut-primary)", color: "white",
};
