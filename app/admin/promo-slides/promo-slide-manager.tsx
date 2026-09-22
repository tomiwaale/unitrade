"use client";

import { useRef, useState } from "react";
import {
  addPromoSlide, deletePromoSlide, togglePromoSlide, movePromoSlide, updatePromoSlide,
} from "./actions";
import { PROMO_ICONS, PROMO_ICON_KEYS, type PromoIconKey } from "./icons";
import { compressSlideImage } from "@/lib/compress-image";
import { createClient } from "@/lib/supabase/client";
import { ChevronUp, ChevronDown, Trash2, Plus, Loader2, Pencil, Check, Upload, X } from "lucide-react";

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color_start: string;
  color_end: string;
  image_url: string | null;
  route: string | null;
  sort_order: number;
  active: boolean;
}

interface Props {
  slides: Slide[];
  userId: string;
}

const COLOR_PRESETS: { label: string; start: string; end: string }[] = [
  { label: "Green",  start: "#0F8A4F", end: "#073B22" },
  { label: "Orange", start: "#FF5A1F", end: "#C8420F" },
  { label: "Teal",   start: "#14A25E", end: "#073B22" },
  { label: "Blue",   start: "#2563EB", end: "#1E3A8A" },
  { label: "Purple", start: "#7C3AED", end: "#4C1D95" },
  { label: "Rose",   start: "#E11D48", end: "#881337" },
];

function GradientPreview({ title, subtitle, icon, colorStart, colorEnd, imageUrl }: {
  title: string; subtitle: string; icon: string; colorStart: string; colorEnd: string; imageUrl?: string | null;
}) {
  const IconCmp = PROMO_ICONS[icon as PromoIconKey]?.Icon ?? PROMO_ICONS.megaphone.Icon;

  if (imageUrl) {
    // Matches the mobile app: when a banner is set, only the image shows,
    // fitted (not cropped) inside the card — no title/subtitle/icon overlay.
    return (
      <div style={{
        borderRadius: 16, minHeight: 88, overflow: "hidden",
        background: `var(--ut-bg-sunken) url(${imageUrl}) center/contain no-repeat`,
      }} />
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "16px 12px 16px 18px", borderRadius: 16,
      background: `linear-gradient(135deg, ${colorStart}, ${colorEnd})`,
      minHeight: 88, overflow: "hidden",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, color: "white", fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title || "Card title"}
        </p>
        <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.75)", fontSize: 12, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {subtitle || "Card subtitle goes here"}
        </p>
      </div>
      <IconCmp size={34} style={{ color: "rgba(255,255,255,0.85)", flexShrink: 0 }} />
    </div>
  );
}

