import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  pending:   { text: "var(--ut-ink-soft)",    bg: "var(--ut-bg-sunken)" },
  paid:      { text: "#B45309",               bg: "#FEF3C7" },
  confirmed: { text: "var(--ut-primary-ink)", bg: "var(--ut-primary-tint)" },
  disputed:  { text: "#9B1C1C",               bg: "#FDEAEA" },
  refunded:  { text: "#9B1C1C",               bg: "#FDEAEA" },
};

const STATUSES = ["all", "pending", "paid", "confirmed", "disputed", "refunded"];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const admin = createAdminClient();

  let query = admin
    .from("orders")
    .select(
      `id, amount, status, created_at,
       profiles!buyer_id(full_name, university),
       products(title)`
    )
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: orders } = await query;

  return (
    <div className="ut-admin-page">
      <h1 style={{ fontWeight: 800, fontSize: 22, color: "var(--ut-ink)", marginBottom: 6 }}>Orders</h1>
      <p style={{ fontSize: 14, color: "var(--ut-ink-mute)", marginBottom: 24 }}>
        {orders?.length ?? 0} order{orders?.length !== 1 ? "s" : ""} found
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {STATUSES.map((s) => {
          const active = (status ?? "all") === s;
          return (
            <Link
              key={s}
              href={`/admin/orders?status=${s}`}
              style={{
                padding: "5px 14px", borderRadius: 999, fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? "white" : "var(--ut-ink-soft)",
                background: active ? "var(--ut-primary)" : "var(--ut-bg-card)",
                border: `1px solid ${active ? "var(--ut-primary)" : "var(--ut-line)"}`,
                textDecoration: "none",
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Link>
          );
        })}
      </div>

      <div style={{
        background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
        borderRadius: "var(--ut-radius)", overflow: "hidden",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ut-line)" }}>
                {["Order ID", "Product", "Buyer", "Amount", "Status", "Date"].map((h) => (
                  <th key={h} style={{
                    padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700,
                    color: "var(--ut-ink-mute)", letterSpacing: "0.06em",
                    textTransform: "uppercase", whiteSpace: "nowrap",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(orders ?? []).map((order: any) => {
                const colors = STATUS_COLORS[order.status] ?? STATUS_COLORS.pending;
                return (
                  <tr key={order.id} style={{ borderBottom: "1px solid var(--ut-line)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <Link href={`/orders/${order.id}`} style={{
                        fontSize: 12, fontFamily: "var(--ut-font-mono)",
                        color: "var(--ut-primary)", textDecoration: "none", fontWeight: 600,
                      }}>
                        {order.id.slice(0, 12).toUpperCase()}
                      </Link>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "var(--ut-ink)", maxWidth: 180 }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {order.products?.title ?? "Deleted product"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ut-ink)" }}>
                        {order.profiles?.full_name ?? "—"}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--ut-ink-mute)" }}>
                        {order.profiles?.university}
                      </p>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "var(--ut-ink)", whiteSpace: "nowrap", fontFamily: "var(--ut-font-mono)" }}>
                      ₦{Number(order.amount).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: 999, fontSize: 11,
                        fontWeight: 700, color: colors.text, background: colors.bg,
                        whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.04em",
                        fontFamily: "var(--ut-font-mono)",
                      }}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--ut-ink-mute)", whiteSpace: "nowrap" }}>
                      {new Date(order.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {(orders ?? []).length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: "var(--ut-ink-mute)", fontSize: 14 }}>
            No orders found.
          </div>
        )}
      </div>
    </div>
  );
}
