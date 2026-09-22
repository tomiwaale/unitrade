import { createAdminClient } from "@/lib/supabase/admin";
import { parseSegment } from "@/lib/marketing";
import MarketingDashboard from "./marketing-dashboard";

export const metadata = { title: "Email Marketing · Admin" };

export default async function AdminMarketingPage() {
  const admin = createAdminClient();

  const [{ data: campaigns }, { data: templates }, { count: optedOut }] = await Promise.all([
    admin
      .from("email_campaigns")
      .select("id, name, subject, segment, status, scheduled_at, total_recipients, sent_count, failed_count, created_at, completed_at")
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("email_templates")
      .select("id, name, subject, preheader, body_md, updated_at")
      .order("updated_at", { ascending: false }),
    admin
      .from("email_unsubscribes")
      .select("email", { count: "exact", head: true }),
  ]);

  const rows = (campaigns ?? []).map((c) => ({
    ...c,
    segment: parseSegment(c.segment),
  }));

  return (
    <div className="ut-admin-page">
      <h1 style={{ fontWeight: 800, fontSize: 22, color: "var(--ut-ink)", marginBottom: 6 }}>
        Email Marketing
      </h1>
      <p style={{ fontSize: 14, color: "var(--ut-ink-mute)", marginBottom: 28 }}>
        Compose campaigns, target a segment of your users, and send now or on a schedule.
      </p>

      <MarketingDashboard
        campaigns={rows}
        templates={templates ?? []}
        optedOutCount={optedOut ?? 0}
      />
    </div>
  );
}