function BannerUpload({ userId, value, onChange }: {
  userId: string; value: string; onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);

    try {
      const compressed = await compressSlideImage(file);

      const supabase = createClient();
      const path = `${userId}/promo-slides/${Date.now()}.webp`;
      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(path, compressed, { contentType: "image/webp", upsert: false });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
      onChange(publicUrl);
    } catch (err: any) {
      setError(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <label style={labelStyle}>Banner image (optional)</label>
      {value ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" style={{ width: 96, height: 56, objectFit: "cover", borderRadius: 8, background: "var(--ut-bg-sunken)" }} />
          <button
            type="button"
            onClick={() => onChange("")}
            style={{ ...iconBtn, display: "inline-flex", alignItems: "center", gap: 4, color: "#9B1C1C", fontSize: 12, fontWeight: 600 }}
          >
            <X size={13} /> Remove image
          </button>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          style={{
            border: "1.5px dashed var(--ut-line)", borderRadius: "var(--ut-radius)",
            padding: "14px 16px", cursor: uploading ? "default" : "pointer", textAlign: "center",
            background: "var(--ut-bg-sunken)",
          }}
        >
          {uploading ? (
            <Loader2 size={18} style={{ color: "var(--ut-ink-mute)", animation: "spin 1s linear infinite" }} />
          ) : (
            <div style={{ color: "var(--ut-ink-mute)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <Upload size={18} />
              <span style={{ fontSize: 12 }}>Click to upload a banner image</span>
              <span style={{ fontSize: 10.5 }}>Falls back to the gradient below if none is set</span>
            </div>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
      {error && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9B1C1C" }}>{error}</p>}
    </div>
  );
}

function IconPicker({ value, onChange, name }: { value: string; onChange: (v: string) => void; name: string }) {
  return (
    <div className="ut-radio-row">
      <input type="hidden" name={name} value={value} />
      {PROMO_ICON_KEYS.map((key) => {
        const { label, Icon } = PROMO_ICONS[key];
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            className="ut-radio"
            data-active={active ? "true" : "false"}
            onClick={() => onChange(key)}
            title={label}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 64, flex: "unset" }}
          >
            <Icon size={16} />
            <span style={{ fontSize: 10.5 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ColorFields({ start, end, onStart, onEnd }: {
  start: string; end: string; onStart: (v: string) => void; onEnd: (v: string) => void;
}) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
        <div>
          <label style={labelStyle}>Gradient start</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(start) ? start : "#0F8A4F"} onChange={(e) => onStart(e.target.value)} style={colorSwatchStyle} />
            <input value={start} onChange={(e) => onStart(e.target.value)} style={{ ...inputStyle }} placeholder="#0F8A4F" />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Gradient end</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(end) ? end : "#073B22"} onChange={(e) => onEnd(e.target.value)} style={colorSwatchStyle} />
            <input value={end} onChange={(e) => onEnd(e.target.value)} style={{ ...inputStyle }} placeholder="#073B22" />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {COLOR_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => { onStart(p.start); onEnd(p.end); }}
            title={p.label}
            style={{
              width: 22, height: 22, borderRadius: "50%", border: "1.5px solid var(--ut-line)", cursor: "pointer",
              background: `linear-gradient(135deg, ${p.start}, ${p.end})`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SlideForm({ initial, onSubmit, submitLabel, pending, userId, error }: {
  initial: Partial<Slide>;
  onSubmit: (formData: FormData) => void;
  submitLabel: string;
  pending: boolean;
  userId: string;
  error?: string;
}) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [subtitle, setSubtitle] = useState(initial.subtitle ?? "");
  const [icon, setIcon] = useState<string>(initial.icon ?? "megaphone");
  const [colorStart, setColorStart] = useState(initial.color_start ?? "#0F8A4F");
  const [colorEnd, setColorEnd] = useState(initial.color_end ?? "#073B22");
  const [route, setRoute] = useState(initial.route ?? "");
  const [imageUrl, setImageUrl] = useState(initial.image_url ?? "");

  return (
    <form action={onSubmit} style={{ display: "grid", gap: 14 }}>
      <GradientPreview title={title} subtitle={subtitle} icon={icon} colorStart={colorStart} colorEnd={colorEnd} imageUrl={imageUrl} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>Title</label>
          <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Prefer to swap?" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Route (optional)</label>
          <input name="route" value={route ?? ""} onChange={(e) => setRoute(e.target.value)} placeholder="/sell" style={inputStyle} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Subtitle</label>
        <input name="subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g. Trade items with students near you." style={inputStyle} />
      </div>

      <input type="hidden" name="image_url" value={imageUrl} />
      <BannerUpload userId={userId} value={imageUrl} onChange={setImageUrl} />

      <div>
        <label style={labelStyle}>Icon</label>
        <IconPicker name="icon" value={icon} onChange={setIcon} />
      </div>

      <ColorFields start={colorStart} end={colorEnd} onStart={setColorStart} onEnd={setColorEnd} />

      {error && <p style={{ margin: 0, fontSize: 12.5, color: "#9B1C1C" }}>{error}</p>}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={pending}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "9px 18px", borderRadius: "var(--ut-radius)",
            background: "var(--ut-primary-ink)", color: "white",
            border: "none", fontWeight: 600, fontSize: 13,
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.6 : 1,
            width: "fit-content",
          }}
        >
          {pending ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={13} />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function PromoSlideManager({ slides, userId }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [addError, setAddError] = useState("");
  const [editError, setEditError] = useState("");

  async function handleAdd(formData: FormData) {
    setPending("add");
    setAddError("");
    const result = await addPromoSlide(formData);
    setPending(null);
    if (result?.error) setAddError(result.error);
    else setAdding(false);
  }

  async function handleSaveEdit(id: string, formData: FormData) {
    setPending(id + "edit");
    setEditError("");
    const result = await updatePromoSlide(id, formData);
    setPending(null);
    if (result?.error) setEditError(result.error);
    else setEditingId(null);
  }

  return (
    <div style={{ display: "grid", gap: 32 }}>

      {/* ── Existing slides ── */}
      {slides.length > 0 ? (
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--ut-ink-mute)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            All cards ({slides.length})
          </h2>
          <p style={{ fontSize: 12, color: "var(--ut-ink-mute)", marginBottom: 12 }}>
            Toggle the switch on each card to control what shows in the app.
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {slides.map((slide, i) => {
              const isEditing = editingId === slide.id;
              return (
                <div key={slide.id} style={{
                  background: "var(--ut-bg-card)",
                  border: `1.5px solid ${isEditing ? "var(--ut-primary)" : slide.active ? "var(--ut-primary)" : "var(--ut-line)"}`,
                  borderRadius: "var(--ut-radius)", overflow: "hidden",
                  opacity: slide.active ? 1 : 0.5,
                  transition: "border-color 0.2s, opacity 0.2s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px" }}>
                    {/* Preview thumb */}
                    <div style={{ width: 80, flexShrink: 0 }}>
                      <GradientPreview
                        title={slide.title} subtitle="" icon={slide.icon}
                        colorStart={slide.color_start} colorEnd={slide.color_end}
                        imageUrl={slide.image_url}
                      />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "var(--ut-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {slide.title || <span style={{ color: "var(--ut-ink-mute)", fontStyle: "italic" }}>No title</span>}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ut-ink-mute)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {slide.route || "No link"}
                      </p>
                    </div>

                    {/* Display toggle switch */}
                    <button
                      onClick={async () => { setPending(slide.id + "toggle"); await togglePromoSlide(slide.id, !slide.active); setPending(null); }}
                      disabled={pending === slide.id + "toggle"}
                      title={slide.active ? "Remove from app" : "Show in app"}
                      style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "4px 0", flexShrink: 0 }}
                    >
                      <span style={{
                        display: "inline-flex", alignItems: "center",
                        width: 40, height: 22, borderRadius: 11, padding: 2,
                        background: slide.active ? "var(--ut-primary)" : "var(--ut-line)",
                        transition: "background 0.2s", flexShrink: 0,
                      }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: "50%", background: "white",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          transform: slide.active ? "translateX(18px)" : "translateX(0)",
                          transition: "transform 0.2s", display: "block",
                        }} />
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: slide.active ? "var(--ut-primary)" : "var(--ut-ink-mute)", minWidth: 42 }}>
                        {pending === slide.id + "toggle"
                          ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                          : slide.active ? "Live" : "Hidden"}
                      </span>
                    </button>

                    <span style={{ width: 1, height: 28, background: "var(--ut-line)", flexShrink: 0 }} />

                    <button
                      onClick={() => { setEditingId(isEditing ? null : slide.id); setEditError(""); }}
                      style={{ ...iconBtn, color: isEditing ? "var(--ut-primary)" : "var(--ut-ink-soft)" }}
                      title={isEditing ? "Close editor" : "Edit card"}
                    >
                      <Pencil size={14} />
                    </button>

                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <button
                        onClick={async () => { setPending(slide.id + "up"); await movePromoSlide(slide.id, "up"); setPending(null); }}
                        disabled={i === 0 || !!pending}
                        style={iconBtn}
                        title="Move up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={async () => { setPending(slide.id + "down"); await movePromoSlide(slide.id, "down"); setPending(null); }}
                        disabled={i === slides.length - 1 || !!pending}
                        style={iconBtn}
                        title="Move down"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    <button
                      onClick={async () => {
                        if (!confirm("Delete this card?")) return;
                        setPending(slide.id + "del");
                        await deletePromoSlide(slide.id);
                        setPending(null);
                      }}
                      disabled={!!pending}
                      style={{ ...iconBtn, color: "#9B1C1C" }}
                      title="Delete card"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {isEditing && (
                    <div style={{ borderTop: "1px solid var(--ut-line)", padding: "16px 16px 18px", background: "var(--ut-bg-sunken)" }}>
                      <SlideForm
                        initial={slide}
                        submitLabel="Save changes"
                        pending={pending === slide.id + "edit"}
                        onSubmit={(fd) => handleSaveEdit(slide.id, fd)}
                        userId={userId}
                        error={editError}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{
          textAlign: "center", padding: "40px 24px",
          background: "var(--ut-bg-card)", border: "1px dashed var(--ut-line)",
          borderRadius: "var(--ut-radius)", color: "var(--ut-ink-mute)", fontSize: 13,
        }}>
          No promo cards yet. Add one below and it will appear in the mobile app.
        </div>
      )}

      {/* ── Add new card ── */}
      <div style={{ background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)", borderRadius: "var(--ut-radius)", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: adding ? 18 : 0 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--ut-ink-mute)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
            Add new card
          </h2>
          {!adding && (
            <button
              onClick={() => { setAdding(true); setAddError(""); }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: "var(--ut-radius)",
                background: "var(--ut-primary-tint)", color: "var(--ut-primary-ink)",
                border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer",
              }}
            >
              <Plus size={14} /> New card
            </button>
          )}
        </div>

        {adding && (
          <SlideForm
            initial={{ icon: "megaphone", color_start: "#0F8A4F", color_end: "#073B22" }}
            submitLabel="Add card"
            pending={pending === "add"}
            onSubmit={handleAdd}
            userId={userId}
            error={addError}
          />
        )}
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  padding: 6, borderRadius: 6, color: "var(--ut-ink-soft)",
  display: "grid", placeItems: "center",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "var(--ut-ink-mute)", marginBottom: 6,
  textTransform: "uppercase", letterSpacing: "0.04em",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  border: "1px solid var(--ut-line)", borderRadius: "var(--ut-radius)",
  background: "var(--ut-bg-sunken)", color: "var(--ut-ink)",
  fontSize: 13, boxSizing: "border-box",
};

const colorSwatchStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 8, border: "1px solid var(--ut-line)",
  padding: 2, background: "var(--ut-bg-sunken)", cursor: "pointer", flexShrink: 0,
};
