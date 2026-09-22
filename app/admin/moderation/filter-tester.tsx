"use client";

import { useState, useTransition } from "react";
import { FlaskConical } from "lucide-react";
import { adminTestFilter, type FilterTestResult } from "@/app/actions/admin-moderation";

export default function FilterTester() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<FilterTestResult | { error: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function test() {
    if (!text.trim()) return;
    startTransition(async () => setResult(await adminTestFilter(text)));
  }

  return (
    <div style={{
      background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
      borderRadius: "var(--ut-radius)", padding: "16px 18px", marginBottom: 22,
    }}>
      <p style={{
        display: "flex", alignItems: "center", gap: 7, margin: "0 0 4px",
        fontSize: 13.5, fontWeight: 700, color: "var(--ut-ink)",
      }}>
        <FlaskConical size={14} /> Try a message
      </p>
      <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--ut-ink-mute)", lineHeight: 1.5 }}>
        Check a phrase against the live filter before you add a pattern for it. Nothing is sent or saved.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={text}
          onChange={(e) => { setText(e.target.value); setResult(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") test(); }}
          placeholder="Type a message a student might send…"
          style={{
            flex: 1, minWidth: 240, padding: "9px 12px", borderRadius: 8,
            border: "1px solid var(--ut-line)", background: "var(--ut-bg)",
            fontSize: 13, color: "var(--ut-ink)",
          }}
        />
        <button
          onClick={test}
          disabled={isPending || !text.trim()}
          style={{
            padding: "9px 18px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
            background: "var(--ut-primary)", color: "white", border: "none",
            cursor: "pointer", opacity: isPending || !text.trim() ? 0.5 : 1,
          }}
        >
          {isPending ? "Checking…" : "Check"}
        </button>
      </div>

      {result && (
        <div style={{
          marginTop: 12, padding: "10px 13px", borderRadius: 8, fontSize: 12.5, lineHeight: 1.5,
          ...resultStyle(result),
        }}>
          {"error" in result ? result.error
            : result.outcome === "clean" ? "Clean — this message would send normally."
            : result.outcome === "block"
              ? `Blocked as ${result.category.replace("_", " ")}. The sender would see a refusal. Matched: ${result.pattern}`
              : `Flagged as ${result.category.replace("_", " ")}. The message sends, and a report is filed. Matched: ${result.pattern}`}
        </div>
      )}
    </div>
  );
}

function resultStyle(result: FilterTestResult | { error: string }): React.CSSProperties {
  if ("error" in result) return { background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA" };
  if (result.outcome === "clean") return { background: "#ECFDF5", color: "#065F46", border: "1px solid #A7F3D0" };
  if (result.outcome === "block") return { background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA" };
  return { background: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A" };
}
