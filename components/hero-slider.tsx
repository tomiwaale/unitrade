"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Zap, ArrowRight } from "lucide-react";

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  image_url?: string;
  highlight?: string;
  cta_label: string;
  cta_href: string;
}

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: "default-1",
    title: "Buy, sell, or swap with students next door.",
    highlight: "swap",
    subtitle: "",
    cta_label: "Browse listings",
    cta_href: "/catalog",
  },
  {
    id: "default-2",
    title: "Find textbooks, electronics & essentials near you.",
    subtitle: "Hundreds of student listings — no middleman, no markup.",
    cta_label: "Browse listings",
    cta_href: "/catalog",
  },
  {
    id: "default-3",
    title: "Earn extra cash from things you no longer need.",
    subtitle: "List for free — get paid securely via escrow.",
    cta_label: "Post a listing",
    cta_href: "/sell",
  },
];

interface Props {
  slides: HeroSlide[];
  activeCount: string;
  interval?: number; // seconds
}

function renderTitle(title: string, highlight?: string) {
  if (!highlight) return <>{title}</>;
  const parts = title.split(new RegExp(`(${highlight})`, "i"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase()
          ? <em key={i}>{part}</em>
          : part
      )}
    </>
  );
}

export default function HeroSlider({ slides, activeCount, interval = 10 }: Props) {
  const allSlides = slides.length > 0 ? slides : DEFAULT_SLIDES;
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((i) => (i + 1) % allSlides.length);
  }, [allSlides.length]);

  useEffect(() => {
    if (allSlides.length <= 1) return;
    const t = setInterval(next, interval * 1000);
    return () => clearInterval(t);
  }, [allSlides.length, interval, next]);

  const slide = allSlides[current];
  const hasImage = !!slide.image_url;

  return (
    <div className="ut-hero-main ut-hero-slider">
      {hasImage ? (
        /* Image-only mode: full clickable banner, no overlay, no text */
        // eslint-disable-next-line @next/next/no-img-element
        <a
          href={slide.cta_href}
          style={{ position: "absolute", inset: 0, display: "block", zIndex: 1 }}
          aria-label={slide.title || slide.cta_label}
        >
          <img key={slide.id} src={slide.image_url} alt={slide.title || ""} className="ut-slider-bg" style={{ cursor: "pointer" }} />
        </a>
      ) : (
        /* Text-only mode: standard hero layout */
        <>
          <div style={{ position: "relative", zIndex: 1 }}>
            <span className="ut-hero-eyebrow">Live · Campus Marketplace</span>
            <h1 className="ut-hero-title">
              {renderTitle(slide.title, slide.highlight)}
            </h1>
            {slide.subtitle && (
              <p style={{ margin: "10px 0 0", fontSize: 14, opacity: 0.85, maxWidth: "38ch", lineHeight: 1.5 }}>
                {slide.subtitle}
              </p>
            )}
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="ut-hero-meta" style={{ marginBottom: 16 }}>
              <span><b>{activeCount}</b> active listings</span>
              <span><b>₦0</b> listing fees</span>
              <span><b>Escrow</b> protected</span>
            </div>
            <div className="ut-hero-cta-row">
              <Link href="/sell" className="ut-cta">
                <Zap size={14} /> Post a listing
              </Link>
              <Link href={slide.cta_href} className="ut-cta ut-cta-ghost">
                <ArrowRight size={14} /> {slide.cta_label}
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Dot indicators */}
      {allSlides.length > 1 && (
        <div className="ut-slider-dots" style={{ zIndex: 2 }}>
          {allSlides.map((_, i) => (
            <button
              key={i}
              className={`ut-slider-dot${i === current ? " active" : ""}`}
              onClick={(e) => { e.preventDefault(); setCurrent(i); }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
