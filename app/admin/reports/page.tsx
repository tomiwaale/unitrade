import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Flag, Clock, CheckCircle2, XCircle, Bot, AlertTriangle } from "lucide-react";
import { reportReasonLabel } from "@/lib/safety";
import ReportActions from "./report-actions";

export const dynamic = "force-dynamic";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  open:      { label: "Open",      color: "#DC2626", bg: "#FEF2F2", icon: Flag         },
  reviewing: { label: "Reviewing", color: "#D97706", bg: "#FFFBEB", icon: Clock        },
  actioned:  { label: "Actioned",  color: "#059669", bg: "#ECFDF5", icon: CheckCircle2 },
  dismissed: { label: "Dismissed", color: "#6B7280", bg: "#F9FAFB", icon: XCircle      },
};

// The terms promise a moderator response within 24 hours. Anything older than
// that and still unresolved is the queue failing its own commitment, so it
// gets called out rather than just sorted to the top.
const SLA_HOURS = 24;

function hoursSince(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

function timeAgo(iso: string) {
  const h = hoursSince(iso);
  if (h < 1) return `${Math.max(1, Math.floor(h * 60))}m ago`;
  if (h < 24) return `${Math.floor(h)}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!(await requireAdmin())) redirect("/");

  const { status } = await searchParams;
  const validStatus = ["open", "reviewing", "actioned", "dismissed"].includes(status ?? "")
    ? status!
    : null;

  const admin = createAdminClient();

  let query = admin
    .from("content_reports")
    .select(`
      id, target_type, target_id, reason, details, evidence_snapshot,
      status, resolution, resolved_at, created_at, reporter_id, reported_user_id,
      reporter:profiles!content_reports_reporter_id_fkey(full_name),
      reported:profiles!content_reports_reported_user_id_fkey(full_name, university, is_suspended)
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (validStatus) query = query.eq("status", validStatus);

  const [{ data: reports }, { data: allStatuses }] = await Promise.all([
    query,
    admin.from("content_reports").select("status, created_at"),
  ]);

  const counts = { open: 0, reviewing: 0, actioned: 0, dismissed: 0 };
  let breaching = 0;
  for (const row of allStatuses ?? []) {
    const s = (row as any).status as keyof typeof counts;
    if (s in counts) counts[s]++;
    if ((s === "open" || s === "reviewing") && hoursSince((row as any).created_at) > SLA_HOURS) {
      breaching++;
    }
  }

  const tabs = [
    { label: "All",       value: null,        count: (allStatuses ?? []).length },
    { label: "Open",      value: "open",      count: counts.open      },
    { label: "Reviewing", value: "reviewing", count: counts.reviewing },
    { label: "Actioned",  value: "actioned",  count: counts.actioned  },
    { label: "Dismissed", value: "dismissed", count: counts.dismissed },
  ];

  return (
    <div className="ut-admin-page">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontWeight: 800, fontSize: 22, color: "var(--ut-ink)", margin: "0 0 4px" }}>
          Reports
        </h1>
        <p style={{ fontSize: 14, color: "var(--ut-ink-mute)", margin: 0 }}>
          {counts.open + counts.reviewing} awaiting a decision · we promise users a response within {SLA_HOURS} hours
        </p>
      </div>

      {breaching > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 18,
          padding: "12px 16px", borderRadius: 10,
          background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B",
        }}>
          <AlertTriangle size={16} />
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>
            {breaching} report{breaching !== 1 ? "s have" : " has"} been waiting longer than {SLA_HOURS} hours.
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map((tab) => {
          const active = validStatus === tab.value;
          return (
            <Link
              key={tab.label}
              href={tab.value ? `/admin/reports?status=${tab.value}` : "/admin/reports"}
              style={{
                padding: "7px 13px", borderRadius: 999, fontSize: 12.5,
                fontWeight: active ? 700 : 500, textDecoration: "none",
                color: active ? "var(--ut-primary-ink)" : "var(--ut-ink-soft)",
                background: active ? "var(--ut-primary-tint)" : "var(--ut-bg-card)",
                border: "1px solid var(--ut-line)",
              }}
            >
              {tab.label} <span style={{ opacity: 0.6 }}>{tab.count}</span>
            </Link>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {(reports ?? []).length === 0 && (
          <div style={{
            padding: 48, textAlign: "center", color: "var(--ut-ink-mute)", fontSize: 14,
            background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
            borderRadius: "var(--ut-radius)",
          }}>
            Nothing here. {validStatus === "open" ? "The queue is clear." : "No reports match this filter."}
          </div>
        )}

        {(reports ?? []).map((report: any) => {
          const config = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.open;
          const StatusIcon = config.icon;
          const isAutomatic = report.reporter_id === null;
          const overdue = (report.status === "open" || report.status === "reviewing")
            && hoursSince(report.created_at) > SLA_HOURS;

          return (
            <div
              key={report.id}
              style={{
                background: "var(--ut-bg-card)",
                border: `1px solid ${overdue ? "#FECACA" : "var(--ut-line)"}`,
                borderRadius: "var(--ut-radius-lg, 16px)", overflow: "hidden",
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                padding: "13px 18px", borderBottom: "1px solid var(--ut-line)",
              }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700,
                  color: config.color, background: config.bg,
                }}>
                  <StatusIcon size={11} /> {config.label}
                </span>

                <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ut-ink)" }}>
                  {reportReasonLabel(report.reason)}
                </span>

                <span style={{
                  fontSize: 11.5, color: "var(--ut-ink-mute)",
                  fontFamily: "var(--ut-font-mono)", textTransform: "uppercase",
                }}>
                  {report.target_type}
                </span>

                {isAutomatic && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                    color: "#4338CA", background: "#EEF2FF",
                  }}>
                    <Bot size={10} /> Auto-filter
                  </span>
                )}

                <span style={{
                  marginLeft: "auto", fontSize: 11.5,
                  color: overdue ? "#DC2626" : "var(--ut-ink-mute)",
                  fontWeight: overdue ? 700 : 400,
                }}>
                  {timeAgo(report.created_at)}
                </span>
              </div>

              <div style={{ padding: "16px 18px" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                  gap: 12, marginBottom: 14,
                }}>
                  <Field
                    label="Reported"
                    value={report.reported?.full_name ?? "Unknown"}
                    sub={[
                      report.reported?.university,
                      report.reported?.is_suspended ? "SUSPENDED" : null,
                    ].filter(Boolean).join(" · ")}
                  />
                  <Field
                    label="Reported by"
                    value={isAutomatic ? "Message filter" : (report.reporter?.full_name ?? "Deleted user")}
                  />
                </div>

                {report.evidence_snapshot && (
                  <div style={{ marginBottom: report.details ? 12 : 14 }}>
                    <p style={fieldLabel}>Content at time of report</p>
                    <pre style={{
                      margin: 0, padding: "11px 13px", borderRadius: 9,
                      background: "var(--ut-bg-sunken)", border: "1px solid var(--ut-line)",
                      fontSize: 12.5, lineHeight: 1.5, color: "var(--ut-ink)",
                      whiteSpace: "pre-wrap", wordBreak: "break-word",
                      fontFamily: "var(--ut-font-mono)", maxHeight: 200, overflow: "auto",
                    }}>
                      {report.evidence_snapshot}
                    </pre>
                  </div>
                )}

                {report.details && (
                  <div style={{ marginBottom: 14 }}>
                    <p style={fieldLabel}>What the reporter said</p>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--ut-ink-soft)", lineHeight: 1.55 }}>
                      {report.details}
                    </p>
                  </div>
                )}

                {report.resolution && (
                  <div style={{
                    padding: "10px 13px", borderRadius: 9, marginBottom: 4,
                    background: "var(--ut-bg-sunken)", border: "1px solid var(--ut-line)",
                  }}>
                    <p style={fieldLabel}>Moderator decision</p>
                    <p style={{ margin: 0, fontSize: 12.5, color: "var(--ut-ink-soft)", lineHeight: 1.5 }}>
                      {report.resolution}
                    </p>
                  </div>
                )}

                {report.status !== "actioned" && report.status !== "dismissed" && (
                  <ReportActions
                    reportId={report.id}
                    status={report.status}
                    targetType={report.target_type}
                    targetId={report.target_id}
                    reportedUserId={report.reported_user_id}
                    reportedUserName={report.reported?.full_name ?? "this user"}
                    reportedUserSuspended={Boolean(report.reported?.is_suspended)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p style={fieldLabel}>{label}</p>
      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "var(--ut-ink)" }}>{value}</p>
      {sub && <p style={{ margin: "1px 0 0", fontSize: 11.5, color: "var(--ut-ink-mute)" }}>{sub}</p>}
    </div>
  );
}

const fieldLabel: React.CSSProperties = {
  margin: "0 0 4px", fontSize: 10.5, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.08em",
  color: "var(--ut-ink-mute)", fontFamily: "var(--ut-font-mono)",
};
