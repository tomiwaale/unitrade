import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseSegment } from "@/lib/marketing";
import CampaignEditor from "./campaign-editor";

export const metadata = { title: "Campaign · Admin" };

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: campaign } = await admin
    .from("email_campaigns")
    .select("id, name, subject, preheader, body_md, segment, status, scheduled_at, total_recipients, sent_count, failed_count, started_at, completed_at")
    .eq("id", id)
    .single();

  if (!campaign) notFound();

  // Failed rows are the only per-recipient detail worth surfacing — a full
  // recipient list would be thousands of rows for no operational benefit.
  const { data: failures } = campaign.failed_count > 0
    ? await admin
        .from("email_campaign_recipients")
        .select("email, error")
        .eq("campaign_id", id)
        .eq("status", "failed")
        .limit(50)
    : { data: [] };

  return (
    <div className="ut-admin-page">
      <Link
        href="/admin/marketing"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16,
          fontSize: 13, color: "var(--ut-ink-mute)", textDecoration: "none",
        }}
      >
        <ArrowLeft size={13} /> All campaigns
      </Link>

      <CampaignEditor
        campaign={{ ...campaign, segment: parseSegment(campaign.segment) }}
        failures={failures ?? []}
      />
    </div>
  );
}
