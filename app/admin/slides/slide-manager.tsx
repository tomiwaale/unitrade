"use client";

import { useState, useRef } from "react";
import { compressSlideImage } from "@/lib/compress-image";
import { createClient } from "@/lib/supabase/client";
import { addSlide, deleteSlide, toggleSlide, moveSlide, updateSlide, updateSlideInterval } from "./actions";
import { ChevronUp, ChevronDown, Trash2, Plus, Loader2, Upload, Timer, Pencil, Check } from "lucide-react";

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  cta_label: string;
  cta_href: string;
  sort_order: number;
  active: boolean;
}

interface Props {
  slides: Slide[];
  userId: string;
  slideInterval: number;
}

const INTERVAL_OPTIONS = [5, 8, 10, 15, 20, 30];

export default function SlideManager({ slides, userId, slideInterval }: Props) {
  const [uploading, setUploading] = useState(false);
  const [interval, setInterval_] = useState(slideInterval);
  const [savingInterval, setSavingInterval] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const compressed = await compressSlideImage(file);

      const supabase = createClient();
      const path = `${userId}/slides/${Date.now()}.webp`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, compressed, { contentType: "image/webp", upsert: false });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
      setUploadedUrl(publicUrl);
    } catch (err: any) {
      setUploadError(err.message ?? "Upload failed");
      setPreviewUrl("");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleAdd(formData: FormData) {
    if (!uploadedUrl) { setUploadError("Please upload an image first."); return; }
    formData.set("image_url", uploadedUrl);
    setPending("add");
    await addSlide(formData);
    setPending(null);
    setPreviewUrl("");
    setUploadedUrl("");
  }

  async function handleSaveEdit(id: string, formData: FormData) {
    setSavingEdit(true);
    await updateSlide(id, formData);
    setSavingEdit(false);
    setEditingId(null);
  }

  async function handleIntervalChange(secs: number) {
    setInterval_(secs);
    setSavingInterval(true);
    await updateSlideInterval(secs);
    setSavingInterval(false);
  }

  return (
    <div style={{ display: "grid", gap: 32 }}>

      {/* ── Slide timing ── */}
      <div style={{ background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)", borderRadius: "var(--ut-radius)", padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <Timer size={16} style={{ color: "var(--ut-primary)", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "var(--ut-ink)" }}>Auto-slide interval</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ut-ink-mute)" }}>How long each slide stays before advancing</p>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {INTERVAL_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleIntervalChange(s)}
              disabled={savingInterval}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                border: "1.5px solid",
                borderColor: interval === s ? "var(--ut-primary)" : "var(--ut-line)",
                background: interval === s ? "var(--ut-primary-tint)" : "transparent",
                color: interval === s ? "var(--ut-primary-ink)" : "var(--ut-ink-soft)",
                cursor: savingInterval ? "not-allowed" : "pointer",
                transition: "all 0.15s",
              }}
            >
              {s}s
            </button>
          ))}
        </div>
        {savingInterval && <Loader2 size={14} style={{ color: "var(--ut-ink-mute)", animation: "spin 1s linear infinite" }} />}
      </div>

      {/* ── Existing slides ── */}
      {slides.length > 0 ? (
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--ut-ink-mute)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            All slides ({slides.length})
          </h2>
          <p style={{ fontSize: 12, color: "var(--ut-ink-mute)", marginBottom: 12 }}>
            Toggle the switch on each slide to control what shows on the homepage.
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
                  {/* ── Row ── */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px" }}>
                    {/* Thumbnail */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.image_url}
                      alt=""
                      style={{ width: 80, height: 52, objectFit: "cover", borderRadius: 8, flexShrink: 0, background: "var(--ut-bg-sunken)" }}
                    />

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "var(--ut-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {slide.title || <span style={{ color: "var(--ut-ink-mute)", fontStyle: "italic" }}>No title</span>}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ut-ink-mute)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {slide.subtitle || slide.cta_href}
                      </p>
                    </div>

                    {/* Display toggle switch */}
                    <button
                      onClick={async () => { setPending(slide.id + "toggle"); await toggleSlide(slide.id, !slide.active); setPending(null); }}
                      disabled={pending === slide.id + "toggle"}
                      title={slide.active ? "Remove from homepage" : "Show on homepage"}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        background: "none", border: "none", cursor: "pointer", padding: "4px 0",
                        flexShrink: 0,
                      }}
                    >
                      {/* pill switch */}
                      <span style={{
                        display: "inline-flex", alignItems: "center",
                        width: 40, height: 22, borderRadius: 11, padding: 2,
                        background: slide.active ? "var(--ut-primary)" : "var(--ut-line)",
                        transition: "background 0.2s",
                        flexShrink: 0,
                      }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: "50%", background: "white",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          transform: slide.active ? "translateX(18px)" : "translateX(0)",
                          transition: "transform 0.2s",
                          display: "block",
                        }} />
                      </span>
                      <span style={{
                        fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
                        color: slide.active ? "var(--ut-primary)" : "var(--ut-ink-mute)",
                        minWidth: 42,
                      }}>
                        {pending === slide.id + "toggle"
                          ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                          : slide.active ? "Live" : "Hidden"
                        }
                      </span>
                    </button>

                    {/* Divider */}
                    <span style={{ width: 1, height: 28, background: "var(--ut-line)", flexShrink: 0 }} />

                    {/* Edit */}
                    <button
                      onClick={() => setEditingId(isEditing ? null : slide.id)}
                      style={{ ...iconBtn, color: isEditing ? "var(--ut-primary)" : "var(--ut-ink-soft)" }}
                      title={isEditing ? "Close editor" : "Edit slide"}
                    >
                      <Pencil size={14} />
                    </button>

                    {/* Order */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <button
                        onClick={async () => { setPending(slide.id + "up"); await moveSlide(slide.id, "up"); setPending(null); }}
                        disabled={i === 0 || !!pending}
                        style={iconBtn}
                        title="Move up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={async () => { setPending(slide.id + "down"); await moveSlide(slide.id, "down"); setPending(null); }}
                        disabled={i === slides.length - 1 || !!pending}
                        style={iconBtn}
                        title="Move down"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={async () => {
                        if (!confirm("Delete this slide?")) return;
                        setPending(slide.id + "del");
                        await deleteSlide(slide.id);
                        setPending(null);
                      }}
                      disabled={!!pending}
                      style={{ ...iconBtn, color: "#9B1C1C" }}
                      title="Delete slide"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* ── Inline edit panel ── */}
                  {isEditing && (
                    <form
                      action={(fd) => handleSaveEdit(slide.id, fd)}
                      style={{
                        borderTop: "1px solid var(--ut-line)",
                        padding: "16px 16px 18px",
                        display: "grid", gap: 12,
                        background: "var(--ut-bg-sunken)",
                      }}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={labelStyle}>Title</label>
                          <input name="title" defaultValue={slide.title} placeholder="e.g. Fresh listings this week" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Subtitle</label>
                          <input name="subtitle" defaultValue={slide.subtitle} placeholder="e.g. Grab deals before they're gone" style={inputStyle} />
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={labelStyle}>Button label</label>
                          <input name="cta_label" defaultValue={slide.cta_label} placeholder="Browse listings" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Button link</label>
                          <input name="cta_href" defaultValue={slide.cta_href} placeholder="/catalog" style={inputStyle} />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="submit"
                          disabled={savingEdit}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "8px 18px", borderRadius: "var(--ut-radius)",
                            background: "var(--ut-primary-ink)", color: "white",
                            border: "none", fontWeight: 600, fontSize: 13,
                            cursor: savingEdit ? "not-allowed" : "pointer",
                            opacity: savingEdit ? 0.6 : 1,
                          }}
                        >
                          {savingEdit
                            ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                            : <Check size={13} />
                          }
                          Save changes
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          style={{ ...iconBtn, padding: "8px 14px", fontSize: 13, color: "var(--ut-ink-mute)" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
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
          No slides yet. Add one below and it will appear on the homepage.
        </div>
      )}

      {/* ── Add new slide ── */}
      <div style={{ background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)", borderRadius: "var(--ut-radius)", padding: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--ut-ink-mute)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 18 }}>
          Add new slide
        </h2>

        {/* Image upload */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Slide image *</label>
          <div
            onClick={() => inputRef.current?.click()}
            style={{
              border: "1.5px dashed var(--ut-line)", borderRadius: "var(--ut-radius)",
              padding: "20px 16px", cursor: "pointer", textAlign: "center",
              background: "var(--ut-bg-sunken)", position: "relative", overflow: "hidden",
            }}
          >
            {previewUrl ? (
              <div style={{ position: "relative", display: "inline-block" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="" style={{ maxHeight: 160, maxWidth: "100%", borderRadius: 8, display: "block" }} />
                {uploading && (
                  <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.45)", borderRadius: 8 }}>
                    <Loader2 size={24} style={{ color: "white", animation: "spin 1s linear infinite" }} />
                  </div>
                )}
                {uploadedUrl && !uploading && (
                  <div style={{ position: "absolute", top: 6, right: 6, background: "var(--ut-primary)", borderRadius: 4, padding: "2px 6px", fontSize: 10, color: "white", fontWeight: 600 }}>
                    Uploaded
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: "var(--ut-ink-mute)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <Upload size={22} />
                <span style={{ fontSize: 13 }}>Click to upload a poster image</span>
                <span style={{ fontSize: 11 }}>Recommended: 1200 × 600 px · JPG or PNG</span>
              </div>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
          {uploadError && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9B1C1C" }}>{uploadError}</p>}
        </div>

        <form action={handleAdd} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Title (optional)</label>
              <input name="title" placeholder="e.g. Fresh listings this week" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Subtitle (optional)</label>
              <input name="subtitle" placeholder="e.g. Grab deals before they're gone" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Button label</label>
              <input name="cta_label" placeholder="Browse listings" defaultValue="Browse listings" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Button link</label>
              <input name="cta_href" placeholder="/catalog" defaultValue="/catalog" style={inputStyle} />
            </div>
          </div>

          <button
            type="submit"
            disabled={!!pending || uploading || !uploadedUrl}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 20px", borderRadius: "var(--ut-radius)",
              background: "var(--ut-primary-ink)", color: "white",
              border: "none", fontWeight: 600, fontSize: 13,
              cursor: (!pending && !uploading && uploadedUrl) ? "pointer" : "not-allowed",
              opacity: (!pending && !uploading && uploadedUrl) ? 1 : 0.5,
              width: "fit-content",
            }}
          >
            {pending === "add" ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={14} />}
            Add slide
          </button>
        </form>
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
