import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, CheckCircle2, Clock, MessageCircle } from "lucide-react";
import AdminSupportReply from "./admin-support-reply";

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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminSupportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: adminProfile } = await admin
    .from("profiles")
    .select("is_admin, full_name")
    .eq("id", user.id)
    .single();

  if (!adminProfile?.is_admin) redirect("/");

  const { data: ticket } = await admin
    .from("support_tickets")
    .select(`id, subject, category, status, created_at, profiles(full_name, university, phone)`)
    .eq("id", id)
    .single();

  if (!ticket) notFound();

  const { data: messages } = await admin
    .from("support_messages")
    .select(`id, content, is_admin, sender_id, created_at, profiles(full_name)`)
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  const cfg = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.open;
  const StatusIcon = cfg.icon;
  const ticketUser = (ticket as any).profiles;

  return (
    <div className="ut-admin-page" style={{ maxWidth: 700 }}>
      <Link
        href="/admin/support"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 13, color: "var(--ut-ink-mute)", textDecoration: "none", marginBottom: 20,
        }}
      >
        <ChevronLeft size={14} /> Back to support
      </Link>

      {/* Ticket header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 20, color: "var(--ut-ink)", margin: "0 0 4px", lineHeight: 1.3 }}>
            {ticket.subject}
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: "var(--ut-ink-mute)" }}>
            {CATEGORY_LABELS[(ticket as any).category] ?? (ticket as any).category}
            {" · "}opened {formatDate(ticket.created_at)}
          </p>
        </div>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
          color: cfg.color, background: cfg.bg, flexShrink: 0,
        }}>
          <StatusIcon size={12} />
          {cfg.label}
        </span>
      </div>

      {/* User info */}
      <div style={{
        background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
        borderRadius: "var(--ut-radius)", padding: "12px 16px", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: "var(--ut-primary-tint)", color: "var(--ut-primary-ink)",
          display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14,
        }}>
          {ticketUser?.full_name?.charAt(0).toUpperCase() ?? "?"}
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--ut-ink)" }}>
            {ticketUser?.full_name ?? "Unknown user"}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--ut-ink-mute)" }}>
            {ticketUser?.university ?? "—"}
            {ticketUser?.phone && ` · ${ticketUser.phone}`}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        {(messages ?? []).map((msg: any) => {
          const isAdmin = msg.is_admin;
          const senderName = isAdmin
            ? (msg.profiles?.full_name ?? "KolejSwap Support")
            : ticketUser?.full_name ?? "User";
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isAdmin ? "flex-end" : "flex-start" }}>
              <p style={{ margin: "0 0 3px 4px", fontSize: 11, fontWeight: 700, color: "var(--ut-ink-mute)" }}>
                {senderName}
              </p>
              <div style={{
                maxWidth: "80%", padding: "10px 14px",
                borderRadius: isAdmin ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: isAdmin ? "var(--ut-primary)" : "var(--ut-bg-sunken)",
                color: isAdmin ? "white" : "var(--ut-ink)",
                border: isAdmin ? "none" : "1px solid var(--ut-line)",
                fontSize: 14, lineHeight: 1.45, whiteSpace: "pre-wrap",
              }}>
                {msg.content}
              </div>
              <span style={{ fontSize: 10, color: "var(--ut-ink-mute)", margin: "3px 4px 0", fontFamily: "var(--ut-font-mono)" }}>
                {formatTime(msg.created_at)} · {formatDate(msg.created_at)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Reply / action panel */}
      <AdminSupportReply
        ticketId={id}
        isClosed={ticket.status === "closed"}
        adminName={adminProfile.full_name ?? "Support"}
      />
    </div>
  );
}
