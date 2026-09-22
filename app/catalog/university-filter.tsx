"use client";

import { useRouter } from "next/navigation";
import { NIGERIAN_UNIVERSITIES } from "@/lib/nigerian-universities";

type Params = Record<string, string | null>;

function buildHref(base: Params, overrides: Params): string {
  const params = new URLSearchParams();
  const merged = { ...base, ...overrides };
  for (const [k, v] of Object.entries(merged)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return `/catalog${qs ? `?${qs}` : ""}`;
}

interface Props {
  baseParams: Params;
  universityFilter: string | null;
}

export function UniversityFilterSelect({ baseParams, universityFilter }: Props) {
  const router = useRouter();

  return (
    <select
      className="ut-chip ut-chip-select"
      data-active={universityFilter ? "true" : "false"}
      value={universityFilter ?? ""}
      onChange={(e) => router.push(buildHref(baseParams, { university: e.target.value || null }))}
      aria-label="Filter by university"
    >
      <option value="">All universities</option>
      {NIGERIAN_UNIVERSITIES.map((u) => (
        <option key={u} value={u}>{u}</option>
      ))}
    </select>
  );
}
