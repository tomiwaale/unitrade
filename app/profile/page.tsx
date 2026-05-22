import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { CheckCircle2, MapPin, ArrowRight, Package, Star, Landmark } from "lucide-react";
import LocationDisplay from "@/components/ui/location-display";
import PayoutSetupCard from "./payout-setup";
import ProfileEdit from "./profile-edit";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function uniAbbr(name: string) {
  return name.split(" ").filter(w => w.length > 2).map(w => w[0]).join("").slice(0, 6).toUpperCase();
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

const SWATCH_BG: Record<number, string> = {
  0: "#2D2C28", 1: "#DDDCD7", 2: "#F3D38A",
  3: "#E8C0CB", 4: "#C8CDA3", 5: "#CDDCE6",
};
const CAT_EMOJI: Record<string, string> = {
  textbooks: "📚", electronics: "💻", furniture: "🛋️", clothing: "👗", other: "📦",
};

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: "Released",  color: "var(--ut-ink-soft)",    bg: "var(--ut-bg-sunken)" },
  disputed:  { label: "Disputed",  color: "#9B1C1C",               bg: "#FDEAEA"             },
  refunded:  { label: "Refunded",  color: "var(--ut-ink-mute)",    bg: "var(--ut-bg-sunken)" },
  paid:      { label: "In escrow", color: "var(--ut-primary-ink)", bg: "var(--ut-primary-tint)" },
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  // ─── Profile ───────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, university, phone, created_at, recipient_code, nin_verified, bank_name, account_name, account_number, school_id_status")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const initials = getInitials(profile.full_name ?? "U");
  const joinDate  = new Date(profile.created_at).toLocaleDateString("en-NG", { month: "short", year: "numeric" });

  // ─── Active listings ────────────────────────────────
  const { data: listings } = await supabase
    .from("products")
    .select("id, title, price, images, category, location")
    .eq("seller_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(6);

  // ─── Deal history (buyer side) ──────────────────────
  const { data: buyerOrders } = await supabase
    .from("orders")
    .select("id, amount, status, created_at, products(title, profiles(full_name))")
    .eq("buyer_id", user.id)
    .in("status", ["confirmed", "disputed", "refunded", "paid"])
    .order("created_at", { ascending: false })
    .limit(8);

  // ─── Deal history (seller side) ─────────────────────
  const { data: userProducts } = await supabase
    .from("products")
    .select("id")
    .eq("seller_id", user.id);

  const productIds = (userProducts ?? []).map((p: any) => p.id);

  let sellerOrders: any[] = [];
  if (productIds.length > 0) {
    const { data } = await supabase
      .from("orders")
      .select("id, amount, status, created_at, products(title), profiles!buyer_id(full_name)")
      .in("product_id", productIds)
      .neq("buyer_id", user.id)
      .in("status", ["confirmed", "disputed", "refunded", "paid"])
      .order("created_at", { ascending: false })
      .limit(8);
    sellerOrders = data ?? [];
  }

  const dealCount = (buyerOrders ?? []).filter(o => o.status === "confirmed").length
    + sellerOrders.filter(o => o.status === "confirmed").length;

  // ─── Seller rating ──────────────────────────────────
  const { data: reviewData } = await supabase
    .from("reviews")
    .select("rating")
    .eq("seller_id", user.id);

  const reviews = reviewData ?? [];
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  // Merge + sort deal history
  const allDeals = [
    ...(buyerOrders ?? []).map((o: any) => ({
      id: o.id,
      title: (o.products as any)?.title ?? "Deleted product",
      with:  (o.products as any)?.profiles?.full_name ?? "—",
      date:  o.created_at,
      status: o.status,
      amount: o.amount,
    })),
    ...sellerOrders.map((o: any) => ({
      id: o.id,
      title: (o.products as any)?.title ?? "Deleted product",
      with:  (o.profiles as any)?.full_name ?? "—",
      date:  o.created_at,
      status: o.status,
      amount: o.amount,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  return (
    <div className="ut-app">
      <Navbar />
      <main className="ut-main" style={{ maxWidth: 1100 }}>

        {/* ── Profile header ── */}
        <div style={{
          background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
          borderRadius: "var(--ut-radius-lg)", padding: "28px 32px",
          display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
          marginBottom: 36,
        }}>
          {/* Avatar */}
          <div style={{
            width: 78, height: 78, borderRadius: "50%", flexShrink: 0,
            background: "var(--ut-primary)", color: "white",
            display: "grid", placeItems: "center",
            fontFamily: "var(--ut-font-mono)", fontSize: 26, fontWeight: 700,
          }}>
            {initials}
          </div>

          {/* Name + info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ut-ink)" }}>
                {profile.full_name}
              </h1>
              {profile.school_id_status === "approved" && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
                  background: "var(--ut-primary-tint)", color: "var(--ut-primary-ink)",
                }}>
                  <CheckCircle2 size={11} /> Verified · {uniAbbr(profile.university ?? "")}
                </span>
              )}
              {profile.school_id_status === "pending" && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
                  background: "color-mix(in srgb, #ca8a04 12%, transparent)", color: "#92400e",
                }}>
                  ID under review
                </span>
              )}
            </div>
            <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--ut-ink-mute)" }}>
              {profile.university} · joined {joinDate}
            </p>
            <LocationDisplay />
            <div style={{ marginTop: 10 }}>
              <ProfileEdit
                fullName={profile.full_name ?? ""}
                phone={profile.phone ?? ""}
                university={profile.university ?? ""}
              />
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 36, flexShrink: 0, flexWrap: "wrap" }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "0 0 2px", fontSize: 26, fontWeight: 800, color: "var(--ut-ink)", fontFamily: "var(--ut-font-mono)", lineHeight: 1 }}>
                {dealCount}
              </p>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "var(--ut-ink-mute)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Deals
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "0 0 2px", fontSize: 26, fontWeight: 800, color: "var(--ut-ink)", fontFamily: "var(--ut-font-mono)", lineHeight: 1, display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                <Star size={16} style={{ color: "var(--ut-accent)", fill: avgRating ? "var(--ut-accent)" : "none" }} />
                {avgRating ?? "—"}
              </p>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "var(--ut-ink-mute)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {reviews.length > 0 ? `${reviews.length} review${reviews.length !== 1 ? "s" : ""}` : "Rating"}
              </p>
            </div>
            {profile.recipient_code && (
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: "0 0 2px", fontSize: 26, fontWeight: 800, color: "var(--ut-ink)", fontFamily: "var(--ut-font-mono)", lineHeight: 1 }}>
                  ✓
                </p>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "var(--ut-ink-mute)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Bank set up
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Payout setup ── */}
        <div style={{ marginBottom: 36 }}>
          <div className="ut-section-head" style={{ marginTop: 0, marginBottom: 12 }}>
            <div>
              <span className="ut-sub">Seller settings</span>
              <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Landmark size={18} /> Payout account
              </h2>
            </div>
          </div>
          <PayoutSetupCard
            existingBank={profile.bank_name ?? null}
            existingAccountName={profile.account_name ?? null}
            existingAccountNumber={profile.account_number ?? null}
          />
        </div>

        {/* ── Active listings ── */}
        <div className="ut-section-head" style={{ marginTop: 0 }}>
          <div>
            <span className="ut-sub">Your storefront</span>
            <h2>Active listings</h2>
          </div>
          <Link href="/listings" className="ut-chip">
            Manage all <ArrowRight size={12} />
          </Link>
        </div>

        {!listings || listings.length === 0 ? (
          <div style={{
            padding: "40px 24px", textAlign: "center",
            border: "1px dashed var(--ut-line)", borderRadius: "var(--ut-radius-lg)",
            background: "var(--ut-bg-card)", marginBottom: 32,
          }}>
            <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--ut-ink-mute)" }}>
              You have no active listings yet.
            </p>
            <Link href="/sell" className="ut-cta ut-cta-primary" style={{ fontSize: 13, padding: "9px 16px" }}>
              List an item
            </Link>
          </div>
        ) : (
          <div className="ut-grid" style={{ marginBottom: 36 }}>
            {listings.map((item: any, i: number) => {
              const hasImg = item.images && item.images.length > 0;
              const emoji  = CAT_EMOJI[item.category as string] ?? "📦";
              return (
                <Link key={item.id} href={`/product/${item.id}`} className="ut-card">
                  <div className="ut-card-media" style={{ background: hasImg ? undefined : SWATCH_BG[i % 6] }}>
                    {hasImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.images[0]} alt={item.title} />
                    ) : (
                      <span className="ut-card-media-emoji" aria-hidden>{emoji}</span>
                    )}
                    <div className="ut-card-badges">
                      <span className="ut-badge green">
                        <Package size={9} /> Escrow
                      </span>
                    </div>
                  </div>

                  <div className="ut-card-body">
                    <h3 className="ut-card-title">{item.title}</h3>
                    <div className="ut-card-meta">
                      <div className="ut-card-seller">
                        <span className="ut-avatar" style={{ background: "var(--ut-primary)", color: "white" }}>
                          {initials}
                        </span>
                        <span style={{ color: "var(--ut-ink-soft)" }}>
                          {profile.full_name?.split(" ")[0]}.
                        </span>
                      </div>
                    </div>
                    <div className="ut-card-price-row">
                      <span className="ut-price">₦{Number(item.price).toLocaleString()}</span>
                      <span className="ut-card-foot">
                        <MapPin size={10} />
                        {item.location?.split(",")[0] ?? "On campus"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Deal history ── */}
        <div className="ut-section-head" style={{ marginTop: 0 }}>
          <div>
            <span className="ut-sub">Recent activity</span>
            <h2>Deal history</h2>
          </div>
          <Link href="/orders" className="ut-chip">
            All orders <ArrowRight size={12} />
          </Link>
        </div>

        {allDeals.length === 0 ? (
          <div style={{
            padding: "40px 24px", textAlign: "center",
            border: "1px dashed var(--ut-line)", borderRadius: "var(--ut-radius-lg)",
            background: "var(--ut-bg-card)",
          }}>
            <p style={{ margin: 0, fontSize: 14, color: "var(--ut-ink-mute)" }}>
              No completed deals yet. Start buying or selling!
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {allDeals.map((deal, idx) => {
              const st     = STATUS_LABEL[deal.status] ?? STATUS_LABEL.confirmed;
              const wi     = getInitials(deal.with);
              const isLast = idx === allDeals.length - 1;
              return (
                <Link
                  key={`${deal.id}-${idx}`}
                  href={`/orders/${deal.id}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 16,
                    padding: "16px 20px",
                    background: "var(--ut-bg-card)",
                    borderTop: idx === 0 ? "1px solid var(--ut-line)" : "none",
                    borderLeft: "1px solid var(--ut-line)",
                    borderRight: "1px solid var(--ut-line)",
                    borderBottom: "1px solid var(--ut-line)",
                    borderRadius: idx === 0 && isLast
                      ? "var(--ut-radius)"
                      : idx === 0
                        ? "var(--ut-radius) var(--ut-radius) 0 0"
                        : isLast
                          ? "0 0 var(--ut-radius) var(--ut-radius)"
                          : "0",
                    textDecoration: "none",
                    transition: "background 0.12s",
                  }}
                >
                  {/* Counterparty avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                    background: "var(--ut-bg-sunken)", color: "var(--ut-ink-soft)",
                    display: "grid", placeItems: "center",
                    fontFamily: "var(--ut-font-mono)", fontSize: 12, fontWeight: 700,
                  }}>
                    {wi}
                  </div>

                  {/* Title + who */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 500, color: "var(--ut-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {deal.title}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--ut-ink-mute)" }}>
                      with {deal.with} · {shortDate(deal.date)}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span style={{
                    padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 500,
                    color: st.color, background: st.bg, flexShrink: 0,
                    border: "1px solid color-mix(in srgb, currentColor 15%, transparent)",
                  }}>
                    {st.label}
                  </span>

                  {/* Amount */}
                  <span style={{
                    fontFamily: "var(--ut-font-mono)", fontWeight: 700, fontSize: 15,
                    color: "var(--ut-ink)", flexShrink: 0, minWidth: 80, textAlign: "right",
                  }}>
                    ₦{Number(deal.amount).toLocaleString()}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Quick links */}
        <div style={{
          marginTop: 32, display: "flex", gap: 10, flexWrap: "wrap",
          borderTop: "1px solid var(--ut-line)", paddingTop: 24,
        }}>
          {(!profile.school_id_status || profile.school_id_status === "none" || profile.school_id_status === "rejected") && (
            <Link href="/kyc" className="ut-cta ut-cta-primary" style={{ fontSize: 13, padding: "9px 16px" }}>
              <CheckCircle2 size={14} /> Upload school ID
            </Link>
          )}
          <Link href="/sell" className="ut-cta ut-cta-ghost" style={{ fontSize: 13, padding: "9px 16px" }}>
            List an item
          </Link>
          <Link href="/orders" className="ut-cta ut-cta-ghost" style={{ fontSize: 13, padding: "9px 16px" }}>
            All orders
          </Link>
          <Link href="/support" className="ut-cta ut-cta-ghost" style={{ fontSize: 13, padding: "9px 16px" }}>
            Contact Support
          </Link>
        </div>

        <div className="ut-ticker">
          <span>KolejSwap</span>
          <span>{profile.full_name}</span>
          <span>{profile.university}</span>
          {profile.school_id_status === "approved" && <span>ID <b>verified</b></span>}
        </div>
      </main>
    </div>
  );
}
