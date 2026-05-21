import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import SlideManager from "./slide-manager";

export const metadata = { title: "Hero Slides · Admin" };

export default async function AdminSlidesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const [{ data: slides }, { data: intervalSetting }] = await Promise.all([
    admin
      .from("hero_slides")
      .select("id, title, subtitle, image_url, cta_label, cta_href, sort_order, active")
      .order("sort_order", { ascending: true }),
    admin
      .from("site_settings")
      .select("value")
      .eq("key", "hero_slide_interval")
      .single(),
  ]);

  const slideInterval = Number(intervalSetting?.value ?? 10);

  return (
    <div className="ut-admin-page">
      <h1 style={{ fontWeight: 800, fontSize: 22, color: "var(--ut-ink)", marginBottom: 6 }}>
        Hero Slides
      </h1>
      <p style={{ fontSize: 14, color: "var(--ut-ink-mute)", marginBottom: 32 }}>
        Manage the image slider shown on the homepage hero section.
      </p>

      <SlideManager
        slides={slides ?? []}
        userId={user?.id ?? ""}
        slideInterval={slideInterval}
      />
    </div>
  );
}
