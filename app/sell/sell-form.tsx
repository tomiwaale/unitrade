"use client";

import { useTransition, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/app/actions/product";
import { toast } from "sonner";
import { Check, MapPin, ArrowLeftRight, Shield, FileText, X, Info, TrendingUp, AlertTriangle } from "lucide-react";
import ImageUploader from "@/components/image-uploader";
import { NIGERIAN_UNIVERSITIES } from "@/lib/nigerian-universities";
import { priceGuidance, type PriceGuidance, type PriceStat, type PriceTone } from "@/lib/price-stats";

const CATEGORIES = [
  { label: "Textbooks",   value: "textbooks" },
  { label: "Electronics", value: "electronics" },
  { label: "Clothing",    value: "clothing" },
  { label: "Furniture",   value: "furniture" },
  { label: "Services",    value: "services" },
  { label: "Other",       value: "other" },
];

const CONDITIONS = [
  { label: "New",      value: "new" },
  { label: "Like New", value: "like-new" },
  { label: "Good",     value: "good" },
  { label: "Fair",     value: "fair" },
  { label: "Poor",     value: "poor" },
];

const OPEN_TO_OPTIONS = [
  { label: "Cash only",    value: "cash-only" },
  { label: "Cash or swap", value: "cash-or-swap" },
  { label: "Swap only",    value: "swap-only" },
] as const;

type OpenTo = "cash-only" | "cash-or-swap" | "swap-only";

interface Props {
  defaultLocation: string;
  sellerName: string;
  /** Empty until a bucket clears the sample floor in price_stats — the nudge
   *  simply does not render, rather than guessing at a market. */
  priceStats: PriceStat[];
}

// ── Draft persistence ─────────────────────────────────────────────────────────

const DRAFT_KEY = "ut_sell_draft";

type DraftData = {
  title: string;
  price: string;
  category: string;
  condition: string;
  openTo: string;
  location: string;
  description: string;
  imageUrls: string[];
  // Optional: drafts saved before offers existed have no value here.
  allowOffers?: boolean;
};

function readDraft(): DraftData | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as DraftData) : null;
  } catch {
    return null;
  }
}

