import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { Plus, MessageCircle, Clock, CheckCircle2, AlertCircle } from "lucide-react";

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

export default async function SupportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/support");

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, subject, category, status, updated_at, created_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 16px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: 22, color: "var(--ut-ink)", margin: "0 0 4px" }}>Support</h1>
            <p style={{ margin: 0, fontSize: 13, color: "var(--ut-ink-mute)" }}>Your help requests</p>
          </div>
          <Link
            href="/support/new"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 16px", borderRadius: 999, fontSize: 13, fontWeight: 700,
              background: "var(--ut-primary)", color: "white", textDecoration: "none",
            }}
          >
            <Plus size={14} /> New request
          </Link>
        </div>

        {!tickets || tickets.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "48px 24px",
            background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
            borderRadius: "var(--ut-radius)",
          }}>
            <AlertCircle size={32} style={{ color: "var(--ut-ink-mute)", marginBottom: 12 }} />
            <p style={{ fontWeight: 700, color: "var(--ut-ink)", margin: "0 0 6px" }}>No support requests yet</p>
            <p style={{ fontSize: 13, color: "var(--ut-ink-mute)", margin: "0 0 20px" }}>
              Having an issue? We&apos;re here to help.
            </p>
            <Link
              href="/support/new"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "10px 18px", borderRadius: 999, fontSize: 13, fontWeight: 700,
                background: "var(--ut-primary)", color: "white", textDecoration: "none",
              }}
            >
              <Plus size={14} /> Open a request
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tickets.map((ticket) => {
              const cfg = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.open;
              const Icon = cfg.icon;
              return (
                <Link
                  key={ticket.id}
                  href={`/support/${ticket.id}`}
                  style={{
                    display: "block", textDecoration: "none",
                    background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
                    borderRadius: "var(--ut-radius)", padding: "16px 18px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: "0 0 4px", fontWeight: 700, fontSize: 14,
                        color: "var(--ut-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {ticket.subject}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--ut-ink-mute)" }}>
                        {CATEGORY_LABELS[ticket.category] ?? ticket.category} · {timeAgo(ticket.updated_at)}
                      </p>
                    </div>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                      color: cfg.color, background: cfg.bg, flexShrink: 0,
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
      </main>
    </>
  );
}
