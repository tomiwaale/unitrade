import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import PromoSlideManager from "./promo-slide-manager";

export const metadata = { title: "Promo Carousel · Admin" };

export default async function AdminPromoSlidesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: slides } = await admin
    .from("promo_slides")
    .select("id, title, subtitle, icon, color_start, color_end, image_url, route, sort_order, active")
    .order("sort_order", { ascending: true });

  return (
    <div className="ut-admin-page">
      <h1 style={{ fontWeight: 800, fontSize: 22, color: "var(--ut-ink)", marginBottom: 6 }}>
        Promo Carousel
      </h1>
      <p style={{ fontSize: 14, color: "var(--ut-ink-mute)", marginBottom: 32 }}>
        Manage the auto-advancing promo cards shown at the top of the mobile app&apos;s catalog screen.
      </p>

      <PromoSlideManager slides={slides ?? []} userId={user?.id ?? ""} />
    </div>
  );
}
