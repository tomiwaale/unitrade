import { ImageResponse } from "next/og";

/**
 * Default social / search preview card.
 *
 * Next applies this to every route that does not set its own openGraph image,
 * so links to the home page, catalogue and landing pages render a branded card
 * instead of a bare URL. Product pages override it with the listing photo.
 */
export const alt = "KolejSwap — buy, sell and swap at Nigerian universities";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0F8A4F 0%, #0A5F37 100%)",
          padding: 72,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="76" height="76" viewBox="0 0 46.06 46.06">
            <rect width="46.06" height="46.06" rx="14.49" ry="14.49" fill="#ffffff" />
            <path
              d="M31.53,17.33l2.54-8.35-8.5,1.98.99,1.06-5.38,5.04-8.21-1.38-.96,5.75,4.21.71-.02.08c.54.15,1.05.31,1.52.49.45.17.87.36,1.24.56.34.18.64.38.88.57.21.17.41.36.58.56.16.19.3.41.42.63.12.23.21.47.29.73.07.26.13.53.16.81.03.29.03.58.01.88-.02.31-.07.62-.14.92-.05.22-.13.43-.2.64l-1.13-.66-.04,8.73,7.58-4.32-1.33-.78c.08-.18.19-.35.26-.53.23-.57.41-1.17.55-1.77.14-.6.23-1.22.27-1.83.04-.63.03-1.25-.03-1.86-.06-.63-.18-1.25-.35-1.85-.18-.62-.42-1.22-.71-1.79-.21-.4-.45-.78-.72-1.15l5.26-4.92.99,1.06Z"
              fill="#0F8A4F"
            />
          </svg>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em" }}>
            KolejSwap
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              maxWidth: 900,
            }}
          >
            Buy, sell &amp; swap with students on your campus
          </div>
          <div style={{ fontSize: 30, marginTop: 22, opacity: 0.85, maxWidth: 880 }}>
            Nigeria&apos;s student marketplace — textbooks, laptops, hostel items and
            campus services from verified students.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 28, fontSize: 24, opacity: 0.9 }}>
          <div style={{ display: "flex" }}>Escrow protected</div>
          <div style={{ display: "flex", opacity: 0.5 }}>·</div>
          <div style={{ display: "flex" }}>NIN-verified sellers</div>
          <div style={{ display: "flex", opacity: 0.5 }}>·</div>
          <div style={{ display: "flex" }}>50+ Nigerian universities</div>
        </div>
      </div>
    ),
    size
  );
}
