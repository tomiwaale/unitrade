import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { ChevronLeft, CheckCircle2, Clock, MessageCircle } from "lucide-react";
import SupportChat from "./support-chat";

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

export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/support");

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, subject, category, status, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!ticket) notFound();

  const { data: messages } = await supabase
    .from("support_messages")
    .select(`
      id, content, is_admin, created_at, sender_id,
      profiles(full_name)
    `)
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  const cfg = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.open;
  const StatusIcon = cfg.icon;

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 0", display: "flex", flexDirection: "column", height: "calc(100dvh - 56px)" }}>
        {/* Header */}
        <div style={{ flexShrink: 0, marginBottom: 16 }}>
          <Link
            href="/support"
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              fontSize: 13, color: "var(--ut-ink-mute)", textDecoration: "none", marginBottom: 10,
            }}
          >
            <ChevronLeft size={14} /> My requests
          </Link>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h1 style={{ fontWeight: 800, fontSize: 17, color: "var(--ut-ink)", margin: "0 0 3px", lineHeight: 1.3 }}>
                {ticket.subject}
              </h1>
              <p style={{ margin: 0, fontSize: 12, color: "var(--ut-ink-mute)" }}>
                {CATEGORY_LABELS[ticket.category] ?? ticket.category} · opened {new Date(ticket.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
              </p>
            </div>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
              padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
              color: cfg.color, background: cfg.bg,
            }}>
              <StatusIcon size={11} />
              {cfg.label}
            </span>
          </div>
          <hr style={{ border: "none", borderTop: "1px solid var(--ut-line)", margin: "14px 0 0" }} />
        </div>

        {/* Chat */}
        <SupportChat
          ticketId={id}
          currentUserId={user.id}
          isClosed={ticket.status === "closed"}
          initialMessages={(messages ?? []).map((m: any) => ({
            id: m.id,
            content: m.content,
            is_admin: m.is_admin,
            sender_id: m.sender_id,
            sender_name: m.profiles?.full_name ?? null,
            created_at: m.created_at,
          }))}
        />
      </main>
    </>
  );
}
