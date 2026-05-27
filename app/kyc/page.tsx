"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressIdImage } from "@/lib/compress-image";
import { getMyKycStatus, submitSchoolId } from "@/app/actions/kyc";
import { Navbar } from "@/components/ui/navbar";
import { toast } from "sonner";
import {
  GraduationCap, Upload, ArrowRight, CheckCircle, Clock,
  XCircle, Loader2, X,
} from "lucide-react";
import Link from "next/link";

type IdStatus = "none" | "pending" | "approved" | "rejected";

export default function KYCPage() {
  const [status, setStatus] = useState<IdStatus>("none");
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getMyKycStatus().then((result) => {
      if (result?.error) return;
      if (result?.status) setStatus(result.status as IdStatus);
      if (result?.signedUrl) setReviewUrl(result.signedUrl);
    });
  }, []);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 10 MB.");
      return;
    }
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const compressed = await compressIdImage(file);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const path = `${user.id}/school-id-${Date.now()}.webp`;
      const { error } = await supabase.storage
        .from("school-ids")
        .upload(path, compressed, { contentType: "image/webp", upsert: true });
      if (error) throw error;

      setUploadedPath(path);
      setReviewUrl(null);
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  function onSubmit() {
    if (!uploadedPath) return;
    startTransition(async () => {
      const result = await submitSchoolId(uploadedPath);
      if (result?.error) {
        toast.error(result.error);
      } else {
        setStatus("pending");
        if (preview) setReviewUrl(preview);
        toast.success("School ID submitted for review!");
      }
    });
  }

  return (
    <div className="ut-app">
      <Navbar />
      <main className="ut-main">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div className="ut-auth-card ut-fade-up" style={{ maxWidth: 460 }}>
            <div className="ut-auth-card-head">
              <div style={{
                width: 44, height: 44, borderRadius: 12, marginBottom: 16,
                background: "var(--ut-primary-tint)", color: "var(--ut-primary-ink)",
                display: "grid", placeItems: "center",
              }}>
                <GraduationCap size={22} />
              </div>
              <h1>Student verification</h1>
              <p>Upload your school ID card to unlock selling on KolejSwap.</p>
            </div>

            <div className="ut-auth-card-body">
              {status === "approved" && (
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                  <CheckCircle size={48} style={{ color: "var(--ut-primary)", marginBottom: 14 }} />
                  <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600 }}>Verified!</p>
                  <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "var(--ut-ink-mute)" }}>
                    Your school ID has been approved. You can now list items.
                  </p>
                  <Link href="/sell" className="ut-cta ut-cta-primary" style={{ justifyContent: "center", padding: "13px 20px", borderRadius: 12 }}>
                    Start selling <ArrowRight size={15} />
                  </Link>
                </div>
              )}

              {status === "pending" && (
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                  <Clock size={48} style={{ color: "var(--ut-yellow, #ca8a04)", marginBottom: 14 }} />
                  <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600 }}>Under review</p>
                  <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "var(--ut-ink-mute)", lineHeight: 1.6 }}>
                    Your school ID is being reviewed. We typically approve within a few hours.
                    You&apos;ll be notified once approved.
                  </p>
                  {(reviewUrl || preview) && (
                    <a href={reviewUrl ?? preview ?? "#"} target="_blank" rel="noreferrer"
                      style={{ fontSize: 12.5, color: "var(--ut-primary)", textDecoration: "none" }}>
                      View submitted ID
                    </a>
                  )}
                </div>
              )}

              {status === "rejected" && (
                <div style={{ display: "grid", gap: 16 }}>
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "12px 14px", borderRadius: 10,
                    background: "color-mix(in srgb, var(--ut-rose, #e11d48) 10%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--ut-rose, #e11d48) 25%, transparent)",
                    fontSize: 12.5, lineHeight: 1.5,
                  }}>
                    <XCircle size={15} style={{ flexShrink: 0, marginTop: 1, color: "var(--ut-rose, #e11d48)" }} />
                    <span>Your previous submission was rejected. Please upload a clearer photo of your valid school ID card.</span>
                  </div>
                  <UploadSection
                    preview={preview}
                    uploading={uploading}
                    uploadedPath={uploadedPath}
                    inputRef={inputRef}
                    onFile={handleFile}
                    onClear={() => { setPreview(null); setUploadedPath(null); setReviewUrl(null); }}
                    onSubmit={onSubmit}
                    isPending={isPending}
                  />
                </div>
              )}

              {status === "none" && (
                <div style={{ display: "grid", gap: 16 }}>
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "12px 14px", borderRadius: 10,
                    background: "var(--ut-primary-tint)",
                    border: "1px solid color-mix(in srgb, var(--ut-primary) 20%, transparent)",
                    fontSize: 12.5, color: "var(--ut-primary-ink)", lineHeight: 1.5,
                  }}>
                    <GraduationCap size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>
                      Upload a clear photo of your school ID card — front side showing your name,
                      matric number, and university. This is a one-time step.
                    </span>
                  </div>
                  <UploadSection
                    preview={preview}
                    uploading={uploading}
                    uploadedPath={uploadedPath}
                    inputRef={inputRef}
                    onFile={handleFile}
                    onClear={() => { setPreview(null); setUploadedPath(null); setReviewUrl(null); }}
                    onSubmit={onSubmit}
                    isPending={isPending}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

interface UploadSectionProps {
  preview: string | null;
  uploading: boolean;
  uploadedPath: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
  onClear: () => void;
  onSubmit: () => void;
  isPending: boolean;
}

function UploadSection({ preview, uploading, uploadedPath, inputRef, onFile, onClear, onSubmit, isPending }: UploadSectionProps) {
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        className="ut-upload"
        onClick={() => { if (!preview) inputRef.current?.click(); }}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{ cursor: preview ? "default" : "pointer", position: "relative", minHeight: 140 }}
      >
        {uploading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Loader2 size={24} style={{ color: "var(--ut-primary)", animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13, color: "var(--ut-ink-mute)" }}>Uploading…</span>
          </div>
        )}

        {!uploading && preview && (
          <div style={{ position: "relative", width: "100%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="School ID preview"
              style={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 8 }}
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              style={{
                position: "absolute", top: 6, right: 6,
                width: 24, height: 24, borderRadius: "50%",
                background: "rgba(0,0,0,0.6)", border: "none",
                display: "grid", placeItems: "center", cursor: "pointer",
              }}
            >
              <X size={12} style={{ color: "white" }} />
            </button>
          </div>
        )}

        {!uploading && !preview && (
          <>
            <Upload size={26} style={{ color: "var(--ut-ink-mute)" }} />
            <b>Drag your school ID here, or tap to upload</b>
            <span>JPG, PNG or HEIC · front side of ID card</span>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        className="ut-cta ut-cta-primary"
        disabled={!uploadedPath || isPending || uploading}
        onClick={onSubmit}
        style={{ justifyContent: "center", padding: "13px 20px", borderRadius: 12 }}
      >
        {isPending ? "Submitting…" : (
          <>Submit for review <ArrowRight size={15} /></>
        )}
      </button>
    </div>
  );
}
