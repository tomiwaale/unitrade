import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageCircle, Clock, CheckCircle2 } from "lucide-react";

const STATUS_CONFIG = {
  open:        { label: "Open",        color: "#2563EB", bg: "#EFF6FF", icon: MessageCircle },
  in_progress: { label: "In progress", color: "#D97706", bg: "#FFFBEB", icon: Clock        },
  closed:      { label: "Closed",      color: "#6B7280", bg: "#F9FAFB", icon: CheckCircle2 },
};

const CATEGORY_LABELS: Record<string, string> = {
  order_issue: "Order issue",
  payment:     "Payment",
  account:     "Account",
  other:       "Other",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  const { status: filterStatus } = await searchParams;
  const validStatus = ["open", "in_progress", "closed"].includes(filterStatus ?? "") ? filterStatus : null;

  let query = admin
    .from("support_tickets")
    .select(`
      id, subject, category, status, updated_at,
      profiles(full_name, university)
    `)
    .order("updated_at", { ascending: false });

  if (validStatus) {
    query = query.eq("status", validStatus);
  }

  const { data: tickets } = await query;

  // Counts per status for tab badges
  const { data: counts } = await admin
    .from("support_tickets")
    .select("status");

  const countMap = { open: 0, in_progress: 0, closed: 0 };
  (counts ?? []).forEach((t: any) => {
    if (t.status in countMap) countMap[t.status as keyof typeof countMap]++;
  });

  const tabs = [
    { label: "All",         value: null,          count: (counts ?? []).length },
    { label: "Open",        value: "open",        count: countMap.open         },
    { label: "In progress", value: "in_progress", count: countMap.in_progress  },
    { label: "Closed",      value: "closed",      count: countMap.closed       },
  ];

  return (
    <div className="ut-admin-page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontWeight: 800, fontSize: 22, color: "var(--ut-ink)", margin: 0 }}>Support</h1>
        {countMap.open > 0 && (
          <span style={{
            padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
            background: "#EFF6FF", color: "#2563EB",
          }}>
            {countMap.open} open
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map((tab) => {
          const isActive = validStatus === tab.value;
          const href = tab.value ? `/admin/support?status=${tab.value}` : "/admin/support";
          return (
            <Link
              key={tab.label}
              href={href}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                textDecoration: "none",
                background: isActive ? "var(--ut-primary)" : "var(--ut-bg-card)",
                color: isActive ? "white" : "var(--ut-ink-soft)",
                border: `1px solid ${isActive ? "var(--ut-primary)" : "var(--ut-line)"}`,
              }}
            >
              {tab.label}
              <span style={{
                background: isActive ? "rgba(255,255,255,0.25)" : "var(--ut-bg-sunken)",
                borderRadius: 999, padding: "1px 7px", fontFamily: "var(--ut-font-mono)", fontSize: 10,
              }}>
                {tab.count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Ticket list */}
      {!tickets || tickets.length === 0 ? (
        <p style={{ color: "var(--ut-ink-mute)", fontSize: 14 }}>No tickets found.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tickets.map((ticket: any) => {
            const cfg = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.open;
            const Icon = cfg.icon;
            const user = ticket.profiles;
            return (
              <Link
                key={ticket.id}
                href={`/admin/support/${ticket.id}`}
                style={{
                  display: "block", textDecoration: "none",
                  background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
                  borderRadius: "var(--ut-radius)", padding: "14px 18px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: "0 0 3px", fontWeight: 700, fontSize: 14,
                      color: "var(--ut-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {ticket.subject}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--ut-ink-mute)" }}>
                      <strong style={{ color: "var(--ut-ink-soft)" }}>{user?.full_name ?? "Unknown user"}</strong>
                      {user?.university && ` · ${user.university}`}
                      {" · "}{CATEGORY_LABELS[ticket.category] ?? ticket.category}
                      {" · "}{timeAgo(ticket.updated_at)}
                    </p>
                  </div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
                    padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                    color: cfg.color, background: cfg.bg,
                  }}>
                    <Icon size={11} />
                    {cfg.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
