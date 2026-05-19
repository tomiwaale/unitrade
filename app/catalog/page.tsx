import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import {
  MapPin, BookOpen, Laptop, Sofa, Shirt, Package,
  PlusCircle, LayoutGrid, Briefcase, LayoutList,
  SlidersHorizontal, ArrowLeftRight,
} from "lucide-react";
import WishlistBtn from "./wishlist-btn";

const CATEGORIES = [
  { label: "All",         value: null,          emoji: "🏷️", icon: LayoutGrid  },
  { label: "Textbooks",   value: "textbooks",   emoji: "📚", icon: BookOpen    },
  { label: "Electronics", value: "electronics", emoji: "💻", icon: Laptop      },
  { label: "Furniture",   value: "furniture",   emoji: "🛋️", icon: Sofa        },
  { label: "Clothing",    value: "clothing",    emoji: "👗", icon: Shirt       },
  { label: "Other",       value: "other",       emoji: "📦", icon: Package     },
];

const SERVICE_CATS = [
  { label: "All Services", value: null,           emoji: "⚡", icon: Briefcase },
  { label: "Tutoring",     value: "tutoring",     emoji: "📖", icon: BookOpen  },
  { label: "Tech Help",    value: "tech-help",    emoji: "🔧", icon: Laptop    },
  { label: "Design",       value: "design",       emoji: "🎨", icon: Package   },
  { label: "Photography",  value: "photography",  emoji: "📸", icon: Package   },
  { label: "Delivery",     value: "delivery",     emoji: "🚚", icon: Package   },
  { label: "Food",         value: "food",         emoji: "🍱", icon: Package   },
];

const CAT_LABELS: Record<string, string> = {
  textbooks: "Textbooks", electronics: "Electronics", furniture: "Furniture",
  clothing: "Clothing", other: "Other",
  tutoring: "Tutoring", "tech-help": "Tech Help", design: "Design",
  photography: "Photography", delivery: "Delivery", food: "Food",
  "services-other": "Other Service",
};

const SWATCHES = ["ink", "silver", "amber", "rose", "olive", "ice", "ocean"];
const SWATCH_BG: Record<string, string> = {
  ink: "#2D2C28", silver: "#DDDCD7", amber: "#F3D38A",
  rose: "#E8C0CB", olive: "#C8CDA3", ice: "#CDDCE6", ocean: "#93B3D3",
};

function categoryToEmoji(cat: string | null, isService: boolean): string {
  if (isService) return "⚡";
  const map: Record<string, string> = {
    textbooks: "📚", electronics: "💻", furniture: "🛋️",
    clothing: "👗", other: "📦",
  };
  return cat ? (map[cat] ?? "📦") : "🏷️";
}

