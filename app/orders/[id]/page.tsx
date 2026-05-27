import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { ChevronLeft, Tag, MapPin, ShieldCheck, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import OrderActions from "./order-actions";
import LeaveReview from "./leave-review";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .select(`
      id, amount, status, created_at, auto_release_at,
      confirmed_at, released_at, disputed_at,
      buyer_id,
      products(
        id, title, price, images, seller_id,
        profiles(full_name, university, bank_name, account_name)
      )
    `)
    .eq("id", id)
    .single();

  if (error || !order) notFound();

  const product       = order.products as any;
  const sellerProfile = product?.profiles;
  const isBuyer       = user.id === order.buyer_id;
  const isSeller      = user.id === product?.seller_id;

  if (!isBuyer && !isSeller) notFound();

  const autoRelease  = order.auto_release_at ? new Date(order.auto_release_at) : null;
  const sellerPayout = Math.round(order.amount * 0.9).toLocaleString();

  // Check if buyer already left a review (only needed for confirmed orders)
  let hasReview = false;
  if (isBuyer && order.status === "confirmed") {
    const { data: review } = await supabase
      .from("reviews")
      .select("id")
      .eq("order_id", id)
      .maybeSingle();
    hasReview = !!review;
  }

  return (
    <div className="ut-app">
      <Navbar />
      <main className="ut-main" style={{ maxWidth: 680 }}>
        <Link href="/orders" className="ut-detail-back">
          <ChevronLeft size={15} /> All orders
        </Link>

        {/* Product card */}
        <div style={{
          background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
          borderRadius: "var(--ut-radius)", overflow: "hidden", marginBottom: 16,
        }}>
          <div style={{ display: "flex", gap: 14, padding: "16px 18px", borderBottom: "1px solid var(--ut-line)" }}>
            <div style={{
              width: 60, height: 60, borderRadius: 10, flexShrink: 0, overflow: "hidden",
              background: "var(--ut-bg-sunken)", display: "grid", placeItems: "center",
            }}>
              {product?.images?.[0]
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={product.images[0]} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <Tag size={22} style={{ color: "var(--ut-ink-mute)" }} />
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: "0 0 4px", fontWeight: 500, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {product?.title ?? "Deleted product"}
              </p>
              <p style={{ margin: "0 0 4px", fontFamily: "var(--ut-font-mono)", fontSize: 16, fontWeight: 600, color: "var(--ut-ink)" }}>
                ₦{Number(order.amount).toLocaleString()}
              </p>
              {sellerProfile && (
                <p style={{ margin: 0, fontSize: 12, color: "var(--ut-ink-mute)", display: "flex", alignItems: "center", gap: 4 }}>
                  <MapPin size={11} /> {sellerProfile.full_name} · {sellerProfile.university}
                </p>
              )}
            </div>
          </div>

          <EscrowStatusBox
            status={order.status} isBuyer={isBuyer}
            autoRelease={autoRelease} sellerPayout={sellerPayout}
            confirmedAt={order.confirmed_at} disputedAt={order.disputed_at}
          />
        </div>

        {/* Buyer actions */}
        {isBuyer && order.status === "paid" && (
          <OrderActions orderId={order.id} sellerPayout={sellerPayout} />
        )}

        {/* Leave a review */}
        {isBuyer && order.status === "confirmed" && !hasReview && (
          <LeaveReview orderId={order.id} />
        )}

        {/* Meta */}
        <div style={{
          background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
          borderRadius: "var(--ut-radius)", padding: "16px 18px",
        }}>
          <span className="ut-field-label">Order details</span>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <MetaRow label="Order ID" value={order.id.slice(0, 12).toUpperCase()} />
            <MetaRow label="Amount paid" value={`₦${Number(order.amount).toLocaleString()}`} />
            {isSeller && <MetaRow label="Your payout (90%)" value={`₦${sellerPayout}`} />}
            <MetaRow label="Date" value={new Date(order.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })} />
            {isSeller && sellerProfile?.bank_name && (
              <MetaRow label="Payout account" value={`${sellerProfile.bank_name} · ${sellerProfile.account_name}`} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function EscrowStatusBox({ status, isBuyer, autoRelease, sellerPayout, confirmedAt, disputedAt }: {
  status: string; isBuyer: boolean; autoRelease: Date | null;
  sellerPayout: string; confirmedAt: string | null; disputedAt: string | null;
}) {
  if (status === "pending") return (
    <StatusBox icon={Clock} color="var(--ut-ink-soft)" bg="var(--ut-bg-sunken)" title="Payment pending">
      <p>Waiting for payment to be confirmed.</p>
    </StatusBox>
  );

  if (status === "paid") return (
    <StatusBox icon={ShieldCheck} color="var(--ut-primary-ink)" bg="var(--ut-primary-tint)" title="Funds held in escrow">
      {isBuyer ? (
        <>
          <p>₦{sellerPayout} is locked safely. After you receive the item, tap <b>I received this</b> to release payment.</p>
          {autoRelease && <p style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>Auto-releases on {autoRelease.toLocaleDateString("en-NG", { day: "numeric", month: "long" })} if you don't confirm.</p>}
        </>
      ) : (
        <>
          <p>Buyer has paid. Deliver the item — payment is released once they confirm receipt.</p>
          {autoRelease && <p style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>Auto-releases to you on {autoRelease.toLocaleDateString("en-NG", { day: "numeric", month: "long" })}.</p>}
        </>
      )}
    </StatusBox>
  );

  if (status === "confirmed") return (
    <StatusBox icon={CheckCircle2} color="var(--ut-primary-ink)" bg="var(--ut-primary-tint)" title="Completed">
      {isBuyer
        ? <p>You confirmed receipt on {confirmedAt ? new Date(confirmedAt).toLocaleDateString("en-NG") : "—"}. ₦{sellerPayout} sent to seller.</p>
        : <p>Buyer confirmed receipt. ₦{sellerPayout} has been sent to your account.</p>
      }
    </StatusBox>
  );

  if (status === "disputed") return (
    <StatusBox icon={AlertTriangle} color="#8B0000" bg="#FDEAEA" title="Dispute filed">
      {isBuyer
        ? <p>Your dispute was received on {disputedAt ? new Date(disputedAt).toLocaleDateString("en-NG") : "—"}. Payment is frozen — our team will contact you.</p>
        : <p>The buyer has raised a dispute. Payment is frozen while we review. Contact support if you have questions.</p>
      }
    </StatusBox>
  );

  return null;
}

function StatusBox({ icon: Icon, color, bg, title, children }: {
  icon: React.ElementType; color: string; bg: string; title: string; children: React.ReactNode;
}) {
  return (
    <div style={{ padding: "14px 18px", background: bg }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <Icon size={18} style={{ color, flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 13.5, color }}>{title}</p>
          <div style={{ fontSize: 13.5, color, lineHeight: 1.5, opacity: 0.85 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
      <span style={{ color: "var(--ut-ink-mute)" }}>{label}</span>
      <span style={{ fontWeight: 500, fontFamily: "var(--ut-font-mono)", color: "var(--ut-ink)" }}>{value}</span>
    </div>
  );
}
