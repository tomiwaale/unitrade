"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Plus, Mail, Clock, CheckCircle2, AlertCircle, Copy, Trash2, FileText, Loader2, Send, PencilLine,
  Sparkles, BookmarkPlus,
} from "lucide-react";
import { toast } from "sonner";
import { describeSegment, type Segment } from "@/lib/marketing";
import type { StarterTemplateMeta } from "@/lib/email-campaign-templates";
import {
  campaignFromStarter, campaignFromTemplate, createCampaign, deleteCampaign, deleteTemplate,
  duplicateCampaign, saveStarterAsTemplate,
} from "./actions";

type Campaign = {
  id: string;
  name: string;
  subject: string;
  segment: Segment;
  status: string;
  scheduled_at: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  completed_at: string | null;
};

type Template = {
  id: string;
  name: string;
  subject: string;
  preheader: string;
  body_md: string;
  updated_at: string;
};

type Tab = "campaigns" | "starters" | "templates";

const TABS: Tab[] = ["campaigns", "starters", "templates"];

const TAB_LABELS: Record<Tab, string> = {
  campaigns: "Campaigns",
  starters: "Starter templates",
  templates: "Saved templates",
};

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string; Icon: typeof Mail }> = {
  draft:     { bg: "var(--ut-bg-sunken)", fg: "var(--ut-ink-mute)", label: "Draft",     Icon: PencilLine },
  scheduled: { bg: "#fef3c7",             fg: "#92400e",            label: "Scheduled", Icon: Clock },
  sending:   { bg: "#dbeafe",             fg: "#1e40af",            label: "Sending",   Icon: Send },
  sent:      { bg: "#dcfce7",             fg: "#15803d",            label: "Sent",      Icon: CheckCircle2 },
  cancelled: { bg: "var(--ut-bg-sunken)", fg: "var(--ut-ink-mute)", label: "Cancelled", Icon: AlertCircle },
};

