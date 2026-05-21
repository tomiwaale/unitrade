import { createAdminClient } from "@/lib/supabase/admin";
import DeactivateBtn from "@/components/admin/deactivate-btn";

const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  active: { text: "var(--ut-primary-ink)", bg: "var(--ut-primary-tint)" },
  sold:   { text: "var(--ut-ink-soft)",    bg: "var(--ut-bg-sunken)" },
  draft:  { text: "var(--ut-ink-mute)",    bg: "var(--ut-bg-sunken)" },
};

export default async function AdminProductsPage() {
  const admin = createAdminClient();

  const { data: products } = await admin
    .from("products")
    .select("id, title, price, status, created_at, profiles(full_name)")
    .order("created_at", { ascending: false });

  return (
    <div className="ut-admin-page">
      <h1 style={{ fontWeight: 800, fontSize: 22, color: "var(--ut-ink)", marginBottom: 6 }}>Products</h1>
      <p style={{ fontSize: 14, color: "var(--ut-ink-mute)", marginBottom: 32 }}>
        {products?.length ?? 0} product{products?.length !== 1 ? "s" : ""} listed
      </p>

      <div style={{
        background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
        borderRadius: "var(--ut-radius)", overflow: "hidden",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ut-line)" }}>
                {["Title", "Seller", "Price", "Status", "Listed", ""].map((h) => (
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
              {(products ?? []).map((product: any) => {
                const colors = STATUS_COLORS[product.status] ?? STATUS_COLORS.draft;
                return (
                  <tr key={product.id} style={{ borderBottom: "1px solid var(--ut-line)" }}>
                    <td style={{ padding: "12px 16px", maxWidth: 220 }}>
                      <p style={{
                        fontSize: 13, fontWeight: 700, color: "var(--ut-ink)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {product.title}
                      </p>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--ut-ink-soft)", fontWeight: 500 }}>
                      {product.profiles?.full_name ?? "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "var(--ut-ink)", whiteSpace: "nowrap", fontFamily: "var(--ut-font-mono)" }}>
                      ₦{Number(product.price).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                        color: colors.text, background: colors.bg,
                        textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "var(--ut-font-mono)",
                      }}>
                        {product.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--ut-ink-mute)", whiteSpace: "nowrap" }}>
                      {new Date(product.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {product.status === "active" && <DeactivateBtn productId={product.id} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {(products ?? []).length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: "var(--ut-ink-mute)", fontSize: 14 }}>
            No products found.
          </div>
        )}
      </div>
    </div>
  );
}
