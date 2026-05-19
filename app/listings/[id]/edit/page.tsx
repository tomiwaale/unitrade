import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { ChevronLeft, Pencil } from "lucide-react";
import EditListingForm from "./edit-form";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: product } = await supabase
    .from("products")
    .select("id, title, description, price, images, status, seller_id, category, location")
    .eq("id", id)
    .single();

  if (!product || product.seller_id !== user.id) notFound();
  if (product.status === "sold") redirect("/listings");

  return (
    <div className="ut-app">
      <Navbar />
      <main className="ut-main" style={{ maxWidth: 680 }}>
        <Link href="/listings" className="ut-detail-back">
          <ChevronLeft size={15} /> My listings
        </Link>

        <div style={{
          background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
          borderRadius: "var(--ut-radius)", overflow: "hidden",
        }}>
          <div style={{
            padding: "18px 20px", borderBottom: "1px solid var(--ut-line)",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: "var(--ut-primary-tint)", display: "grid", placeItems: "center",
            }}>
              <Pencil size={16} style={{ color: "var(--ut-primary-ink)" }} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "var(--ut-ink)" }}>Edit listing</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--ut-ink-mute)" }}>{product.title}</p>
            </div>
          </div>

          <div style={{ padding: "20px" }}>
            <EditListingForm
              productId={product.id}
              defaults={{
                title: product.title,
                description: product.description,
                price: product.price,
                imageUrl: product.images?.[0] ?? "",
                category: product.category ?? "",
                location: product.location ?? "",
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
