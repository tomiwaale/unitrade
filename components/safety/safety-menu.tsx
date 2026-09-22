"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MoreVertical, Flag, ShieldOff, ShieldCheck } from "lucide-react";
import ReportDialog from "./report-dialog";
import { blockUser, unblockUser } from "@/app/actions/safety";

interface Props {
  otherUserId: string;
  otherUserName: string;
  /** Blocking from a thread sends the blocker back to the inbox, because the
   *  conversation they are looking at disappears the moment it lands. */
  redirectAfterBlock?: string;
  initiallyBlocked?: boolean;
}

export default function SafetyMenu({
  otherUserId, otherUserName, redirectAfterBlock, initiallyBlocked = false,
}: Props) {
  const [open, setOpen]         = useState(false);
  const [reporting, setReporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [blocked, setBlocked]   = useState(initiallyBlocked);
  const [error, setError]       = useState("");
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function handleBlock() {
    startTransition(async () => {
      const result = await blockUser(otherUserId);
      if ("error" in result) { setError(result.error); return; }
      setBlocked(true);
      setConfirming(false);
      if (redirectAfterBlock) window.location.href = redirectAfterBlock;
    });
  }

  function handleUnblock() {
    startTransition(async () => {
      const result = await unblockUser(otherUserId);
      if ("error" in result) { setError(result.error); return; }
      setBlocked(false);
      setOpen(false);
    });
  }

  return (
    <>
      <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={`Safety options for ${otherUserName}`}
          aria-haspopup="menu"
          aria-expanded={open}
          style={{
            width: 32, height: 32, borderRadius: 8, border: 0,
            background: open ? "var(--ut-bg-sunken)" : "transparent",
            color: "var(--ut-ink-soft)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <MoreVertical size={17} />
        </button>

        {open && (
          <div
            role="menu"
            style={{
              position: "absolute", top: 36, right: 0, zIndex: 20, minWidth: 210,
              background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
              borderRadius: 11, padding: 5, boxShadow: "0 16px 40px -12px rgba(0,0,0,0.28)",
            }}
          >
            <button
              role="menuitem"
              onClick={() => { setOpen(false); setReporting(true); }}
              style={menuItem}
            >
              <Flag size={14} /> Report {otherUserName.split(" ")[0]}
            </button>

            {blocked ? (
              <button role="menuitem" onClick={handleUnblock} disabled={isPending} style={menuItem}>
                <ShieldCheck size={14} /> {isPending ? "Unblocking…" : "Unblock"}
              </button>
            ) : (
              <button
                role="menuitem"
                onClick={() => { setOpen(false); setConfirming(true); }}
                style={{ ...menuItem, color: "var(--ut-danger, #dc2626)" }}
              >
                <ShieldOff size={14} /> Block {otherUserName.split(" ")[0]}
              </button>
            )}
          </div>
        )}
      </div>

      {confirming && (
        <div className="ut-modal-backdrop" onClick={() => setConfirming(false)}>
          <div className="ut-modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 24 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, marginBottom: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "color-mix(in srgb, var(--ut-danger, #dc2626) 12%, transparent)",
              }}>
                <ShieldOff size={19} style={{ color: "var(--ut-danger, #dc2626)" }} />
              </div>
              <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 15.5, color: "var(--ut-ink)" }}>
                Block {otherUserName}?
              </p>
              <ul style={{
                margin: "0 0 18px", paddingLeft: 18, fontSize: 13.5,
                color: "var(--ut-ink-soft)", lineHeight: 1.6,
              }}>
                <li>They can&apos;t message you again.</li>
                <li>Your conversation leaves your inbox.</li>
                <li>They aren&apos;t told that you blocked them.</li>
                <li>You can undo this any time in Settings.</li>
              </ul>
              <p style={{ margin: "0 0 18px", fontSize: 12.5, color: "var(--ut-ink-mute)", lineHeight: 1.5 }}>
                If they broke our rules, report them instead — that way a moderator sees it.
              </p>

              {error && (
                <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--ut-danger, #dc2626)" }}>{error}</p>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setConfirming(false)} disabled={isPending} style={secondaryBtn}>
                  Cancel
                </button>
                <button
                  onClick={() => { setConfirming(false); setReporting(true); }}
                  disabled={isPending}
                  style={secondaryBtn}
                >
                  Report instead
                </button>
                <button onClick={handleBlock} disabled={isPending} style={dangerBtn}>
                  {isPending ? "Blocking…" : "Block"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ReportDialog
        open={reporting}
        onClose={() => setReporting(false)}
        targetType="user"
        targetId={otherUserId}
        subject={otherUserName}
        blockUserId={blocked ? undefined : otherUserId}
        blockUserName={otherUserName}
      />
    </>
  );
}

const menuItem: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 9, width: "100%",
  padding: "9px 10px", borderRadius: 8, border: 0, background: "transparent",
  fontSize: 13.5, fontWeight: 500, color: "var(--ut-ink-soft)",
  cursor: "pointer", textAlign: "left",
};

const secondaryBtn: React.CSSProperties = {
  flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 600,
  background: "var(--ut-bg-card)", color: "var(--ut-ink-soft)",
  border: "1px solid var(--ut-line)", cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 600,
  background: "var(--ut-danger, #dc2626)", color: "white",
  border: "none", cursor: "pointer",
};
