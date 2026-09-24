import Link from "next/link";
import { MapPin, Briefcase } from "lucide-react";
import { productHref } from "@/lib/product-slug";

export type GridListing = {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
  category: string | null;
  location: string | null;
  listing_type?: string | null;
};

const SWATCH_BG = ["#2D2C28", "#DDDCD7", "#F3D38A", "#E8C0CB", "#C8CDA3", "#CDDCE6", "#93B3D3"];

const CAT_EMOJI: Record<string, string> = {
  textbooks: "📚", electronics: "💻", furniture: "🛋️", clothing: "👗",
  hostel: "🏠", tutoring: "📖", "tech-help": "🔧", design: "🎨",
  photography: "📸", delivery: "🚚", food: "🍱",
};

const CAT_LABELS: Record<string, string> = {
  textbooks: "Textbooks", electronics: "Electronics", furniture: "Furniture",
  clothing: "Clothing", other: "Other", tutoring: "Tutoring",
  "tech-help": "Tech Help", design: "Design", photography: "Photography",
  delivery: "Delivery", food: "Food", "services-other": "Other Service",
};

/**
 * Read-only card grid for the SEO landing pages. Deliberately has no wishlist
 * button or other client state so these routes stay fully static.
 */
export function ListingGrid({
  items,
  priceUnit,
  emptyMessage,
}: {
  items: GridListing[];
  priceUnit?: string;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <p style={{ fontSize: 14, color: "var(--ut-ink-mute)", padding: "24px 0", margin: 0 }}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="ut-grid">
      {items.map((item, i) => {
        const hasImage = !!item.images?.length;
        const isService = item.listing_type === "service";
        const emoji = (item.category && CAT_EMOJI[item.category]) ?? (isService ? "⚡" : "📦");
        return (
          <Link key={item.id} href={productHref(item.title, item.id)} className="ut-card">
            <div
              className="ut-card-media"
              style={{ background: hasImage ? undefined : SWATCH_BG[i % SWATCH_BG.length] }}
            >
              {hasImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.images![0]} alt={item.title} loading="lazy" />
              ) : (
                <span className="ut-card-media-emoji" aria-hidden>{emoji}</span>
              )}
              {isService && (
                <div className="ut-card-badges">
                  <span className="ut-badge dark"><Briefcase size={9} /> Service</span>
                </div>
              )}
            </div>

            <div className="ut-card-body">
              <h3 className="ut-card-title">{item.title}</h3>
              <div className="ut-card-meta">
                <span>{(item.category && CAT_LABELS[item.category]) ?? item.category ?? "Listing"}</span>
              </div>
              <div className="ut-card-price-row" style={{ marginTop: "auto" }}>
                <div>
                  <span className="ut-price">₦{Number(item.price).toLocaleString()}</span>
                  {priceUnit && <span className="ut-price-unit">{priceUnit}</span>}
                </div>
                <span className="ut-card-foot">
                  <MapPin size={10} />
                  {item.location ? item.location.split(",")[0] : "On campus"}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
