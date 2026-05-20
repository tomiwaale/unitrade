import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { ArrowLeftRight, ArrowRight, Clock, CheckCircle2, XCircle, Ban, Tag, Plus } from "lucide-react";
import { SellerSwapActions, BuyerCancelAction } from "./swap-actions";

export const dynamic = "force-dynamic";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  pending:   { label: "Pending",   color: "#7A5C00",               bg: "#FFF7CC",               Icon: Clock        },
  accepted:  { label: "Accepted",  color: "var(--ut-primary-ink)", bg: "var(--ut-primary-tint)", Icon: CheckCircle2 },
  declined:  { label: "Declined",  color: "#9B1C1C",               bg: "#FDEAEA",               Icon: XCircle      },
  cancelled: { label: "Cancelled", color: "var(--ut-ink-mute)",    bg: "var(--ut-bg-sunken)",   Icon: Ban          },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.Icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 10px", borderRadius: 999,
      fontFamily: "var(--ut-font-mono)", fontSize: 11, fontWeight: 500,
      textTransform: "uppercase", letterSpacing: "0.06em",
      background: cfg.bg, color: cfg.color,
    }}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function ProductThumb({ product }: { product: any }) {
  const image = product?.images?.[0];
  return (
    <Link
      href={product?.id ? `/product/${product.id}` : "#"}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 12px", borderRadius: 10,
        background: "var(--ut-bg-sunken)", textDecoration: "none",
        border: "1px solid var(--ut-line)", flex: 1, minWidth: 0,
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 8, flexShrink: 0, overflow: "hidden",
        background: "var(--ut-bg-card)", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <Tag size={16} style={{ color: "var(--ut-ink-mute)" }} />
        }
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 13, fontWeight: 500, color: "var(--ut-ink)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {product?.title ?? "Deleted listing"}
        </p>
        {product?.price && (
          <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--ut-ink-mute)", fontFamily: "var(--ut-font-mono)" }}>
            ₦{Number(product.price).toLocaleString()}
          </p>
        )}
      </div>
    </Link>
  );
}

function SwapCard({
  offer,
  role,
}: {
  offer: any;
  role: "received" | "sent";
}) {
  const wanted  = offer.wanted_product;
  const offered = offer.offered_product;
  const other   = role === "received" ? offer.buyer : offer.seller;
  const otherName = (other as any)?.full_name ?? "Someone";
  const isPending = offer.status === "pending";

  return (
    <div style={{
      background: "var(--ut-bg-card)", borderRadius: "var(--ut-radius)",
      border: `1.5px solid ${isPending ? "var(--ut-line)" : "var(--ut-line)"}`,
      padding: "16px 18px", overflow: "hidden",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12.5, color: "var(--ut-ink-soft)", fontWeight: 500 }}>
            {role === "received" ? `From ${otherName}` : `To ${otherName}`}
          </span>
          <span style={{ color: "var(--ut-line)" }}>·</span>
          <span style={{
            fontSize: 11.5, color: "var(--ut-ink-mute)",
            fontFamily: "var(--ut-font-mono)",
          }}>
            {new Date(offer.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
          </span>
        </div>
        <StatusBadge status={offer.status} />
      </div>

      {/* Product exchange diagram */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ProductThumb product={offered} />
          {offer.cash_topup > 0 && (
            <div style={{
              marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 10px", borderRadius: 999,
              background: "var(--ut-primary-tint)", color: "var(--ut-primary-ink)",
              fontFamily: "var(--ut-font-mono)", fontSize: 11.5, fontWeight: 600,
            }}>
              <Plus size={11} />
              ₦{Number(offer.cash_topup).toLocaleString()} cash
            </div>
          )}
        </div>
        <ArrowLeftRight
          size={16}
          style={{ flexShrink: 0, color: "var(--ut-ink-mute)" }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <ProductThumb product={wanted} />
        </div>
      </div>

      {/* Optional note */}
      {offer.note && (
        <p style={{
          margin: "12px 0 0", padding: "10px 12px", borderRadius: 8,
          background: "var(--ut-bg-sunken)", fontSize: 13, color: "var(--ut-ink-soft)",
          lineHeight: 1.5, fontStyle: "italic",
        }}>
          &ldquo;{offer.note}&rdquo;
        </p>
      )}

      {/* Actions */}
      {isPending && role === "received" && <SellerSwapActions swapId={offer.id} />}
      {isPending && role === "sent"     && <BuyerCancelAction swapId={offer.id} />}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      padding: "40px 24px", textAlign: "center",
      border: "1px dashed var(--ut-line)", borderRadius: "var(--ut-radius)",
      background: "var(--ut-bg-card)",
    }}>
      <ArrowLeftRight size={28} style={{ color: "var(--ut-ink-mute)", marginBottom: 10 }} />
      <p style={{ margin: 0, fontSize: 13.5, color: "var(--ut-ink-soft)" }}>{message}</p>
    </div>
  );
}

export default async function SwapsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/swaps");

  const fields = `
    id, status, note, cash_topup, created_at,
    wanted_product:wanted_product_id(id, title, images, price),
    offered_product:offered_product_id(id, title, images, price),
    buyer:buyer_id(full_name),
    seller:seller_id(full_name)
  `;

  const [{ data: received }, { data: sent }] = await Promise.all([
    supabase
      .from("swap_offers")
      .select(fields)
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("swap_offers")
      .select(fields)
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const pendingCount = (received ?? []).filter((o: any) => o.status === "pending").length;

  return (
    <div className="ut-app">
      <Navbar />
      <main className="ut-main">
        <div className="ut-section-head" style={{ marginTop: 0 }}>
          <div>
            <span className="ut-sub">Trade without cash</span>
            <h2 style={{ display: "flex", alignItems: "center", gap: 10 }}>
              Swap offers
              {pendingCount > 0 && (
                <span style={{
                  background: "var(--ut-accent)", color: "white",
                  borderRadius: 999, fontSize: 12, fontWeight: 700,
                  padding: "2px 9px", fontFamily: "var(--ut-font-mono)",
                }}>
                  {pendingCount}
                </span>
              )}
            </h2>
          </div>
          <Link href="/catalog" className="ut-chip">
            Browse items <ArrowRight size={12} />
          </Link>
        </div>

        {/* Received */}
        <div className="ut-section-head" style={{ marginTop: 8 }}>
          <div>
            <span className="ut-sub">Incoming</span>
            <h3 style={{ margin: 0 }}>Received</h3>
          </div>
        </div>

        {!received?.length ? (
          <EmptyState message="No one has proposed a swap for your listings yet." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 36 }}>
            {(received as any[]).map((offer) => (
              <SwapCard key={offer.id} offer={offer} role="received" />
            ))}
          </div>
        )}

        {/* Sent */}
        <div className="ut-section-head">
          <div>
            <span className="ut-sub">Outgoing</span>
            <h3 style={{ margin: 0 }}>Sent</h3>
          </div>
        </div>

        {!sent?.length ? (
          <EmptyState message="You haven't proposed any swaps yet. Find an item and click 'Propose a swap'." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(sent as any[]).map((offer) => (
              <SwapCard key={offer.id} offer={offer} role="sent" />
            ))}
          </div>
        )}

        <div className="ut-ticker" style={{ marginTop: 40 }}>
          <span>CampSwap</span>
          <span>Swap without cash</span>
          <span>No escrow needed</span>
          <span>Direct exchange</span>
        </div>
      </main>
    </div>
  );
}
