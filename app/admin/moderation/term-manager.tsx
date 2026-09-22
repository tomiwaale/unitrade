"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Ban, Flag } from "lucide-react";
import {
  adminSaveModerationTerm, adminToggleModerationTerm, adminDeleteModerationTerm,
} from "@/app/actions/admin-moderation";

interface Term {
  id: string;
  pattern: string;
  category: string;
  action: "block" | "flag" | string;
  match_normalized: boolean;
  note: string | null;
  is_active: boolean;
}

const CATEGORIES = [
  "harassment", "sexual_content", "violence", "hate_speech",
  "scam", "spam", "prohibited_item", "impersonation", "other",
];

function categoryLabel(c: string) {
  return c.replace(/_/g, " ").replace(/^\w/, (m) => m.toUpperCase());
}

export default function TermManager({ terms }: { terms: Term[] }) {
  const [adding, setAdding] = useState(false);
  const [pattern, setPattern] = useState("");
  const [category, setCategory] = useState("harassment");
  const [action, setAction] = useState<"block" | "flag">("flag");
  const [matchNormalized, setMatchNormalized] = useState(true);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function run(fn: () => Promise<{ success: true } | { error: string }>, ok: string, after?: () => void) {
    startTransition(async () => {
      const result = await fn();
      if ("error" in result) toast.error(result.error);
      else { toast.success(ok); after?.(); router.refresh(); }
    });
  }

  function save() {
    if (!pattern.trim()) { toast.error("A pattern is required."); return; }
    run(
      () => adminSaveModerationTerm({ pattern, category, action, matchNormalized, note }),
      "Term added",
      () => { setPattern(""); setNote(""); setAdding(false); },
    );
  }

  const grouped = CATEGORIES
    .map((c) => ({ category: c, items: terms.filter((t) => t.category === c) }))
    .filter((g) => g.items.length > 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--ut-ink)" }}>
          Patterns <span style={{ color: "var(--ut-ink-mute)", fontWeight: 500 }}>({terms.length})</span>
        </h2>
        <button
          onClick={() => setAdding((v) => !v)}
          style={{
            marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
            background: "var(--ut-primary)", color: "white", border: "none", cursor: "pointer",
          }}
        >
          <Plus size={13} /> Add pattern
        </button>
      </div>

      {adding && (
        <div style={{
          background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
          borderRadius: "var(--ut-radius)", padding: "16px 18px", marginBottom: 18,
        }}>
          <label style={label} htmlFor="new-pattern">Pattern (regular expression)</label>
          <input
            id="new-pattern"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="sendme(your)?nudes"
            style={{ ...input, fontFamily: "var(--ut-font-mono)", marginBottom: 12 }}
          />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={label} htmlFor="new-category">Category</label>
              <select id="new-category" value={category} onChange={(e) => setCategory(e.target.value)} style={input}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
              </select>
            </div>
            <div>
              <label style={label} htmlFor="new-action">What it does</label>
              <select
                id="new-action"
                value={action}
                onChange={(e) => setAction(e.target.value as "block" | "flag")}
                style={input}
              >
                <option value="flag">Flag — send it, file a report</option>
                <option value="block">Block — refuse the message</option>
              </select>
            </div>
          </div>

          <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 12, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={matchNormalized}
              onChange={(e) => setMatchNormalized(e.target.checked)}
              style={{ marginTop: 3, accentColor: "var(--ut-primary)" }}
            />
            <span>
              <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ut-ink)" }}>
                Match de-obfuscated text
              </span>
              <span style={{ display: "block", fontSize: 12, color: "var(--ut-ink-mute)", marginTop: 2, lineHeight: 1.45 }}>
                Folds &ldquo;s3nd m3 nud3s&rdquo; to &ldquo;sendmenudes&rdquo; first, so your pattern must have no
                spaces or punctuation. Turn this off for short words — matching without spaces makes
                a four-letter pattern hit across a word break.
              </span>
            </span>
          </label>

          <label style={label} htmlFor="new-note">Note (optional)</label>
          <input
            id="new-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why this is on the list"
            style={{ ...input, marginBottom: 14 }}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setAdding(false)} disabled={isPending} style={neutralBtn}>Cancel</button>
            <button onClick={save} disabled={isPending} style={primaryBtn}>
              {isPending ? "Saving…" : "Add pattern"}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {grouped.map((group) => (
          <div key={group.category}>
            <p style={{
              margin: "0 0 8px", fontSize: 10.5, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.08em",
              color: "var(--ut-ink-mute)", fontFamily: "var(--ut-font-mono)",
            }}>
              {categoryLabel(group.category)}
            </p>
            <div style={{
              background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
              borderRadius: "var(--ut-radius)", overflow: "hidden",
            }}>
              {group.items.map((term, i) => (
                <div
                  key={term.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "11px 16px",
                    borderTop: i === 0 ? "none" : "1px solid var(--ut-line)",
                    opacity: term.is_active ? 1 : 0.5,
                  }}
                >
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                    flexShrink: 0,
                    ...(term.action === "block"
                      ? { color: "#991B1B", background: "#FEF2F2" }
                      : { color: "#92400E", background: "#FFFBEB" }),
                  }}>
                    {term.action === "block" ? <Ban size={10} /> : <Flag size={10} />}
                    {term.action === "block" ? "Block" : "Flag"}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <code style={{
                      fontSize: 12.5, color: "var(--ut-ink)", fontFamily: "var(--ut-font-mono)",
                      wordBreak: "break-all",
                    }}>
                      {term.pattern}
                    </code>
                    <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--ut-ink-mute)" }}>
                      {term.match_normalized ? "de-obfuscated match" : "word-boundary match"}
                      {term.note ? ` · ${term.note}` : ""}
                    </p>
                  </div>

                  <button
                    onClick={() => run(
                      () => adminToggleModerationTerm(term.id, !term.is_active),
                      term.is_active ? "Pattern paused" : "Pattern active",
                    )}
                    disabled={isPending}
                    style={{ ...neutralBtn, padding: "5px 11px", fontSize: 11.5 }}
                  >
                    {term.is_active ? "Pause" : "Enable"}
                  </button>
                  <button
                    onClick={() => run(() => adminDeleteModerationTerm(term.id), "Pattern deleted")}
                    disabled={isPending}
                    aria-label={`Delete pattern ${term.pattern}`}
                    style={{
                      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                      display: "grid", placeItems: "center", cursor: "pointer",
                      background: "transparent", border: "1px solid var(--ut-line)",
                      color: "var(--ut-danger, #dc2626)",
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const label: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "var(--ut-ink)", marginBottom: 6,
};

const input: React.CSSProperties = {
  width: "100%", padding: "9px 11px", borderRadius: 8,
  border: "1px solid var(--ut-line)", background: "var(--ut-bg)",
  fontSize: 13, color: "var(--ut-ink)",
};

const neutralBtn: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
  background: "var(--ut-bg)", color: "var(--ut-ink-soft)",
  border: "1px solid var(--ut-line)", cursor: "pointer",
};

const primaryBtn: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
  background: "var(--ut-primary)", color: "white", border: "none", cursor: "pointer",
};
