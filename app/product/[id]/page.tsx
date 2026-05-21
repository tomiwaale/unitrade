import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  MapPin, ChevronLeft, Shield, Lock, ArrowLeftRight, Star,
} from "lucide-react";
import BuyButton from "./buy-button";
import MessageSellerBtn from "./message-seller-btn";
import ProposeSwapBtn from "./propose-swap-btn";
import WishlistBtn from "@/app/catalog/wishlist-btn";
import { Navbar } from "@/components/ui/navbar";

const CAT_LABELS: Record<string, string> = {
  textbooks: "Textbooks", electronics: "Electronics", furniture: "Furniture",
  clothing: "Clothing", fashion: "Fashion", hostel: "Hostel",
  services: "Services", other: "Other",
  tutoring: "Tutoring", "tech-help": "Tech Help", design: "Design",
  photography: "Photography", delivery: "Delivery", food: "Food",
  "services-other": "Other Service",
};

const CONDITION_LABELS: Record<string, string> = {
  "new": "New", "like-new": "Like New", "good": "Good", "fair": "Fair", "poor": "Poor",
};

const SWATCH_BG: Record<string, string> = {
  textbooks: "#2D2C28", electronics: "#DDDCD7", furniture: "#F3D38A",
  clothing: "#E8C0CB", fashion: "#E8C0CB", hostel: "#C5D5E8",
  services: "#C8CDA3", other: "#EFEBE3",
};

