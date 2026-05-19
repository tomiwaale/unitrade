import { createAdminClient } from "@/lib/supabase/admin";

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
      borderRadius: "var(--ut-radius)", padding: "18px 22px",
    }}>
      <p style={{
        fontSize: 11, fontWeight: 600, color: "var(--ut-ink-mute)", marginBottom: 8,
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        {label}
      </p>
      <p style={{ fontSize: 24, fontWeight: 800, color: accent, fontFamily: "var(--ut-font-mono)" }}>
        {value}
      </p>
    </div>
  );
}

export default async function AdminOverviewPage() {
  const admin = createAdminClient();

  const [
    { count: userCount },
    { count: productCount },
    { data: orders },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("products").select("*", { count: "exact", head: true }),
    admin.from("orders").select("status, amount"),
  ]);

  const allOrders = orders ?? [];

  const byStatus = allOrders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  const confirmedRevenue = allOrders
    .filter((o) => o.status === "confirmed")
    .reduce((sum, o) => sum + Number(o.amount), 0);

  const platformFees = Math.round(confirmedRevenue * 0.1);

  const stats = [
    { label: "Total Revenue Released", value: `₦${confirmedRevenue.toLocaleString()}`, accent: "var(--ut-primary)" },
    { label: "Platform Fees (10%)", value: `₦${platformFees.toLocaleString()}`, accent: "var(--ut-primary-ink)" },
    { label: "Total Users", value: String(userCount ?? 0), accent: "var(--ut-ink)" },
    { label: "Total Products", value: String(productCount ?? 0), accent: "var(--ut-ink)" },
    { label: "Pending Orders", value: String(byStatus.pending ?? 0), accent: "var(--ut-ink-soft)" },
    { label: "In Escrow (Paid)", value: String(byStatus.paid ?? 0), accent: "#B45309" },
    { label: "Confirmed Orders", value: String(byStatus.confirmed ?? 0), accent: "var(--ut-primary)" },
    { label: "Active Disputes", value: String(byStatus.disputed ?? 0), accent: "#9B1C1C" },
  ];

  return (
    <div style={{ padding: "40px 48px" }}>
      <h1 style={{ fontWeight: 800, fontSize: 22, color: "var(--ut-ink)", marginBottom: 6 }}>Overview</h1>
      <p style={{ fontSize: 14, color: "var(--ut-ink-mute)", marginBottom: 32 }}>
        Platform summary across all users and orders.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>
    </div>
  );
}