function buildHref(base: Record<string, string | null>, overrides: Record<string, string | null>) {
  const params = new URLSearchParams();
  const merged = { ...base, ...overrides };
  for (const [k, v] of Object.entries(merged)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return `/catalog${qs ? `?${qs}` : ""}`;
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const search = await searchParams;

  const categoryFilter = search.category ? (search.category as string).toLowerCase() : null;
  const typeFilter     = search.type === "services" ? "service" : "item";
  const isServices     = typeFilter === "service";
  const qFilter        = search.q ? (search.q as string) : null;
  const sortFilter     = (search.sort as string) || "recent";
  const maxPrice       = search.max_price ? Number(search.max_price) : null;
  const todayOnly      = search.today === "1";
  const viewMode       = (search.view as string) || "grid";
  const openToFilter   = (search.open_to as string) || null;

  const baseParams: Record<string, string | null> = {
    type:      isServices ? "services" : null,
    category:  categoryFilter,
    sort:      sortFilter !== "recent" ? sortFilter : null,
    max_price: maxPrice ? String(maxPrice) : null,
    today:     todayOnly ? "1" : null,
    open_to:   openToFilter,
    q:         qFilter,
  };

  const cats    = isServices ? SERVICE_CATS : CATEGORIES;
  const typeBase = isServices ? "services" : null;

  // ─── Fetch category counts ───
  const { data: countRows } = await supabase
    .from("products")
    .select("category")
    .eq("status", "active")
    .eq("listing_type", typeFilter);

  const countMap: Record<string, number> = {};
  let totalCount = 0;
  for (const row of countRows ?? []) {
    totalCount++;
    const c = row.category ?? "other";
    countMap[c] = (countMap[c] ?? 0) + 1;
  }

  // ─── Fetch user name + wishlist for personalization ───
  let firstName: string | null = null;
  let wishlistIds = new Set<string>();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [profileRes, wishlistRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
        supabase.from("wishlists").select("product_id").eq("user_id", user.id),
      ]);
      firstName = profileRes.data?.full_name?.split(" ")[0] ?? null;
      wishlistIds = new Set(wishlistRes.data?.map((w) => w.product_id) ?? []);
    }
  } catch {}

  // ─── Fetch products ───
  let query = supabase
    .from("products")
    .select("id, title, price, images, category, location, listing_type, open_to, created_at")
    .eq("status", "active")
    .eq("listing_type", typeFilter);

  if (categoryFilter) query = query.eq("category", categoryFilter);
  if (qFilter)        query = query.ilike("title", `%${qFilter}%`);
  if (maxPrice)       query = query.lte("price", maxPrice);
  if (openToFilter)   query = query.eq("open_to", openToFilter);
  if (todayOnly) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    query = query.gte("created_at", today.toISOString());
  }

  if (sortFilter === "price-asc")  query = query.order("price", { ascending: true });
  else if (sortFilter === "price-desc") query = query.order("price", { ascending: false });
  else                             query = query.order("created_at", { ascending: false });

  const { data: products } = await query;
  const items = products ?? [];

  const SORT_CHIPS = [
    { label: "Recently posted", value: "recent",       key: "sort" },
    { label: "Under ₦5k",       value: "5000",         key: "max_price" },
    { label: "Posted today",    value: "1",             key: "today" },
    { label: "Price: Low–High", value: "price-asc",    key: "sort" },
    { label: "Price: High–Low", value: "price-desc",   key: "sort" },
  ];

  const SWAP_CHIPS = [
    { label: "Cash or swap", value: "cash-or-swap", key: "open_to" },
    { label: "Swap only",    value: "swap-only",    key: "open_to" },
  ];

  return (
    <div className="ut-app">
      <Navbar />
      <main className="ut-main">

        {/* ── Type tabs + Post CTA ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: "var(--ut-bg-sunken)" }}>
            {[
              { label: "Items",    href: "/catalog",               active: !isServices },
              { label: "Services", href: "/catalog?type=services", active: isServices },
            ].map((tab) => (
              <Link key={tab.label} href={tab.href} style={{
                padding: "7px 16px", borderRadius: 9, fontSize: 13.5,
                fontWeight: tab.active ? 600 : 400,
                textDecoration: "none",
                background: tab.active ? "var(--ut-bg-card)" : "transparent",
                color: tab.active ? "var(--ut-ink)" : "var(--ut-ink-mute)",
                boxShadow: tab.active ? "var(--ut-shadow-sm)" : "none",
                transition: "all 0.15s ease",
              }}>
                {tab.label}
              </Link>
            ))}
          </div>
          <Link href="/sell" className="ut-cta ut-cta-primary" style={{ fontSize: 13, padding: "8px 14px" }}>
            <PlusCircle size={14} />
            {isServices ? "Offer a Service" : "List an item"}
          </Link>
        </div>

        {/* ── Category pills ── */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 6 }}>
          {cats.map((cat) => {
            const isActive = cat.value === null ? !categoryFilter : cat.value === categoryFilter;
            const count    = cat.value === null ? totalCount : (countMap[cat.value] ?? 0);
            const href     = buildHref(baseParams, { category: cat.value, type: typeBase });
            return (
              <Link
                key={cat.label}
                href={href}
                className="ut-cat"
                data-active={isActive ? "true" : "false"}
                style={{ flexShrink: 0 }}
              >
                <span className="ut-cat-icon">
                  <cat.icon size={16} />
                </span>
                <span className="ut-cat-text">
                  <b>{cat.label}</b>
                  <span>{count} listing{count !== 1 ? "s" : ""}</span>
                </span>
              </Link>
            );
          })}
        </div>

        {/* ── Filter rail ── */}
        <div className="ut-filter-rail" style={{ marginBottom: 20, flexWrap: "wrap", rowGap: 8 }}>
          <span className="label">Sort by</span>
          {SORT_CHIPS.map((chip) => {
            let isActive = false;
            if (chip.key === "sort") {
              isActive = chip.value === "recent"
                ? sortFilter === "recent" && !maxPrice && !todayOnly
                : sortFilter === chip.value;
            } else if (chip.key === "max_price") {
              isActive = maxPrice === Number(chip.value);
            } else if (chip.key === "today") {
              isActive = todayOnly;
            }
            const override: Record<string, string | null> =
              chip.key === "sort"      ? { sort: chip.value === "recent" ? null : chip.value, max_price: null, today: null } :
              chip.key === "max_price" ? { max_price: maxPrice === Number(chip.value) ? null : chip.value, sort: null, today: null } :
                                         { today: todayOnly ? null : "1", sort: null, max_price: null };
            return (
              <Link
                key={chip.label}
                href={buildHref(baseParams, override)}
                className="ut-chip"
                data-active={isActive ? "true" : "false"}
              >
                {chip.label}
              </Link>
            );
          })}

          {/* Swap filter chips */}
          <span style={{ width: 1, height: 18, background: "var(--ut-line)", margin: "0 2px", alignSelf: "center" }} />
          <span className="label" style={{ margin: 0 }}>Deal type</span>
          {SWAP_CHIPS.map((chip) => {
            const isActive = openToFilter === chip.value;
            const override: Record<string, string | null> = {
              open_to: isActive ? null : chip.value,
            };
            return (
              <Link
                key={chip.label}
                href={buildHref(baseParams, override)}
                className="ut-chip"
                data-active={isActive ? "true" : "false"}
                style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
              >
                <ArrowLeftRight size={11} />
                {chip.label}
              </Link>
            );
          })}

          <button style={{
            marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 12.5, padding: "6px 12px", borderRadius: 999,
            border: "1px solid var(--ut-line)", background: "transparent",
            color: "var(--ut-ink-soft)", cursor: "pointer",
          }}>
            <SlidersHorizontal size={12} /> More filters
          </button>
        </div>

        {/* ── Section header ── */}
        <div className="ut-section-head" style={{ marginTop: 4 }}>
          <div>
            <span className="ut-sub">On campus now</span>
            <h2>
              {qFilter
                ? `Results for "${qFilter}"`
                : categoryFilter
                  ? (CAT_LABELS[categoryFilter] ?? categoryFilter)
                  : firstName
                    ? `For you, ${firstName}`
                    : isServices ? "Services" : "All listings"
              }
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "var(--ut-font-mono)", fontSize: 12, color: "var(--ut-ink-mute)" }}>
              {items.length} {isServices ? "service" : "listing"}{items.length !== 1 ? "s" : ""}
            </span>
            {/* View toggle */}
            <div style={{ display: "flex", gap: 2, background: "var(--ut-bg-sunken)", borderRadius: 8, padding: 3 }}>
              <Link href={buildHref(baseParams, { view: null })} style={{
                display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 6,
                background: viewMode !== "list" ? "var(--ut-bg-card)" : "transparent",
                color: viewMode !== "list" ? "var(--ut-ink)" : "var(--ut-ink-mute)",
                boxShadow: viewMode !== "list" ? "var(--ut-shadow-sm)" : "none",
              }}>
                <LayoutGrid size={14} />
              </Link>
              <Link href={buildHref(baseParams, { view: "list" })} style={{
                display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 6,
                background: viewMode === "list" ? "var(--ut-bg-card)" : "transparent",
                color: viewMode === "list" ? "var(--ut-ink)" : "var(--ut-ink-mute)",
                boxShadow: viewMode === "list" ? "var(--ut-shadow-sm)" : "none",
              }}>
                <LayoutList size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Grid / List ── */}
        {items.length === 0 ? (
          <div style={{
            padding: "60px 40px", textAlign: "center",
            border: "1px dashed var(--ut-line)", borderRadius: "var(--ut-radius-lg)",
            background: "var(--ut-bg-card)",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{isServices ? "⚡" : "🏷️"}</div>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--ut-ink-mute)" }}>
              No {isServices ? "services" : "listings"} match those filters yet.
            </p>
            <Link href="/sell" className="ut-cta ut-cta-primary" style={{ fontSize: 13, padding: "9px 16px" }}>
              {isServices ? "Offer a Service" : "List the first item"}
            </Link>
          </div>
        ) : viewMode === "list" ? (
          /* ── List view ── */
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((item) => {
              const emoji  = categoryToEmoji(item.category, item.listing_type === "service");
              const hasImg = item.images && item.images.length > 0;
              return (
                <Link key={item.id} href={`/product/${item.id}`} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px", borderRadius: "var(--ut-radius)",
                  background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
                  textDecoration: "none", transition: "border-color 0.15s, transform 0.15s",
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 10, flexShrink: 0,
                    overflow: "hidden", background: "var(--ut-bg-sunken)",
                    display: "grid", placeItems: "center", fontSize: 24,
                  }}>
                    {hasImg
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={item.images[0]} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : emoji
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--ut-ink)" }}>
                      {item.title}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--ut-ink-mute)", display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={10} /> {item.location ? item.location.split(",")[0] : "On campus"} · {CAT_LABELS[item.category] ?? item.category}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {item.open_to && item.open_to !== "cash-only" && (
                      <span className="ut-badge" style={{ fontSize: 10 }}>
                        <ArrowLeftRight size={9} /> SWAP
                      </span>
                    )}
                    <span style={{ fontFamily: "var(--ut-font-mono)", fontWeight: 600, fontSize: 16, color: "var(--ut-ink)" }}>
                      ₦{item.price.toLocaleString()}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* ── Grid view ── */
          <div className="ut-grid">
            {items.map((item, i) => {
              const swatch  = SWATCHES[i % SWATCHES.length];
              const emoji   = categoryToEmoji(item.category, item.listing_type === "service");
              const hasImage = item.images && item.images.length > 0;
              return (
                <Link key={item.id} href={`/product/${item.id}`} className="ut-card ut-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="ut-card-media" style={{ background: hasImage ? undefined : SWATCH_BG[swatch] }}>
                    {hasImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.images[0]} alt={item.title} />
                    ) : (
                      <span className="ut-card-media-emoji" aria-hidden>{emoji}</span>
                    )}
                    <div className="ut-card-badges">
                      <div style={{ display: "flex", gap: 6 }}>
                        {item.listing_type === "service" && (
                          <span className="ut-badge dark"><Briefcase size={9} /> Service</span>
                        )}
                        {item.open_to && item.open_to !== "cash-only" && (
                          <span className="ut-badge"><ArrowLeftRight size={9} /> SWAP</span>
                        )}
                      </div>
                      <WishlistBtn productId={item.id} initialLiked={wishlistIds.has(item.id)} />
                    </div>
                  </div>

                  <div className="ut-card-body">
                    <h3 className="ut-card-title">{item.title}</h3>
                    <div className="ut-card-meta">
                      <span>{CAT_LABELS[item.category] ?? item.category}</span>
                    </div>
                    <div className="ut-card-price-row">
                      <div>
                        <span className="ut-price">₦{item.price.toLocaleString()}</span>
                        {item.listing_type === "service" && (
                          <span className="ut-price-unit">/ rate</span>
                        )}
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
        )}

        <div className="ut-ticker">
          <span>CampSwap</span>
          <span><b>{items.length}</b> listings shown</span>
          <span>Escrow <b>protected</b></span>
          <span>NIN <b>verified</b> sellers</span>
        </div>
      </main>
    </div>
  );
}
