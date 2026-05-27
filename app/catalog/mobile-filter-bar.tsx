"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, ArrowLeftRight, ChevronDown, X, MapPin } from "lucide-react";

type Params = Record<string, string | null>;

interface Props {
  baseParams: Params;
  sortFilter: string;
  maxPrice: number | null;
  todayOnly: boolean;
  conditionFilter: string | null;
  openToFilter: string | null;
  universityFilter: string | null;
  userUniversity: string | null;
  schoolCount: number;
}

function buildHref(base: Params, overrides: Params): string {
  const params = new URLSearchParams();
  const merged = { ...base, ...overrides };
  for (const [k, v] of Object.entries(merged)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return `/catalog${qs ? `?${qs}` : ""}`;
}

const CONDITION_LABEL: Record<string, string> = {
  "new": "New", "like-new": "Like New", "good": "Good", "fair": "Fair", "poor": "Poor",
};
const CONDITION_COLOR: Record<string, string> = {
  "new": "#16803c", "like-new": "#15803d", "good": "#1d4ed8", "fair": "#b45309", "poor": "#b91c1c",
};
const DEAL_LABEL: Record<string, string> = {
  "cash-only": "Cash only", "cash-or-swap": "Cash or Swap", "swap-only": "Swap only",
};

type SortKey = "recent" | "price-asc" | "price-desc" | "max_price_5000" | "today";

const SORT_OPTS: { label: string; key: SortKey }[] = [
  { label: "Recently posted", key: "recent" },
  { label: "Under ₦5k",        key: "max_price_5000" },
  { label: "Posted today",     key: "today" },
  { label: "Price: Low → High", key: "price-asc" },
  { label: "Price: High → Low", key: "price-desc" },
];

function deriveSortKey(sortFilter: string, maxPrice: number | null, todayOnly: boolean): SortKey {
  if (maxPrice)                    return "max_price_5000";
  if (todayOnly)                   return "today";
  if (sortFilter === "price-asc")  return "price-asc";
  if (sortFilter === "price-desc") return "price-desc";
  return "recent";
}

export function MobileFilterBar({
  baseParams, sortFilter, maxPrice, todayOnly, conditionFilter, openToFilter,
  universityFilter, userUniversity, schoolCount,
}: Props) {
  const router = useRouter();
  const sortKey = deriveSortKey(sortFilter, maxPrice, todayOnly);

  const [open, setOpen]   = useState(false);
  const [pSort, setPSort] = useState<SortKey>(sortKey);
  const [pCond, setPCond] = useState(conditionFilter);
  const [pDeal, setPDeal] = useState(openToFilter);

  // Lock body scroll while sheet is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Count active filter badges (sort doesn't count — it's always set to something)
  const filterCount =
    [conditionFilter, openToFilter].filter(Boolean).length +
    (maxPrice ? 1 : 0) +
    (todayOnly ? 1 : 0);

  const sortLabel = SORT_OPTS.find(o => o.key === sortKey)?.label ?? "Recently posted";
  const hasActive = !!(conditionFilter || openToFilter || maxPrice || todayOnly || universityFilter || userUniversity);

  function openSheet() {
    // Reset pending state to current URL values each time sheet opens
    setPSort(sortKey);
    setPCond(conditionFilter);
    setPDeal(openToFilter);
    setOpen(true);
  }

  function applyFilters() {
    const so: Params = { sort: null, max_price: null, today: null };
    if (pSort === "max_price_5000") so.max_price = "5000";
    else if (pSort === "today")     so.today = "1";
    else if (pSort !== "recent")    so.sort = pSort;
    router.push(buildHref(baseParams, { ...so, condition: pCond, open_to: pDeal }));
    setOpen(false);
  }

  function clearAll() {
    setPSort("recent");
    setPCond(null);
    setPDeal(null);
  }

  return (
    <>
      {/* ── Compact bar (mobile only via CSS) ── */}
      <div className="ut-mfb-wrap">

        <div className="ut-mfb-row">
          {/* Sort button — shows current sort label */}
          <button className="ut-mfb-sort" onClick={openSheet}>
            <span className="ut-mfb-sort-label">{sortLabel}</span>
            <ChevronDown size={13} />
          </button>

          {/* Filter button — shows active filter count */}
          <button className="ut-mfb-filter" onClick={openSheet}>
            <SlidersHorizontal size={13} />
            Filter
            {filterCount > 0 && <span className="ut-mfb-badge">{filterCount}</span>}
          </button>
        </div>

        {/* Active filter chips — dismissible, scrolls horizontally */}
        {hasActive && (
          <div className="ut-mfb-active">
            {sortKey !== "recent" && (
              <Link
                href={buildHref(baseParams, { sort: null, max_price: null, today: null })}
                className="ut-mfb-chip"
              >
                {sortLabel} <X size={10} />
              </Link>
            )}
            {conditionFilter && (
              <Link href={buildHref(baseParams, { condition: null })} className="ut-mfb-chip">
                {CONDITION_LABEL[conditionFilter] ?? conditionFilter} <X size={10} />
              </Link>
            )}
            {openToFilter && (
              <Link href={buildHref(baseParams, { open_to: null })} className="ut-mfb-chip">
                {openToFilter !== "cash-only" && <ArrowLeftRight size={10} />}
                {DEAL_LABEL[openToFilter] ?? openToFilter} <X size={10} />
              </Link>
            )}
            {universityFilter && (
              <Link href={buildHref(baseParams, { university: null })} className="ut-mfb-chip">
                <MapPin size={10} />
                {universityFilter.length > 22 ? universityFilter.slice(0, 22) + "…" : universityFilter}
                <X size={10} />
              </Link>
            )}
            {userUniversity && !universityFilter && (
              <Link
                href={buildHref(baseParams, { university: userUniversity })}
                className="ut-mfb-chip"
                style={{
                  background: "color-mix(in srgb, var(--ut-primary) 10%, transparent)",
                  color: "var(--ut-primary-ink)",
                  borderColor: "color-mix(in srgb, var(--ut-primary) 22%, transparent)",
                }}
              >
                <MapPin size={10} />
                {userUniversity.length > 20 ? userUniversity.slice(0, 20) + "…" : userUniversity} first
                {schoolCount > 0 && <span style={{ opacity: 0.7 }}>· {schoolCount}</span>}
              </Link>
            )}
          </div>
        )}

      </div>

      {/* ── Bottom sheet (fixed, outside mfb-wrap so display:none doesn't trap it) ── */}
      {open && (
        <>
          <div className="ut-sheet-backdrop" onClick={() => setOpen(false)} />

          <div className="ut-sheet">
            <div className="ut-sheet-handle" />

            <div className="ut-sheet-scroll">

              {/* Sort */}
              <div className="ut-sheet-sec">
                <p className="ut-sheet-label">Sort</p>
                <div className="ut-sheet-opts">
                  {SORT_OPTS.map(opt => (
                    <button
                      key={opt.key}
                      className="ut-sheet-opt"
                      data-active={pSort === opt.key ? "true" : "false"}
                      onClick={() => setPSort(opt.key)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition */}
              <div className="ut-sheet-sec">
                <p className="ut-sheet-label">Condition</p>
                <div className="ut-sheet-opts">
                  {(["new", "like-new", "good", "fair", "poor"] as const).map(val => (
                    <button
                      key={val}
                      className="ut-sheet-opt"
                      data-active={pCond === val ? "true" : "false"}
                      onClick={() => setPCond(pCond === val ? null : val)}
                      style={pCond === val ? {
                        background: `color-mix(in srgb, ${CONDITION_COLOR[val]} 15%, transparent)`,
                        color: CONDITION_COLOR[val],
                        borderColor: `color-mix(in srgb, ${CONDITION_COLOR[val]} 35%, transparent)`,
                      } : {}}
                    >
                      {CONDITION_LABEL[val]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deal type */}
              <div className="ut-sheet-sec">
                <p className="ut-sheet-label">Deal type</p>
                <div className="ut-sheet-opts">
                  {(["cash-only", "cash-or-swap", "swap-only"] as const).map(val => (
                    <button
                      key={val}
                      className="ut-sheet-opt"
                      data-active={pDeal === val ? "true" : "false"}
                      onClick={() => setPDeal(pDeal === val ? null : val)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      {val !== "cash-only" && <ArrowLeftRight size={11} />}
                      {DEAL_LABEL[val]}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div className="ut-sheet-footer">
              <button className="ut-sheet-clear" onClick={clearAll}>
                Clear all
              </button>
              <button className="ut-cta ut-cta-primary ut-sheet-apply" onClick={applyFilters}>
                Apply filters
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
