import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { PlusCircle, Tag, Pencil } from "lucide-react";
import DeleteListingBtn from "./delete-btn";

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  active: { color: "var(--ut-primary-ink)", bg: "var(--ut-primary-tint)" },
  sold:   { color: "var(--ut-ink-soft)",    bg: "var(--ut-bg-sunken)" },
  draft:  { color: "var(--ut-ink-mute)",    bg: "var(--ut-bg-sunken)" },
};

export default async function ListingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/listings");

  const { data: products } = await supabase
    .from("products")
    .select("id, title, price, status, images, created_at")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="ut-app">
      <Navbar />
      <main className="ut-main">
        <div className="ut-section-head" style={{ marginTop: 0 }}>
          <div>
            <span className="ut-sub">Your storefront</span>
            <h2>My listings</h2>
          </div>
          <Link href="/sell" className="ut-cta ut-cta-primary" style={{ fontSize: 13, padding: "8px 14px" }}>
            <PlusCircle size={13} /> New listing
          </Link>
        </div>

        {!products?.length ? (
          <div style={{
            padding: "60px 24px", textAlign: "center",
            border: "1px dashed var(--ut-line)", borderRadius: "var(--ut-radius-lg)",
            background: "var(--ut-bg-card)",
          }}>
            <Tag size={28} style={{ color: "var(--ut-ink-mute)", marginBottom: 12 }} />
            <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "var(--ut-ink-soft)" }}>
              You haven&apos;t listed anything yet.
            </p>
            <Link href="/sell" className="ut-cta ut-cta-primary" style={{ fontSize: 13, padding: "9px 16px" }}>
              <PlusCircle size={13} /> List an item
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {products.map((product) => {
              const st = STATUS_STYLES[product.status] ?? STATUS_STYLES.draft;
              const image = product.images?.[0];

              return (
                <div
                  key={product.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 16px", borderRadius: "var(--ut-radius)",
                    background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
                  }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: 10, flexShrink: 0, overflow: "hidden",
                    background: "var(--ut-bg-sunken)", display: "grid", placeItems: "center",
                  }}>
                    {image
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={image} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <Tag size={18} style={{ color: "var(--ut-ink-mute)" }} />
                    }
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {product.title}
                    </p>
                    <p style={{ margin: 0, fontFamily: "var(--ut-font-mono)", fontSize: 13, fontWeight: 600, color: "var(--ut-ink)" }}>
                      ₦{Number(product.price).toLocaleString()}
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{
                      padding: "4px 10px", borderRadius: 999,
                      fontFamily: "var(--ut-font-mono)", fontSize: 10.5, fontWeight: 500,
                      textTransform: "uppercase", letterSpacing: "0.06em",
                      background: st.bg, color: st.color,
                    }}>
                      {product.status}
                    </span>
                    {product.status !== "sold" && (
                      <Link
                        href={`/listings/${product.id}/edit`}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "5px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                          textDecoration: "none", color: "var(--ut-ink-soft)",
                          border: "1px solid var(--ut-line)", background: "transparent",
                        }}
                      >
                        <Pencil size={11} /> Edit
                      </Link>
                    )}
                    <DeleteListingBtn productId={product.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="ut-ticker">
          <span>CampSwap</span>
          <span><b>{products?.length ?? 0}</b> listings</span>
          <span>Your storefront</span>
        </div>
      </main>
    </div>
  );
}
