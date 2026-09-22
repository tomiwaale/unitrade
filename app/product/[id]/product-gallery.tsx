"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  images: string[];
  title: string;
  bgColor: string;
  emoji: string;
  badges?: React.ReactNode;
}

export function ProductGallery({ images, title, bgColor, emoji, badges }: Props) {
  const [index, setIndex] = useState(0);
  const hasImages = images.length > 0;
  const count = images.length;
  const touchStartX = useRef<number | null>(null);

  function go(delta: number) {
    setIndex((i) => (i + delta + count) % count);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchStartX.current = null;
  }

  // Always show 4 thumbnail slots
  const thumbImages: (string | null)[] = [
    ...images.slice(0, 4),
    ...Array(Math.max(0, 4 - images.length)).fill(null),
  ];

  return (
    <div>
      <div
        className="ut-detail-media"
        style={{ background: hasImages ? undefined : bgColor }}
        onTouchStart={count > 1 ? onTouchStart : undefined}
        onTouchEnd={count > 1 ? onTouchEnd : undefined}
      >
        {hasImages ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={images[index]} alt={title} />
        ) : (
          <span className="emoji" aria-hidden>{emoji}</span>
        )}

        {badges}

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              className="ut-gallery-nav left"
              onClick={() => go(-1)}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Next image"
              className="ut-gallery-nav right"
              onClick={() => go(1)}
            >
              <ChevronRight size={18} />
            </button>
            <div className="ut-gallery-dots">
              {images.map((_, i) => (
                <span key={i} className="ut-gallery-dot" data-active={i === index ? "true" : "false"} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="ut-detail-thumbs" style={{ marginTop: 12 }}>
        {thumbImages.map((img, i) => (
          <button
            type="button"
            key={i}
            className={`thumb${i === index ? " active" : ""}`}
            style={{ background: img ? undefined : "var(--ut-bg-sunken)" }}
            onClick={img ? () => setIndex(i) : undefined}
            disabled={!img}
            aria-label={img ? `View image ${i + 1}` : undefined}
          >
            {img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
