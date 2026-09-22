import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";
import { redirect } from "next/navigation";
import TermManager from "./term-manager";
import FilterTester from "./filter-tester";

export const dynamic = "force-dynamic";

export default async function AdminModerationPage() {
  if (!(await requireAdmin())) redirect("/");

  const admin = createAdminClient();
  const { data: terms } = await admin
    .from("moderation_terms")
    .select("id, pattern, category, action, match_normalized, note, is_active, created_at")
    .order("category", { ascending: true })
    .order("action", { ascending: true });

  const { count: flaggedLast7Days } = await admin
    .from("content_reports")
    .select("id", { count: "exact", head: true })
    .is("reporter_id", null)
    .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString());

  return (
    <div className="ut-admin-page">
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontWeight: 800, fontSize: 22, color: "var(--ut-ink)", margin: "0 0 4px" }}>
          Message filter
        </h1>
        <p style={{ fontSize: 14, color: "var(--ut-ink-mute)", margin: 0, lineHeight: 1.6, maxWidth: 680 }}>
          Every chat message is checked against these patterns before it is saved.{" "}
          <b>Block</b> refuses the message outright; <b>Flag</b> lets it through and files a report
          here. The filter caught {flaggedLast7Days ?? 0} message{flaggedLast7Days === 1 ? "" : "s"} in
          the last 7 days.
        </p>
      </div>

      <FilterTester />

      <TermManager terms={terms ?? []} />
    </div>
  );
}
