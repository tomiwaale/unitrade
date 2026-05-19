"use client";

import { useTransition, useState } from "react";
import { createProduct } from "@/app/actions/product";
import { toast } from "sonner";
import { Check, MapPin, ArrowLeftRight, Shield, Star } from "lucide-react";
import ImageUploader from "@/components/image-uploader";

const CATEGORIES = [
  { label: "Textbooks",   value: "textbooks" },
  { label: "Electronics", value: "electronics" },
  { label: "Fashion",     value: "fashion" },
  { label: "Hostel",      value: "hostel" },
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
}

export default function SellForm({ defaultLocation, sellerName }: Props) {
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("good");
  const [openTo, setOpenTo] = useState<OpenTo>("cash-or-swap");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState(defaultLocation);
  const [previewImageUrl, setPreviewImageUrl] = useState("");

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

  function handleImagesChange(urls: string[]) {
    setPreviewImageUrl(urls[0] ?? "");
  }

  async function action(formData: FormData) {
    startTransition(async () => {
      const result = await createProduct(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Listing published!");
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

      <div className="ut-sell-layout">
        {/* ── Form ── */}
        <form action={action}>
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="condition" value={condition} />
          <input type="hidden" name="open_to" value={openTo} />

          <div className="ut-form-grid">
            {/* Photo upload */}
            <div className="ut-form-field full">
              <ImageUploader max={6} onChange={handleImagesChange} />
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

            {/* Description */}
            <div className="ut-form-field full">
              <label className="ut-field-label">Description</label>
              <textarea
                name="description"
                className="ut-textarea"
                placeholder="Condition, edition, accessories, meetup preferences…"
                required
              />
            </div>

            {/* Meetup Hall */}
            <div className="ut-form-field full">
              <label className="ut-field-label">Meetup Hall / Hostel</label>
              <input
                name="location"
                className="ut-input"
                placeholder="e.g. Mariere Hall"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
            <button type="button" className="ut-cta ut-cta-ghost" style={{ fontSize: 13 }}>
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
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Star size={11} style={{ color: "var(--ut-yellow)", fill: "var(--ut-yellow)" }} />
                  <span style={{ fontSize: 12, fontFamily: "var(--ut-font-mono)", color: "var(--ut-ink-soft)" }}>4.8</span>
                </span>
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