function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.draft;
  const { Icon } = style;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: style.bg, color: style.fg,
      fontSize: 11.5, fontWeight: 700, padding: "4px 9px", borderRadius: 999,
    }}>
      <Icon size={12} /> {style.label}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function MarketingDashboard({
  campaigns, templates, starters, optedOutCount,
}: {
  campaigns: Campaign[];
  templates: Template[];
  starters: StarterTemplateMeta[];
  optedOutCount: number;
}) {
  const [tab, setTab] = useState<Tab>("campaigns");
  const [isPending, startTransition] = useTransition();

  const sentTotal = campaigns.reduce((sum, c) => sum + c.sent_count, 0);

  function handleNew() {
    startTransition(async () => {
      const result = await createCampaign();
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <StatTile label="Campaigns" value={campaigns.length} />
        <StatTile label="Emails delivered" value={sentTotal} />
        <StatTile label="Templates" value={templates.length + starters.length} />
        <StatTile label="Unsubscribed" value={optedOutCount} />
      </div>

      {/* Tabs + new button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: "var(--ut-bg-sunken)", padding: 4, borderRadius: 10 }}>
          {TABS.map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                border: 0, cursor: "pointer", padding: "7px 14px", borderRadius: 7,
                fontSize: 13, fontWeight: tab === key ? 700 : 500, whiteSpace: "nowrap",
                background: tab === key ? "var(--ut-bg)" : "transparent",
                color: tab === key ? "var(--ut-ink)" : "var(--ut-ink-mute)",
              }}
            >
              {TAB_LABELS[key]}
            </button>
          ))}
        </div>

        <button
          onClick={handleNew}
          disabled={isPending}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: "var(--ut-primary)", color: "white", border: 0,
            padding: "10px 16px", borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
          }}
        >
          {isPending ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={15} />}
          New campaign
        </button>
      </div>

      {tab === "campaigns" && <CampaignList campaigns={campaigns} />}
      {tab === "starters" && <StarterList starters={starters} />}
      {tab === "templates" && <TemplateList templates={templates} />}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
      borderRadius: 12, padding: "14px 16px",
    }}>
      <p style={{ margin: 0, fontSize: 12, color: "var(--ut-ink-mute)", fontWeight: 500 }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "var(--ut-ink)" }}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function CampaignList({ campaigns }: { campaigns: Campaign[] }) {
  const [isPending, startTransition] = useTransition();

  if (campaigns.length === 0) {
    return <EmptyState icon={<Mail size={22} />} title="No campaigns yet"
      body="Create your first campaign to email your users about new features, promos or campus launches." />;
  }

  function handleDelete(campaign: Campaign) {
    if (!confirm(`Delete "${campaign.name}"? This can't be undone.`)) return;
    startTransition(async () => {
      const result = await deleteCampaign(campaign.id);
      if (result?.error) toast.error(result.error);
      else toast.success("Campaign deleted");
    });
  }

  function handleDuplicate(campaign: Campaign) {
    startTransition(async () => {
      const result = await duplicateCampaign(campaign.id);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div style={{ display: "grid", gap: 10, opacity: isPending ? 0.6 : 1 }}>
      {campaigns.map((campaign) => {
        const progress = campaign.total_recipients > 0
          ? Math.round((campaign.sent_count / campaign.total_recipients) * 100)
          : 0;

        return (
          <div key={campaign.id} style={{
            background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
            borderRadius: 12, padding: "14px 16px",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <Link href={`/admin/marketing/${campaign.id}`} style={{
                    fontWeight: 700, fontSize: 14.5, color: "var(--ut-ink)", textDecoration: "none",
                  }}>
                    {campaign.name}
                  </Link>
                  <StatusPill status={campaign.status} />
                </div>

                <p style={{ margin: "0 0 6px", fontSize: 13, color: "var(--ut-ink-soft)" }}>
                  {campaign.subject || <em style={{ color: "var(--ut-ink-mute)" }}>No subject yet</em>}
                </p>

                <p style={{ margin: 0, fontSize: 12, color: "var(--ut-ink-mute)" }}>
                  {describeSegment(campaign.segment)}
                  {campaign.status === "scheduled" && ` · sends ${formatDate(campaign.scheduled_at)}`}
                  {campaign.status === "sent" && ` · sent ${formatDate(campaign.completed_at)}`}
                  {(campaign.status === "sent" || campaign.status === "sending") &&
                    ` · ${campaign.sent_count.toLocaleString()}/${campaign.total_recipients.toLocaleString()} delivered`}
                  {campaign.failed_count > 0 && ` · ${campaign.failed_count} failed`}
                </p>

                {campaign.status === "sending" && (
                  <div style={{ marginTop: 10, height: 5, background: "var(--ut-bg-sunken)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${progress}%`, height: "100%", background: "var(--ut-primary)", transition: "width 0.3s" }} />
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <IconButton title="Duplicate" onClick={() => handleDuplicate(campaign)}>
                  <Copy size={14} />
                </IconButton>
                {campaign.status !== "sending" && (
                  <IconButton title="Delete" danger onClick={() => handleDelete(campaign)}>
                    <Trash2 size={14} />
                  </IconButton>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const CATEGORY_STYLE: Record<string, { bg: string; fg: string }> = {
  Onboarding:     { bg: "#dbeafe", fg: "#1e40af" },
  Activation:     { bg: "#dcfce7", fg: "#15803d" },
  "Re-engagement":{ bg: "#fef3c7", fg: "#92400e" },
  Announcement:   { bg: "#ede9fe", fg: "#5b21b6" },
  Seasonal:       { bg: "#ffe4e6", fg: "#9f1239" },
  Trust:          { bg: "#cffafe", fg: "#155e75" },
  Growth:         { bg: "#fae8ff", fg: "#86198f" },
};

function CategoryPill({ category }: { category: string }) {
  const style = CATEGORY_STYLE[category] ?? { bg: "var(--ut-bg-sunken)", fg: "var(--ut-ink-mute)" };
  return (
    <span style={{
      background: style.bg, color: style.fg,
      fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999, whiteSpace: "nowrap",
    }}>
      {category}
    </span>
  );
}

// Built-in campaigns from lib/email-campaign-templates.ts. "Use" forks one into
// a draft — copy, subject and the audience it was written for — which is then
// an ordinary campaign with no link back to the starter.
function StarterList({ starters }: { starters: StarterTemplateMeta[] }) {
  const [isPending, startTransition] = useTransition();

  function handleUse(starter: StarterTemplateMeta) {
    startTransition(async () => {
      const result = await campaignFromStarter(starter.slug);
      if (result?.error) toast.error(result.error);
    });
  }

  function handleSave(starter: StarterTemplateMeta) {
    startTransition(async () => {
      const result = await saveStarterAsTemplate(starter.slug);
      if (result?.error) toast.error(result.error);
      else toast.success(`"${starter.name}" copied to saved templates`);
    });
  }

  return (
    <div style={{ display: "grid", gap: 10, opacity: isPending ? 0.6 : 1 }}>
      <p style={{ margin: "0 0 2px", fontSize: 13, color: "var(--ut-ink-mute)", lineHeight: 1.6 }}>
        Ready-to-send campaigns using the KolejSwap email design. Using one creates an
        editable draft with its audience already selected — nothing sends until you say so.
      </p>

      {starters.map((starter) => (
        <div key={starter.slug} style={{
          background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
          borderRadius: 12, padding: "14px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
        }}>
          <div style={{ minWidth: 220, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14.5, color: "var(--ut-ink)" }}>
                {starter.name}
              </p>
              <CategoryPill category={starter.category} />
            </div>
            <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--ut-ink-soft)" }}>
              {starter.description}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ut-ink-mute)" }}>
              Subject: {starter.subject}
            </p>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => handleUse(starter)}
              disabled={isPending}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "var(--ut-primary-tint)", color: "var(--ut-primary-ink)", border: 0,
                padding: "8px 13px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              }}
            >
              <Sparkles size={13} /> Use template
            </button>
            <IconButton title="Copy to saved templates" onClick={() => handleSave(starter)}>
              <BookmarkPlus size={14} />
            </IconButton>
          </div>
        </div>
      ))}
    </div>
  );
}

function TemplateList({ templates }: { templates: Template[] }) {
  const [isPending, startTransition] = useTransition();

  if (templates.length === 0) {
    return <EmptyState icon={<FileText size={22} />} title="No saved templates"
      body="Start from a starter template, or open any campaign and choose 'Save as template' to reuse its layout and copy later." />;
  }

  function handleUse(template: Template) {
    startTransition(async () => {
      const result = await campaignFromTemplate(template.id);
      if (result?.error) toast.error(result.error);
    });
  }

  function handleDelete(template: Template) {
    if (!confirm(`Delete template "${template.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteTemplate(template.id);
      if (result?.error) toast.error(result.error);
      else toast.success("Template deleted");
    });
  }

  return (
    <div style={{ display: "grid", gap: 10, opacity: isPending ? 0.6 : 1 }}>
      {templates.map((template) => (
        <div key={template.id} style={{
          background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
          borderRadius: 12, padding: "14px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
        }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: 14.5, color: "var(--ut-ink)" }}>
              {template.name}
            </p>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--ut-ink-mute)" }}>
              {template.subject || "No subject"} · updated {formatDate(template.updated_at)}
            </p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => handleUse(template)}
              style={{
                background: "var(--ut-primary-tint)", color: "var(--ut-primary-ink)", border: 0,
                padding: "8px 13px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              }}
            >
              Use template
            </button>
            <IconButton title="Delete" danger onClick={() => handleDelete(template)}>
              <Trash2 size={14} />
            </IconButton>
          </div>
        </div>
      ))}
    </div>
  );
}

function IconButton({ children, title, onClick, danger }: {
  children: React.ReactNode; title: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      style={{
        width: 32, height: 32, borderRadius: 8, cursor: "pointer",
        border: "1px solid var(--ut-line)", background: "var(--ut-bg)",
        color: danger ? "#dc2626" : "var(--ut-ink-mute)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div style={{
      border: "1px dashed var(--ut-line)", borderRadius: 12, padding: "36px 24px",
      textAlign: "center", color: "var(--ut-ink-mute)",
    }}>
      <div style={{ marginBottom: 10, display: "flex", justifyContent: "center" }}>{icon}</div>
      <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14.5, color: "var(--ut-ink)" }}>{title}</p>
      <p style={{ margin: 0, fontSize: 13, maxWidth: 400, marginInline: "auto", lineHeight: 1.6 }}>{body}</p>
    </div>
  );
}