function writeDraft(data: DraftData) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {}
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SellForm({ defaultLocation, sellerName, priceStats }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("good");
  const [openTo, setOpenTo] = useState<OpenTo>("cash-or-swap");
  // Default on, matching the column default (033_price_offers.sql). A seller
  // who wants their price treated as firm turns it off here.
  const [allowOffers, setAllowOffers] = useState(true);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState(defaultLocation);
  const [description, setDescription] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [draftRestored, setDraftRestored] = useState(false);
  // Separate state to pass as defaultValues to ImageUploader; changing imgKey remounts it
  const [draftImageUrls, setDraftImageUrls] = useState<string[]>([]);
  const [imgKey, setImgKey] = useState(0);

  // Restore draft on mount
  useEffect(() => {
    const draft = readDraft();
    if (!draft) return;
    if (draft.title) setTitle(draft.title);
    if (draft.price) setPrice(draft.price);
    if (draft.category) setCategory(draft.category);
    if (draft.condition) setCondition(draft.condition);
    if (draft.openTo) setOpenTo(draft.openTo as OpenTo);
    if (typeof draft.allowOffers === "boolean") setAllowOffers(draft.allowOffers);
    if (draft.location) setLocation(draft.location);
    if (draft.description) setDescription(draft.description);
    if (draft.imageUrls?.length) {
      setDraftImageUrls(draft.imageUrls);
      setImgKey((k) => k + 1); // remount ImageUploader so defaultValues takes effect
    }
    setDraftRestored(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save on change (debounced 800 ms) — only when form has some content
  const autoSaveTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    clearTimeout(autoSaveTimer.current);
    if (!title && !price && !category && !description) return;
    autoSaveTimer.current = window.setTimeout(() => {
      writeDraft({ title, price, category, condition, openTo, location, description, imageUrls, allowOffers });
    }, 800);
    return () => clearTimeout(autoSaveTimer.current);
  }, [title, price, category, condition, openTo, location, description, imageUrls, allowOffers]);

  // Settle before judging: typing "8000" passes through 8, 80 and 800, and a
  // nudge that flashes "1,125x the typical price" mid-keystroke reads as broken.
  const [settledPrice, setSettledPrice] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setSettledPrice(price), 400);
    return () => clearTimeout(t);
  }, [price]);

  // Falls back to the raw column value so a legacy category still reads sanely.
  const categoryLabel =
    CATEGORIES.find((c) => c.value === category)?.label ??
    (category ? category[0].toUpperCase() + category.slice(1) : "");
  const guidance = priceGuidance(
    priceStats,
    category,
    condition,
    settledPrice ? Number(settledPrice) : null,
    categoryLabel,
  );

  const previewImageUrl = imageUrls[0] ?? "";

  const initials = sellerName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "U";

  const displayName = sellerName
    ? sellerName.split(" ").filter(Boolean).slice(0, 2)
        .map((w, i) => (i === 1 ? w[0] + "." : w)).join(" ")
    : "You";

  const showSwap = openTo !== "cash-only";

  function handleSaveDraft() {
    writeDraft({ title, price, category, condition, openTo, location, description, imageUrls, allowOffers });
    toast.success("Draft saved — come back any time to finish your listing");
  }

  function handleDiscardDraft() {
    clearDraft();
    setTitle("");
    setPrice("");
    setCategory("");
    setCondition("good");
    setOpenTo("cash-or-swap");
    setAllowOffers(true);
    setLocation(defaultLocation);
    setDescription("");
    setDraftImageUrls([]);
    setImgKey((k) => k + 1);
    setDraftRestored(false);
  }

  async function action(formData: FormData) {
    startTransition(async () => {
      // Cancel any pending auto-save before clearing so the timer can't re-write after us
      clearTimeout(autoSaveTimer.current);
      clearDraft();
      const result = await createProduct(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Listing published!");
        router.push("/listings");
      }
    });
  }

  return (
    <>
      <div className="ut-section-head" style={{ marginTop: 0 }}>
        <div>
          <span className="ut-sub">New listing</span>
          <h2>Post something for sale or swap</h2>
        </div>
      </div>

      {/* Draft restored banner */}
      {draftRestored && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", marginBottom: 20,
          background: "var(--ut-primary-tint)",
          border: "1px solid color-mix(in srgb, var(--ut-primary) 25%, transparent)",
          borderRadius: "var(--ut-radius)", fontSize: 13.5,
          color: "var(--ut-primary-ink)",
        }}>
          <FileText size={15} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>Draft restored — pick up where you left off.</span>
          <button
            type="button"
            onClick={handleDiscardDraft}
            title="Discard draft"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--ut-primary-ink)", opacity: 0.6, padding: 2, display: "flex",
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      <div className="ut-sell-layout">
        {/* ── Form ── */}
        <form action={action}>
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="condition" value={condition} />
          <input type="hidden" name="open_to" value={openTo} />
          <input type="hidden" name="allow_offers" value={allowOffers ? "true" : "false"} />

          <div className="ut-form-grid">
            {/* Photo upload */}
            <div className="ut-form-field full">
              <ImageUploader
                key={imgKey}
                max={6}
                defaultValues={draftImageUrls}
                onChange={setImageUrls}
              />
            </div>

            {/* Title */}
            <div className="ut-form-field full">
              <label className="ut-field-label">Item title</label>
              <input
                name="title"
                className="ut-input"
                placeholder="e.g. Hostel mini-fridge — barely used"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Category + Condition */}
            <div className="ut-form-field">
              <label className="ut-field-label">Category</label>
              <select
                className="ut-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="" disabled>Select a category</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="ut-form-field">
              <label className="ut-field-label">Condition</label>
              <select
                className="ut-select"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Price + Open To */}
            <div className="ut-form-field">
              <label className="ut-field-label">Price (₦)</label>
              <input
                name="price"
                className="ut-input"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                style={{ fontFamily: "var(--ut-font-mono)" }}
              />
            </div>

            <div className="ut-form-field">
              <label className="ut-field-label">Open To</label>
              <div style={{ display: "flex", gap: 4 }}>
                {OPEN_TO_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className="ut-radio"
                    data-active={openTo === opt.value ? "true" : "false"}
                    onClick={() => setOpenTo(opt.value)}
                    style={{ flex: 1, padding: "10px 4px", fontSize: 11.5, minWidth: 0 }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Haggling is expected on campus, so this is a way to say "firm"
                rather than a way to opt in. Hidden for swap-only listings,
                which have no cash price to negotiate. */}
            {openTo !== "swap-only" && (
              <div className="ut-form-field full">
                <label
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer",
                    padding: "11px 13px", borderRadius: 11,
                    border: `1.5px solid ${allowOffers ? "var(--ut-primary)" : "var(--ut-line)"}`,
                    background: allowOffers ? "var(--ut-primary-tint)" : "var(--ut-bg-card)",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={allowOffers}
                    onChange={(e) => setAllowOffers(e.target.checked)}
                    style={{ marginTop: 2, accentColor: "var(--ut-primary)", width: 16, height: 16, flexShrink: 0 }}
                  />
                  <span>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--ut-ink)" }}>
                      Accept offers
                    </span>
                    <span style={{ display: "block", marginTop: 2, fontSize: 12, color: "var(--ut-ink-mute)" }}>
                      Buyers can propose a price and you can accept, decline or counter.
                      Turn this off to list at a firm price.
                    </span>
                  </span>
                </label>
              </div>
            )}

            {/* Price guidance — absent until price_stats has enough comparables */}
            {guidance && (
              <div className="ut-form-field full">
                <PriceNudge guidance={guidance} />
              </div>
            )}

            {/* Description */}
            <div className="ut-form-field full">
              <label className="ut-field-label">Description</label>
              <textarea
                name="description"
                className="ut-textarea"
                placeholder="Condition, edition, accessories, meetup preferences…"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Location */}
            <div className="ut-form-field full">
              <label className="ut-field-label">Location (University / Campus)</label>
              <select
                name="location"
                className="ut-select"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              >
                <option value="" disabled>Select your university</option>
                {NIGERIAN_UNIVERSITIES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
            <button
              type="button"
              className="ut-cta ut-cta-ghost"
              style={{ fontSize: 13 }}
              onClick={handleSaveDraft}
            >
              Save as draft
            </button>
            <button
              type="submit"
              className="ut-cta ut-cta-primary"
              disabled={isPending}
              style={{ fontSize: 13 }}
            >
              {isPending ? "Publishing…" : (
                <>
                  <Check size={14} />
                  Publish listing
                </>
              )}
            </button>
          </div>
        </form>

        {/* ── Live preview ── */}
        <div className="ut-sell-preview">
          <span className="ut-eye">Live preview · what buyers see</span>

          <div className="ut-card" style={{ cursor: "default" }}>
            <div className="ut-card-media" style={{ background: "#C5D5E8" }}>
              {previewImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : null}
              <div className="ut-card-badges">
                <div style={{ display: "flex", gap: 5 }}>
                  {showSwap && (
                    <span className="ut-badge">
                      <ArrowLeftRight size={10} /> SWAP
                    </span>
                  )}
                  <span className="ut-badge">
                    <Shield size={10} /> ESCROW
                  </span>
                </div>
              </div>
            </div>

            <div className="ut-card-body">
              <h3 className="ut-card-title">{title || "Your item title"}</h3>
              <div className="ut-card-meta">
                <div className="ut-card-seller">
                  <span className="ut-avatar">{initials}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{displayName}</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--ut-ink-mute)" }}>Preview</span>
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", margin: "5px 0 8px" }}>
                {(() => {
                  const COND_COLOR: Record<string, string> = { "new": "#16803c", "like-new": "#15803d", "good": "#1d4ed8", "fair": "#b45309", "poor": "#b91c1c" };
                  const COND_LABEL: Record<string, string> = { "new": "New", "like-new": "Like New", "good": "Good", "fair": "Fair", "poor": "Poor" };
                  const DEAL_LABEL: Record<string, string> = { "cash-only": "Cash only", "cash-or-swap": "Cash or Swap", "swap-only": "Swap only" };
                  const col = COND_COLOR[condition] ?? "#1d4ed8";
                  return (
                    <>
                      <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: `color-mix(in srgb, ${col} 12%, transparent)`, color: col, border: `1px solid color-mix(in srgb, ${col} 25%, transparent)` }}>
                        {COND_LABEL[condition] ?? condition}
                      </span>
                      <span style={{ fontSize: 10.5, fontWeight: 500, padding: "2px 7px", borderRadius: 999, background: openTo === "cash-only" ? "color-mix(in srgb, #888 8%, transparent)" : "color-mix(in srgb, var(--ut-primary) 10%, transparent)", color: openTo === "cash-only" ? "var(--ut-ink-mute)" : "var(--ut-primary-ink)", border: "1px solid color-mix(in srgb, var(--ut-line) 80%, transparent)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {openTo !== "cash-only" && <ArrowLeftRight size={9} />}
                        {DEAL_LABEL[openTo]}
                      </span>
                    </>
                  );
                })()}
              </div>
              <div className="ut-card-price-row">
                <span className="ut-price">
                  {price ? `₦${Number(price).toLocaleString()}` : "₦—"}
                </span>
                <span className="ut-card-foot">
                  <MapPin size={10} />
                  {location ? location.split(",")[0] : "On campus"}
                </span>
              </div>
            </div>
          </div>

          <div style={{
            padding: 12, background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
            borderRadius: "var(--ut-radius)", fontSize: 12, color: "var(--ut-ink-soft)", lineHeight: 1.5,
          }}>
            <b style={{ color: "var(--ut-ink)" }}>Tip:</b> Listings with 3+ photos and a meetup hall get{" "}
            <b>2.4×</b> more views in your first 24 hours.
          </div>
        </div>
      </div>
    </>
  );
}

