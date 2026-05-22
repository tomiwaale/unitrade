import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, AlertTriangle, User, ShoppingBag, MessageSquare } from "lucide-react";
import DisputeActions from "@/components/admin/dispute-actions";

export default async function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select(`
      id, amount, status, disputed_at, created_at, paystack_reference,
      buyer_id,
      profiles!buyer_id(full_name, university, phone),
      products(
        id, title, description, price, images, seller_id,
        profiles(full_name, university, phone, bank_name, account_name, recipient_code)
      )
    `)
    .eq("id", id)
    .single();

  if (!order || order.status !== "disputed") notFound();

  const buyer = (order as any).profiles;
  const product = (order as any).products;
  const seller = product?.profiles;
  const hasPayout = Boolean(seller?.recipient_code);
  const sellerPayout = Math.round(Number(order.amount) * 0.9).toLocaleString();

  // Fetch conversation messages for this order to give admin context
  const { data: conversation } = await admin
    .from("conversations")
    .select("id")
    .eq("product_id", product?.id)
    .eq("buyer_id", order.buyer_id)
    .maybeSingle();

  let messages: any[] = [];
  if (conversation) {
    const { data: msgs } = await admin
      .from("messages")
      .select("id, content, sender_id, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(10);
    messages = msgs ?? [];
  }

  return (
    <div className="ut-admin-page">
      <Link
        href="/admin/disputes"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 13, color: "var(--ut-ink-mute)", textDecoration: "none", marginBottom: 20,
        }}
      >
        <ChevronLeft size={14} /> Back to disputes
      </Link>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 22, color: "var(--ut-ink)", margin: "0 0 4px" }}>
            Dispute
          </h1>
          <span style={{ fontFamily: "var(--ut-font-mono)", fontSize: 12, color: "var(--ut-ink-mute)" }}>
            {order.id.toUpperCase()}
          </span>
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
          background: "#FDEAEA", color: "#9B1C1C", border: "1.5px solid #FBBABA",
        }}>
          <AlertTriangle size={13} />
          Disputed {order.disputed_at ? new Date(order.disputed_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—"}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginBottom: 20 }}>
        {/* Buyer card */}
        <PartyCard
          icon={<User size={15} />}
          label="Buyer"
          name={buyer?.full_name ?? "Unknown"}
          university={buyer?.university}
          phone={buyer?.phone}
        />

        {/* Seller card */}
        <PartyCard
          icon={<User size={15} />}
          label="Seller"
          name={seller?.full_name ?? "Unknown"}
          university={seller?.university}
          phone={seller?.phone}
          sub={!hasPayout ? "⚠ No payout account set" : `${seller?.bank_name} · ${seller?.account_name}`}
          subWarning={!hasPayout}
        />

        {/* Product card */}
        <div style={{
          background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
          borderRadius: "var(--ut-radius)", padding: "16px 18px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <ShoppingBag size={15} style={{ color: "var(--ut-ink-mute)" }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ut-ink-mute)" }}>Product</span>
          </div>
          {product?.images?.[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0]}
              alt={product.title}
              style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8, marginBottom: 10 }}
            />
          )}
          <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: "var(--ut-ink)" }}>{product?.title ?? "Deleted product"}</p>
          <p style={{ margin: 0, fontFamily: "var(--ut-font-mono)", fontWeight: 600, fontSize: 14, color: "var(--ut-ink)" }}>
            ₦{Number(order.amount).toLocaleString()}
          </p>
          {order.paystack_reference && (
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--ut-ink-mute)", fontFamily: "var(--ut-font-mono)" }}>
              Ref: {order.paystack_reference}
            </p>
          )}
        </div>
      </div>

      {/* Recent messages for context */}
      {messages.length > 0 && (
        <div style={{
          background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
          borderRadius: "var(--ut-radius)", padding: "16px 18px", marginBottom: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <MessageSquare size={15} style={{ color: "var(--ut-ink-mute)" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ut-ink)" }}>
              Recent messages (last {messages.length})
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...messages].reverse().map((msg) => {
              const isBuyer = msg.sender_id === order.buyer_id;
              return (
                <div key={msg.id} style={{
                  padding: "8px 12px", borderRadius: 8, maxWidth: "80%",
                  background: isBuyer ? "var(--ut-primary-tint)" : "var(--ut-bg-sunken)",
                  alignSelf: isBuyer ? "flex-start" : "flex-end",
                  border: "1px solid var(--ut-line)",
                }}>
                  <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, color: isBuyer ? "var(--ut-primary-ink)" : "var(--ut-ink-mute)" }}>
                    {isBuyer ? "Buyer" : "Seller"}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--ut-ink)", lineHeight: 1.4 }}>{msg.content}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 10, color: "var(--ut-ink-mute)", fontFamily: "var(--ut-font-mono)" }}>
                    {new Date(msg.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resolution panel */}
      <div style={{
        background: "#FDEAEA", border: "1.5px solid #FBBABA",
        borderRadius: "var(--ut-radius)", padding: "18px 20px",
      }}>
        <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: "#9B1C1C" }}>Resolve dispute</p>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#9B1C1C", opacity: 0.8 }}>
          Release funds to seller (90% = ₦{sellerPayout}) or mark order as refunded to buyer.
          {!hasPayout && (
            <span style={{ display: "block", marginTop: 6, fontWeight: 600 }}>
              ⚠ Seller has no payout account — cannot release until they add one.
            </span>
          )}
        </p>
        <DisputeActions orderId={order.id} hasPayout={hasPayout} />
      </div>
    </div>
  );
}

function PartyCard({
  icon, label, name, university, phone, sub, subWarning,
}: {
  icon: React.ReactNode;
  label: string;
  name: string;
  university?: string;
  phone?: string;
  sub?: string;
  subWarning?: boolean;
}) {
  return (
    <div style={{
      background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
      borderRadius: "var(--ut-radius)", padding: "16px 18px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ color: "var(--ut-ink-mute)" }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ut-ink-mute)" }}>{label}</span>
      </div>
      <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: 14, color: "var(--ut-ink)" }}>{name}</p>
      {university && <p style={{ margin: "0 0 3px", fontSize: 12, color: "var(--ut-ink-mute)" }}>{university}</p>}
      {phone && <p style={{ margin: "0 0 3px", fontSize: 12, color: "var(--ut-ink-mute)", fontFamily: "var(--ut-font-mono)" }}>{phone}</p>}
      {sub && <p style={{ margin: "4px 0 0", fontSize: 12, color: subWarning ? "#9B1C1C" : "var(--ut-ink-mute)", fontWeight: subWarning ? 600 : 400 }}>{sub}</p>}
    </div>
  );
}