const CAT_EMOJI: Record<string, string> = {
  textbooks: "📚", electronics: "💻", furniture: "🛋️",
  clothing: "👗", fashion: "👗", hostel: "🏠", services: "⚡", other: "📦",
};

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function abbreviateName(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("title, description, price, images, category, profiles(university)")
    .eq("id", id)
    .single();

  if (!product) return { title: "Listing not found · KolejSwap" };

  const appUrl =
    process.env.APP_URL?.startsWith("http")
      ? process.env.APP_URL
      : "https://kolejswap.com";

  const university  = (product.profiles as { university?: string } | null)?.university ?? "";
  const uniSuffix   = university ? ` · ${university}` : "";
  const title       = `${product.title} — ₦${Number(product.price).toLocaleString()}${uniSuffix} | KolejSwap`;
  const baseDesc    = product.description?.slice(0, 120) ?? "";
  const ellipsis    = (product.description?.length ?? 0) > 120 ? "…" : "";
  const description = `${baseDesc}${ellipsis}${university ? ` Listed by a student at ${university}.` : ""} Buy safely with escrow on KolejSwap.`;
  const image       = product.images?.[0];
  const catLabel    = CAT_LABELS[product.category] ?? product.category ?? "Items";

  return {
    title,
    description,
    keywords: [
      `buy ${product.title} Nigeria`,
      `${product.title} for sale Nigeria`,
      `cheap ${catLabel.toLowerCase()} Nigeria`,
      `student ${catLabel.toLowerCase()} Nigeria`,
      university ? `buy ${catLabel.toLowerCase()} ${university}` : "",
      "student marketplace Nigeria",
      "buy campus items Nigeria",
    ].filter(Boolean),
    alternates: { canonical: `${appUrl}/product/${id}` },
    openGraph: {
      title,
      description,
      url: `${appUrl}/product/${id}`,
      siteName: "KolejSwap",
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: product.title }] } : {}),
      type: "website",
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: product, error } = await supabase
    .from("products")
    .select("*, profiles(full_name, university)")
    .eq("id", id)
    .single();

  if (error || !product) notFound();

  // Deal count for this seller
  const { data: sellerProductIds } = await supabase
    .from("products")
    .select("id")
    .eq("seller_id", product.seller_id);

  const ids = (sellerProductIds ?? []).map((p: any) => p.id);
  let dealCount = 0;
  if (ids.length > 0) {
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("product_id", ids)
      .in("status", ["confirmed", "released"]);
    dealCount = count ?? 0;
  }

  // Unread messages + wishlist state — only needed when logged in
  let unreadCount = 0;
  let isWishlisted = false;
  if (user) {
    const [convRes, wishRes] = await Promise.all([
      supabase
        .from("conversations")
        .select("id")
        .eq("product_id", product.id)
        .eq("buyer_id", user.id)
        .maybeSingle(),
      supabase
        .from("wishlists")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", product.id)
        .maybeSingle(),
    ]);

    isWishlisted = !!wishRes.data;

    if (convRes.data) {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", convRes.data.id)
        .neq("sender_id", user.id)
        .eq("read", false);
      unreadCount = count ?? 0;
    }
  }

  const isOwner     = user?.id === product.seller_id;
  const isActive    = product.status === "active";
  const isService   = product.listing_type === "service";
  const acceptsSwap = product.open_to && product.open_to !== "cash-only";
  const hasImages   = product.images && product.images.length > 0;
  const bgColor     = SWATCH_BG[product.category] ?? "#EFEBE3";
  const emoji       = CAT_EMOJI[product.category as string] ?? "📦";

  const sellerName      = product.profiles?.full_name ?? "Seller";
  const sellerFirstName = sellerName.split(" ")[0];
  const sellerAbbrev    = abbreviateName(sellerName);
  const sellerInitials  = getInitials(sellerName);
  const sellerUniversity = product.profiles?.university ?? "";
  const meetupLocation  = product.location ? product.location.split(",")[0] : null;
  const catLabel        = CAT_LABELS[product.category] ?? product.category ?? "";
  const conditionLabel  = product.condition ? (CONDITION_LABELS[product.condition] ?? product.condition) : null;

  // Always show 4 thumbnail slots
  const thumbImages: (string | null)[] = [
    ...(product.images ?? []).slice(0, 4),
    ...Array(Math.max(0, 4 - (product.images?.length ?? 0))).fill(null),
  ];

  const appUrl =
    process.env.APP_URL?.startsWith("http")
      ? process.env.APP_URL
      : "https://kolejswap.com";
  const sellerNameRaw = product.profiles?.full_name ?? "KolejSwap Seller";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.images ?? [],
    url: `${appUrl}/product/${product.id}`,
    brand: { "@type": "Brand", name: "KolejSwap" },
    offers: {
      "@type": "Offer",
      priceCurrency: "NGN",
      price: Number(product.price).toFixed(2),
      availability:
        product.status === "active"
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      seller: { "@type": "Person", name: sellerNameRaw },
      url: `${appUrl}/product/${product.id}`,
    },
    ...(product.condition
      ? { itemCondition: `https://schema.org/${product.condition === "new" ? "NewCondition" : "UsedCondition"}` }
      : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home",   item: appUrl },
      { "@type": "ListItem", position: 2, name: "Browse", item: `${appUrl}/catalog` },
      { "@type": "ListItem", position: 3, name: catLabel, item: `${appUrl}/catalog?category=${product.category}` },
      { "@type": "ListItem", position: 4, name: product.title, item: `${appUrl}/product/${product.id}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    <div className="ut-app">
      <Navbar />
      <main className="ut-main">
        <Link href="/catalog" className="ut-detail-back">
          <ChevronLeft size={15} /> Back to browse
        </Link>

        <div className="ut-detail">
          {/* ── Left: media ── */}
          <div>
            <div className="ut-detail-media" style={{ background: hasImages ? undefined : bgColor }}>
              {hasImages ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[0]} alt={product.title} />
              ) : (
                <span className="emoji" aria-hidden>{emoji}</span>
              )}

              {/* Top-left badge */}
              <div className="ut-card-badges" style={{ top: 16, left: 16, right: 16 }}>
                <div>
                  {acceptsSwap && isActive && (
                    <span className="ut-badge dark">
                      <ArrowLeftRight size={10} /> Open to swap
                    </span>
                  )}
                  {!isActive && (
                    <span className="ut-badge dark">
                      {isService ? "Unavailable" : "Sold"}
                    </span>
                  )}
                </div>
                {/* Wishlist heart */}
                <WishlistBtn
                  productId={product.id}
                  initialLiked={isWishlisted}
                  isLoggedIn={!!user}
                  size={15}
                />
              </div>
            </div>

            {/* Thumbnail strip — always 4 slots */}
            <div className="ut-detail-thumbs" style={{ marginTop: 12 }}>
              {thumbImages.map((img, i) => (
                <div
                  key={i}
                  className={`thumb${i === 0 ? " active" : ""}`}
                  style={{ background: img ? undefined : "var(--ut-bg-sunken)" }}
                >
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: info ── */}
          <div className="ut-detail-info">
            {/* Category · Condition breadcrumb */}
            <p style={{
              margin: "0 0 10px", fontFamily: "var(--ut-font-mono)", fontSize: 11,
              color: "var(--ut-ink-mute)", textTransform: "uppercase", letterSpacing: "0.12em",
            }}>
              {catLabel}{conditionLabel ? ` · ${conditionLabel}` : ""}
            </p>

            <h1>{product.title}</h1>

            {/* Price */}
            <div style={{ margin: "14px 0 16px" }}>
              <span className="ut-price" style={{ fontSize: 36 }}>
                ₦{product.price.toLocaleString()}
              </span>
              {isService && <span className="ut-price-unit" style={{ marginLeft: 8 }}>starting rate</span>}
            </div>

            {/* Tags */}
            <div className="ut-detail-tags" style={{ marginTop: 0 }}>
              {acceptsSwap && (
                <span className="ut-tag green" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <ArrowLeftRight size={11} />
                  {product.open_to === "swap-only" ? "Swap only" : "Open to swap"}
                </span>
              )}
              {meetupLocation && (
                <span className="ut-tag" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <MapPin size={10} /> {meetupLocation}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="ut-detail-blurb">{product.description}</p>

            {/* Seller card */}
            <div className="ut-detail-seller">
              <div
                className="ut-avatar"
                style={{
                  width: 44, height: 44, fontSize: 14,
                  background: "var(--ut-primary)", color: "white",
                  borderRadius: "50%",
                }}
              >
                {sellerInitials}
              </div>
              <div className="ut-seller-meta">
                <b>{sellerAbbrev}</b>
                <span>
                  {[sellerUniversity, meetupLocation].filter(Boolean).join(" · ")}
                </span>
              </div>
              <div className="ut-seller-stat" style={{ textAlign: "right" }}>
                <b style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                  <Star size={12} style={{ color: "var(--ut-yellow)", fill: "var(--ut-yellow)" }} />
                  4.7
                </b>
                <span>{dealCount} deal{dealCount !== 1 ? "s" : ""}</span>
              </div>
            </div>

            {/* CTAs */}
            {isActive ? (
              isOwner ? (
                <button
                  disabled
                  className="ut-cta"
                  style={{
                    width: "100%", justifyContent: "center",
                    background: "var(--ut-bg-sunken)", color: "var(--ut-ink-mute)",
                    cursor: "not-allowed", borderRadius: 12, padding: "14px 16px",
                  }}
                >
                  This is your listing
                </button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {!isService && <BuyButton productId={product.id} price={product.price} />}
                    {user ? (
                      <MessageSellerBtn
                        productId={product.id}
                        sellerId={product.seller_id}
                        sellerFirstName={sellerFirstName}
                        unreadCount={unreadCount}
                      />
                    ) : (
                      <Link href="/login" className="ut-cta ut-cta-ghost" style={{ justifyContent: "center", borderRadius: 12, padding: "14px 16px" }}>
                        Sign in to message
                      </Link>
                    )}
                    {isService && (
                      <div style={{ gridColumn: "span 2", fontSize: 12.5, color: "var(--ut-ink-mute)", textAlign: "center" }}>
                        Message the seller to discuss pricing and availability.
                      </div>
                    )}
                  </div>

                  {acceptsSwap && !isService && user && (
                    <ProposeSwapBtn
                      productId={product.id}
                      sellerId={product.seller_id}
                      productTitle={product.title}
                    />
                  )}
                </div>
              )
            ) : (
              <button
                disabled
                className="ut-cta"
                style={{
                  width: "100%", justifyContent: "center", marginTop: 18,
                  background: "var(--ut-bg-sunken)", color: "var(--ut-ink-mute)",
                  cursor: "not-allowed", borderRadius: 12, padding: "14px 16px",
                }}
              >
                {isService ? "Service unavailable" : "Item sold"}
              </button>
            )}

            {/* Trust row */}
            <div className="ut-trust-row" style={{ marginTop: 18 }}>
              <div>
                <Shield size={15} style={{ color: "var(--ut-primary)" }} />
                <b>Verified student</b>
                <span>Confirmed UNILAG ID on file</span>
              </div>
              <div>
                <Lock size={15} style={{ color: "var(--ut-primary)" }} />
                <b>Escrow holds payment</b>
                <span>Funds released after handoff</span>
              </div>
              <div>
                <MapPin size={15} style={{ color: "var(--ut-primary)" }} />
                <b>Safe meetup</b>
                <span>
                  {meetupLocation
                    ? `Suggested: ${meetupLocation} lobby, daytime`
                    : "Arrange campus exchange"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
    </>
  );
}
