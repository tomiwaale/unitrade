"use client";

import { useState } from "react";
import { X, ExternalLink } from "lucide-react";

export function IdImage({
  url,
  alt = "School ID",
  width = 160,
  height = 110,
  borderRadius = 10,
}: {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  borderRadius?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Click to view full size"
        style={{
          display: "block",
          flexShrink: 0,
          cursor: "zoom-in",
          width,
          height,
          borderRadius,
          overflow: "hidden",
          border: "1px solid var(--ut-line)",
          padding: 0,
          background: "none",
        }}
        aria-label="View full-size ID"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.88)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          {/* Controls */}
          <div
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              display: "flex",
              gap: 8,
            }}
          >
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Open in new tab"
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                borderRadius: "50%",
                width: 40,
                height: 40,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                color: "#fff",
                textDecoration: "none",
              }}
            >
              <ExternalLink size={18} />
            </a>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                borderRadius: "50%",
                width: 40,
                height: 40,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                color: "#fff",
              }}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              borderRadius: 12,
              objectFit: "contain",
              boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
            }}
          />
        </div>
      )}
    </>
  );
}
