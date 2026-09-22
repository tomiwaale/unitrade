"use client";

import { useState, useTransition } from "react";
import { Flag, Check, ShieldOff } from "lucide-react";
import { REPORT_REASONS, type ReportTargetType } from "@/lib/safety";
import { submitReport, reportAndBlock } from "@/app/actions/safety";

interface Props {
  open: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  /** What the user thinks they are reporting: a person's name, a listing title. */
  subject: string;
  /**
   * When set, the dialog offers "also block this person" and handles the
   * ordering — blocking hides the conversation, so the report has to be filed
   * first or it loses the thread it refers to.
   */
  blockUserId?: string;
  blockUserName?: string;
}

export default function ReportDialog({
  open, onClose, targetType, targetId, subject, blockUserId, blockUserName,
}: Props) {
  const [reason, setReason]   = useState<string>("");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [error, setError]     = useState("");
  const [done, setDone]       = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  function close() {
    onClose();
    // Reset after the dialog is gone so the user does not watch it clear.
    setTimeout(() => {
      setReason(""); setDetails(""); setAlsoBlock(false);
      setError(""); setDone(false);
    }, 200);
  }

  function handleSubmit() {
    if (!reason) { setError("Pick a reason so we know what to look for."); return; }
    setError("");

    startTransition(async () => {
      const input = { targetType, targetId, reason, details };
      const result = alsoBlock && blockUserId
        ? await reportAndBlock({ ...input, blockUserId })
        : await submitReport(input);

      if ("error" in result) { setError(result.error); return; }
      setDone(true);
    });
  }

  return (
    <div className="ut-modal-backdrop" onClick={close}>
      <div className="ut-modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div style={{ padding: 28, textAlign: "center" }}>
            <div style={{
              width: 44, height: 44, borderRadius: 999, margin: "0 auto 14px",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "color-mix(in srgb, var(--ut-primary) 14%, transparent)",
            }}>
              <Check size={22} style={{ color: "var(--ut-primary)" }} />
            </div>
            <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 15.5, color: "var(--ut-ink)" }}>
              Report received
            </p>
            <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "var(--ut-ink-soft)", lineHeight: 1.55 }}>
              Our moderators review every report within 24 hours. We&apos;ll email you if we need
              anything else from you.
              {alsoBlock && blockUserName ? ` ${blockUserName} can no longer message you.` : ""}
            </p>
            <button onClick={close} style={primaryBtn}>Done</button>
          </div>
        ) : (
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Flag size={17} style={{ color: "var(--ut-ink-soft)" }} />
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15.5, color: "var(--ut-ink)" }}>
                Report {targetType === "user" ? "this person" : `this ${targetType}`}
              </p>
            </div>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--ut-ink-mute)", lineHeight: 1.5 }}>
              {subject}
            </p>

            <fieldset style={{ border: 0, padding: 0, margin: "0 0 16px" }}>
              <legend style={labelStyle}>What&apos;s wrong?</legend>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r.value}
                    style={{
                      display: "flex", gap: 10, alignItems: "flex-start",
                      padding: "9px 10px", borderRadius: 9, cursor: "pointer",
                      background: reason === r.value ? "var(--ut-primary-tint)" : "transparent",
                    }}
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      style={{ marginTop: 3, accentColor: "var(--ut-primary)" }}
                    />
                    <span>
                      <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--ut-ink)" }}>
                        {r.label}
                      </span>
                      <span style={{ display: "block", fontSize: 12, color: "var(--ut-ink-mute)", marginTop: 1 }}>
                        {r.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label style={labelStyle} htmlFor="report-details">
              Anything else we should know? <span style={{ fontWeight: 400, color: "var(--ut-ink-mute)" }}>(optional)</span>
            </label>
            <textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 2000))}
              rows={3}
              placeholder="Tell us what happened."
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 9,
                border: "1px solid var(--ut-line)", background: "var(--ut-bg-card)",
                fontSize: 13.5, color: "var(--ut-ink)", resize: "vertical",
                fontFamily: "inherit", marginBottom: 14,
              }}
            />

            {blockUserId && (
              <label style={{
                display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer",
                padding: "11px 12px", borderRadius: 9, marginBottom: 16,
                background: "var(--ut-bg-sunken)", border: "1px solid var(--ut-line)",
              }}>
                <input
                  type="checkbox"
                  checked={alsoBlock}
                  onChange={(e) => setAlsoBlock(e.target.checked)}
                  style={{ marginTop: 2, accentColor: "var(--ut-primary)" }}
                />
                <span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: "var(--ut-ink)" }}>
                    <ShieldOff size={13} /> Also block {blockUserName ?? "this person"}
                  </span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--ut-ink-mute)", marginTop: 2, lineHeight: 1.45 }}>
                    They won&apos;t be able to message you, and their conversation leaves your inbox.
                    You can undo this in Settings.
                  </span>
                </span>
              </label>
            )}

            {error && (
              <p style={{
                margin: "0 0 12px", fontSize: 12.5, color: "var(--ut-danger, #dc2626)",
                background: "color-mix(in srgb, var(--ut-danger, #dc2626) 8%, transparent)",
                padding: "9px 11px", borderRadius: 8,
              }}>
                {error}
              </p>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={close} disabled={isPending} style={secondaryBtn}>Cancel</button>
              <button onClick={handleSubmit} disabled={isPending} style={primaryBtn}>
                {isPending ? "Sending…" : "Submit report"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12.5, fontWeight: 600,
  color: "var(--ut-ink)", marginBottom: 8, padding: 0,
};

const primaryBtn: React.CSSProperties = {
  flex: 1, padding: "11px 0", borderRadius: 10, fontSize: 13.5, fontWeight: 600,
  background: "var(--ut-primary)", color: "white", border: "none", cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  flex: 1, padding: "11px 0", borderRadius: 10, fontSize: 13.5, fontWeight: 600,
  background: "var(--ut-bg-card)", color: "var(--ut-ink-soft)",
  border: "1px solid var(--ut-line)", cursor: "pointer",
};
