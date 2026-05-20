"use client";

import { useRef, useState, useEffect } from "react";
import { compressProductImage } from "@/lib/compress-image";
import { createClient } from "@/lib/supabase/client";
import { X, Loader2, Upload, Plus } from "lucide-react";

interface Props {
  max?: number;
  defaultValues?: string[];
  onChange?: (urls: string[]) => void;
}

interface ImageSlot {
  id: number;
  url: string;
  uploading: boolean;
  progress: "compressing" | "uploading" | null;
  error: string;
}

let nextId = 0;

export default function ImageUploader({ max = 6, defaultValues = [], onChange }: Props) {
  const [images, setImages] = useState<ImageSlot[]>(
    defaultValues.filter(Boolean).map((url) => ({
      id: nextId++, url, uploading: false, progress: null, error: "",
    }))
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onChange?.(images.filter((s) => s.url).map((s) => s.url));
  }, [images]); // eslint-disable-line react-hooks/exhaustive-deps

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) return;

    const id = nextId++;
    setImages((prev) => [...prev, { id, url: "", uploading: true, progress: "compressing", error: "" }]);

    try {
      const compressed = await compressProductImage(file);

      setImages((prev) => prev.map((s) => s.id === id ? { ...s, progress: "uploading" } : s));

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setImages((prev) => prev.map((s) => s.id === id
          ? { ...s, uploading: false, progress: null, error: "Not logged in" } : s));
        return;
      }

      const path = `${user.id}/${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, compressed, { contentType: "image/webp", upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
      setImages((prev) => prev.map((s) => s.id === id
        ? { ...s, url: publicUrl, uploading: false, progress: null } : s));
    } catch (err: any) {
      setImages((prev) => prev.map((s) => s.id === id
        ? { ...s, uploading: false, progress: null, error: err.message ?? "Upload failed" } : s));
    }
  }

  function remove(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setImages((prev) => prev.filter((s) => s.id !== id));
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const available = max - images.length;
    files.slice(0, available).forEach(uploadFile);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const available = max - images.length;
    files.slice(0, available).forEach(uploadFile);
  }

  const canAdd = images.length < max;

  function handleZoneClick() {
    if (canAdd) inputRef.current?.click();
  }

  return (
    <div>
      {images.filter((s) => s.url).map((s) => (
        <input key={s.id} type="hidden" name="imageUrl" value={s.url} />
      ))}

      <div
        className="ut-upload"
        onClick={handleZoneClick}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{ cursor: canAdd ? "pointer" : "default", gap: 6, paddingBottom: 16 }}
      >
        <Upload size={26} style={{ color: "var(--ut-ink-mute)" }} />
        <b>Drag photos here, or tap to upload</b>
        <span>Up to {max} photos · clear lighting helps you sell faster</span>

        {(images.length > 0 || canAdd) && (
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", justifyContent: "center" }}>
            {images.map((slot) => (
              <div
                key={slot.id}
                style={{
                  width: 72, height: 72, borderRadius: 10, overflow: "hidden",
                  border: "1px solid var(--ut-line)", position: "relative",
                  background: "var(--ut-bg-sunken)", display: "grid",
                  placeItems: "center", flexShrink: 0,
                }}
              >
                {slot.uploading ? (
                  <Loader2 size={20} style={{ color: "var(--ut-primary)", animation: "spin 1s linear infinite" }} />
                ) : slot.url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={slot.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      type="button"
                      onClick={(e) => remove(slot.id, e)}
                      style={{
                        position: "absolute", top: 4, right: 4,
                        width: 20, height: 20, borderRadius: "50%",
                        background: "rgba(0,0,0,0.65)", border: "none",
                        display: "grid", placeItems: "center", cursor: "pointer",
                      }}
                    >
                      <X size={10} style={{ color: "white" }} />
                    </button>
                  </>
                ) : (
                  <span style={{ fontSize: 10, color: "var(--ut-rose)", padding: 4, textAlign: "center", lineHeight: 1.3 }}>
                    {slot.error || "Error"}
                  </span>
                )}
              </div>
            ))}

            {canAdd && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                style={{
                  width: 72, height: 72, borderRadius: 10,
                  border: "1.5px dashed var(--ut-line)",
                  background: "var(--ut-bg-sunken)", cursor: "pointer",
                  display: "grid", placeItems: "center", flexShrink: 0,
                  color: "var(--ut-ink-mute)",
                }}
              >
                <Plus size={20} />
              </button>
            )}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handleInputChange}
      />
    </div>
  );
}