// ── Price nudge ───────────────────────────────────────────────────────────────
// Advisory only. Nothing here blocks publishing: a hard cap would push the deal
// into DMs and out of escrow, which costs the buyer the protection and us the
// fee. Most overpricing is a seller who has never seen the going rate.

const NUDGE_TONES: Record<PriceTone, { token: string; Icon: typeof Info }> = {
  info: { token: "--ut-ocean",   Icon: Info },
  good: { token: "--ut-primary", Icon: Check },
  warn: { token: "--ut-yellow",  Icon: TrendingUp },
  high: { token: "--ut-rose",    Icon: AlertTriangle },
};

function PriceNudge({ guidance }: { guidance: PriceGuidance }) {
  const { token, Icon } = NUDGE_TONES[guidance.tone];
  const color = `var(${token})`;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "10px 13px",
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
        borderRadius: "var(--ut-radius)",
      }}
    >
      <Icon size={15} style={{ flexShrink: 0, marginTop: 2, color }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ut-ink)" }}>
          {guidance.headline}
        </div>
        {guidance.detail && (
          <div style={{ fontSize: 12.5, color: "var(--ut-ink-soft)", marginTop: 2, lineHeight: 1.45 }}>
            {guidance.detail}
          </div>
        )}
        <div style={{ fontSize: 11.5, color: "var(--ut-ink-mute)", marginTop: 4 }}>
          {guidance.basis}
        </div>
      </div>
    </div>
  );
}
