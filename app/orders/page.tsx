import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { ShoppingBag, Tag, ArrowRight, Clock, CheckCircle2, AlertCircle, XCircle, PlusCircle } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Pending payment",   color: "var(--ut-ink-soft)",  bg: "var(--ut-bg-sunken)" },
  paid:      { label: "Awaiting delivery", color: "#7A5C00",             bg: "#FFF7CC" },
  confirmed: { label: "Received",          color: "var(--ut-primary-ink)", bg: "var(--ut-primary-tint)" },
  released:  { label: "Payout sent",       color: "var(--ut-primary-ink)", bg: "var(--ut-primary-tint)" },
  disputed:  { label: "Disputed",          color: "#8B0000",             bg: "#FDEAEA" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 999,
      fontFamily: "var(--ut-font-mono)", fontSize: 11, fontWeight: 500,
      textTransform: "uppercase", letterSpacing: "0.06em",
      background: cfg.bg, color: cfg.color,
    }}>
      {status === "disputed" ? <AlertCircle size={11} /> :
       status === "confirmed" || status === "released" ? <CheckCircle2 size={11} /> :
       <Clock size={11} />}
      {cfg.label}
    </span>
  );
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/orders");

  const params = await searchParams;

  const { data: purchases } = await supabase
    .from("orders")
    .select("id, amount, status, created_at, auto_release_at, products(id, title, images)")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  const { data: myProducts } = await supabase
    .from("products").select("id").eq("seller_id", user.id);

  const productIds = myProducts?.map((p) => p.id) ?? [];

  const { data: sales } = productIds.length
    ? await supabase
        .from("orders")
        .select("id, amount, status, created_at, auto_release_at, products(id, title, images), profiles(full_name)")
        .in("product_id", productIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="ut-app">
      <Navbar />
      <main className="ut-main">
        {params.success === "payment_received" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "14px 18px", borderRadius: "var(--ut-radius)",
            background: "var(--ut-primary-tint)", border: "1px solid color-mix(in srgb, var(--ut-primary) 20%, transparent)",
            marginBottom: 24,
          }}>
            <CheckCircle2 size={18} style={{ color: "var(--ut-primary)", flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--ut-primary-ink)", fontWeight: 500 }}>
              Payment received! Your funds are held safely in escrow. Confirm receipt after the seller delivers.
            </p>
          </div>
        )}

        {/* Purchases */}
        <div className="ut-section-head" style={{ marginTop: 0 }}>
          <div>
            <span className="ut-sub">Buying</span>
            <h2>My purchases</h2>
          </div>
          <Link href="/catalog" className="ut-chip">Browse more →</Link>
        </div>

        {!purchases?.length ? (
          <EmptyState message="You haven't bought anything yet." cta={{ label: "Browse listings", href: "/catalog" }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 40 }}>
            {purchases.map((order) => (
              <OrderRow key={order.id} order={order} role="buyer" />
            ))}
          </div>
        )}

        {/* Sales */}
        <div className="ut-section-head">
          <div>
            <span className="ut-sub">Selling</span>
            <h2>My sales</h2>
          </div>
          <Link href="/sell" className="ut-cta ut-cta-primary" style={{ fontSize: 12, padding: "7px 12px" }}>
            <PlusCircle size={13} /> List item
          </Link>
        </div>

        {!sales?.length ? (
          <EmptyState message="You haven't sold anything yet." cta={{ label: "List an item", href: "/sell" }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(sales as any[]).map((order) => (
              <OrderRow key={order.id} order={order} role="seller" />
            ))}
          </div>
        )}

        <div className="ut-ticker">
          <span>KolejSwap</span>
          <span>Orders dashboard</span>
          <span>Escrow <b>protected</b></span>
          <span>Powered by <b>Paystack</b></span>
        </div>
      </main>
    </div>
  );
}

function OrderRow({ order, role }: { order: any; role: "buyer" | "seller" }) {
  const product = order.products;
  const image   = product?.images?.[0];

  return (
    <Link
      href={`/orders/${order.id}`}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 16px", borderRadius: "var(--ut-radius)",
        background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
        textDecoration: "none", color: "inherit",
        transition: "border-color 0.15s ease, transform 0.15s ease",
      }}
      className="ut-card"
    >
      {/* Thumbnail */}
      <div style={{
        width: 52, height: 52, borderRadius: 10, flexShrink: 0, overflow: "hidden",
        background: "var(--ut-bg-sunken)", display: "grid", placeItems: "center",
      }}>
        {image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={image} alt={product?.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <Tag size={20} style={{ color: "var(--ut-ink-mute)" }} />
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 2px", fontWeight: 500, fontSize: 14, letterSpacing: "-0.01em" }}>
          {product?.title ?? "Deleted product"}
        </p>
        {role === "seller" && order.profiles && (
          <p style={{ margin: 0, fontSize: 12, color: "var(--ut-ink-mute)" }}>
            Buyer: {order.profiles.full_name}
          </p>
        )}
        <p style={{ margin: "2px 0 0", fontFamily: "var(--ut-font-mono)", fontSize: 13, fontWeight: 600, color: "var(--ut-ink)" }}>
          ₦{Number(order.amount).toLocaleString()}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <StatusBadge status={order.status} />
        <ArrowRight size={14} style={{ color: "var(--ut-ink-mute)", opacity: 0.5 }} />
      </div>
    </Link>
  );
}

function EmptyState({ message, cta }: { message: string; cta: { label: string; href: string } }) {
  return (
    <div style={{
      padding: "40px 24px", textAlign: "center",
      border: "1px dashed var(--ut-line)", borderRadius: "var(--ut-radius)",
      background: "var(--ut-bg-card)", marginBottom: 40,
    }}>
      <XCircle size={28} style={{ color: "var(--ut-ink-mute)", marginBottom: 10 }} />
      <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "var(--ut-ink-soft)" }}>{message}</p>
      <Link href={cta.href} className="ut-cta ut-cta-primary" style={{ fontSize: 13, padding: "9px 16px" }}>
        {cta.label}
      </Link>
    </div>
  );
}
