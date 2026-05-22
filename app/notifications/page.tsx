import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { Bell, ShoppingBag, Star, ArrowLeftRight, MessageSquare, CheckCircle2 } from "lucide-react";
import MarkAllRead from "./mark-all-read";

const TYPE_ICON: Record<string, React.ElementType> = {
  order: ShoppingBag,
  review: Star,
  swap: ArrowLeftRight,
  message: MessageSquare,
};

function NotifIcon({ type }: { type: string }) {
  const Icon = TYPE_ICON[type] ?? Bell;
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
      background: "var(--ut-primary-tint)", color: "var(--ut-primary-ink)",
      display: "grid", placeItems: "center",
    }}>
      <Icon size={16} />
    </div>
  );
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const items = notifications ?? [];
  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="ut-app">
      <Navbar />
      <main className="ut-main" style={{ maxWidth: 620 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: 22, color: "var(--ut-ink)", margin: 0 }}>Notifications</h1>
            {unreadCount > 0 && (
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ut-ink-mute)" }}>
                {unreadCount} unread
              </p>
            )}
          </div>
          {unreadCount > 0 && <MarkAllRead userId={user.id} />}
        </div>

        {items.length === 0 ? (
          <div style={{
            background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
            borderRadius: "var(--ut-radius)", padding: "48px 24px",
            textAlign: "center",
          }}>
            <Bell size={32} style={{ color: "var(--ut-ink-mute)", marginBottom: 12 }} />
            <p style={{ margin: 0, fontWeight: 600, color: "var(--ut-ink)", fontSize: 15 }}>No notifications yet</p>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ut-ink-mute)" }}>
              You'll see order updates, reviews, and swap activity here.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {items.map((notif: any) => {
              const href = notif.related_id
                ? notif.type === "order" ? `/orders/${notif.related_id}`
                : notif.type === "message" ? `/messages/${notif.related_id}`
                : notif.type === "swap" ? `/swaps`
                : notif.type === "review" ? `/orders/${notif.related_id}`
                : null
                : null;

              const inner = (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  padding: "14px 16px",
                  background: notif.read ? "var(--ut-bg-card)" : "var(--ut-primary-tint)",
                  borderRadius: "var(--ut-radius)",
                  border: "1px solid var(--ut-line)",
                  transition: "background 0.15s",
                }}>
                  <NotifIcon type={notif.type} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: notif.read ? 500 : 700, fontSize: 14, color: "var(--ut-ink)" }}>
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--ut-ink-mute)", lineHeight: 1.4 }}>
                        {notif.body}
                      </p>
                    )}
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--ut-ink-mute)", fontFamily: "var(--ut-font-mono)" }}>
                      {new Date(notif.created_at).toLocaleDateString("en-NG", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {!notif.read && (
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: "var(--ut-primary)", flexShrink: 0, marginTop: 4,
                    }} />
                  )}
                </div>
              );

              return href ? (
                <Link key={notif.id} href={href} style={{ textDecoration: "none" }}>
                  {inner}
                </Link>
              ) : (
                <div key={notif.id}>{inner}</div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
