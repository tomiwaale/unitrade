import { createAdminClient } from "@/lib/supabase/admin";
import DisputeActions from "@/components/admin/dispute-actions";

export default async function AdminDisputesPage() {
  const admin = createAdminClient();

  const { data: disputes } = await admin
    .from("orders")
    .select(
      `id, amount, disputed_at, paystack_reference,
       profiles!buyer_id(full_name, university),
       products(title, profiles(full_name, recipient_code))`
    )
    .eq("status", "disputed")
    .order("disputed_at", { ascending: false });

  return (
    <div className="ut-admin-page">
      <h1 style={{ fontWeight: 800, fontSize: 22, color: "var(--ut-ink)", marginBottom: 6 }}>Disputes</h1>
      <p style={{ fontSize: 14, color: "var(--ut-ink-mute)", marginBottom: 32 }}>
        {disputes?.length ?? 0} active dispute{disputes?.length !== 1 ? "s" : ""} requiring attention.
      </p>

      {disputes && disputes.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {disputes.map((order: any) => {
            const buyer = order.profiles;
            const product = order.products;
            const seller = product?.profiles;
            const hasPayout = Boolean(seller?.recipient_code);

            return (
              <div key={order.id} style={{
                background: "var(--ut-bg-card)", border: "1.5px solid #FBBABA",
                borderRadius: "var(--ut-radius)", overflow: "hidden",
              }}>
                <div style={{
                  padding: "11px 18px", background: "#FDEAEA",
                  borderBottom: "1px solid #FBBABA",
                  display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
                }}>
                  <div>
                    <span style={{ fontSize: 12, fontFamily: "var(--ut-font-mono)", fontWeight: 700, color: "#9B1C1C" }}>
                      {order.id.slice(0, 12).toUpperCase()}
                    </span>
                    {order.disputed_at && (
                      <span style={{ fontSize: 12, color: "#9B1C1C", marginLeft: 12, opacity: 0.75 }}>
                        Disputed {new Date(order.disputed_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 15, color: "var(--ut-ink)", fontFamily: "var(--ut-font-mono)" }}>
                    ₦{Number(order.amount).toLocaleString()}
                  </span>
                </div>

                <div className="ut-admin-3col">
                  {[
                    { label: "Product", main: product?.title ?? "Deleted product", sub: null },
                    { label: "Buyer", main: buyer?.full_name ?? "—", sub: buyer?.university },
                    { label: "Seller", main: seller?.full_name ?? "—", sub: !hasPayout ? "No payout account" : null },
                  ].map(({ label, main, sub }) => (
                    <div key={label}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--ut-ink-mute)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                        {label}
                      </p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ut-ink)" }}>{main}</p>
                      {sub && <p style={{ fontSize: 11, color: label === "Seller" && !hasPayout ? "#9B1C1C" : "var(--ut-ink-mute)" }}>{sub}</p>}
                    </div>
                  ))}
                </div>

                <div style={{
                  padding: "10px 18px", borderTop: "1px solid var(--ut-line)",
                  display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8,
                }}>
                  <p style={{ fontSize: 12, color: "var(--ut-ink-mute)", flex: 1 }}>
                    Seller payout: ₦{Math.round(Number(order.amount) * 0.9).toLocaleString()} (90%)
                  </p>
                  <DisputeActions orderId={order.id} hasPayout={hasPayout} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
          borderRadius: "var(--ut-radius)", padding: 48,
          textAlign: "center", color: "var(--ut-ink-mute)", fontSize: 14,
        }}>
          No active disputes.
        </div>
      )}
    </div>
  );
}
