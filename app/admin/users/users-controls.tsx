"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useRef } from "react";
import { Search, X } from "lucide-react";

interface Props {
  universities: string[];
  currentQ: string;
  currentUni: string;
  totalCount: number;
  filteredCount: number;
}

export default function UsersControls({
  universities,
  currentQ,
  currentUni,
  totalCount,
  filteredCount,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val) params.set(key, val);
      else params.delete(key);
    }
    startTransition(() => router.replace(`/admin/users?${params.toString()}`));
  }

  function handleSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushParams({ q: value }), 280);
  }

  function setUni(uni: string) {
    pushParams({ uni: currentUni === uni ? "" : uni });
  }

  const hasFilters = currentQ || currentUni;

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search
          size={15}
          style={{
            position: "absolute", left: 14, top: "50%",
            transform: "translateY(-50%)",
            color: isPending ? "var(--ut-primary)" : "var(--ut-ink-mute)",
            pointerEvents: "none", transition: "color 0.15s",
          }}
        />
        <input
          className="ut-input"
          defaultValue={currentQ}
          placeholder="Search email or phone number…"
          onChange={(e) => handleSearch(e.target.value)}
          style={{ paddingLeft: 42, paddingRight: hasFilters ? 40 : 14 }}
        />
        {hasFilters && (
          <button
            onClick={() => {
              pushParams({ q: "", uni: "" });
              // reset the input visually
              const input = document.querySelector<HTMLInputElement>(".ut-admin-search-input");
              if (input) input.value = "";
            }}
            title="Clear filters"
            style={{
              position: "absolute", right: 10, top: "50%",
              transform: "translateY(-50%)",
              width: 24, height: 24, borderRadius: "50%", border: 0,
              background: "var(--ut-bg-sunken)", color: "var(--ut-ink-mute)",
              display: "grid", placeItems: "center", cursor: "pointer",
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* University filter chips */}
      {universities.length > 0 && (
        <div style={{
          display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center",
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: "var(--ut-ink-mute)",
            textTransform: "uppercase", letterSpacing: "0.08em",
            fontFamily: "var(--ut-font-mono)", marginRight: 4, flexShrink: 0,
          }}>
            School
          </span>

          <button
            onClick={() => pushParams({ uni: "" })}
            style={{
              padding: "4px 12px", borderRadius: 999, fontSize: 12.5,
              fontWeight: currentUni ? 500 : 700, cursor: "pointer", border: "1px solid",
              borderColor: currentUni ? "var(--ut-line)" : "var(--ut-ink)",
              background: currentUni ? "transparent" : "var(--ut-ink)",
              color: currentUni ? "var(--ut-ink-soft)" : "white",
              transition: "all 0.12s",
            }}
          >
            All schools
          </button>

          {universities.map((uni) => {
            const active = currentUni === uni;
            return (
              <button
                key={uni}
                onClick={() => setUni(uni)}
                style={{
                  padding: "4px 12px", borderRadius: 999, fontSize: 12.5,
                  fontWeight: active ? 700 : 500, cursor: "pointer", border: "1px solid",
                  borderColor: active ? "var(--ut-primary)" : "var(--ut-line)",
                  background: active ? "var(--ut-primary-tint)" : "transparent",
                  color: active ? "var(--ut-primary-ink)" : "var(--ut-ink-soft)",
                  transition: "all 0.12s",
                  maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
                title={uni}
              >
                {uni}
              </button>
            );
          })}
        </div>
      )}

      {/* Result count when filtering */}
      {hasFilters && (
        <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--ut-ink-mute)" }}>
          {filteredCount === totalCount
            ? `${totalCount} user${totalCount !== 1 ? "s" : ""}`
            : `${filteredCount} of ${totalCount} user${totalCount !== 1 ? "s" : ""} match`}
        </p>
      )}
    </div>
  );
}
