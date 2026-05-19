import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { MessageCircle, Tag, Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";

function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: conversations } = await supabase
    .from("conversations")
    .select(`
      id, created_at,
      products(id, title, listing_type, images),
      buyer:profiles!conversations_buyer_id_fkey(id, full_name),
      seller:profiles!conversations_seller_id_fkey(id, full_name),
      messages(content, created_at, sender_id)
    `)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const items = conversations ?? [];

  return (
    <div className="ut-app">
      <Navbar />
      <main className="ut-main">
        <div className="ut-section-head" style={{ marginTop: 0 }}>
          <div>
            <span className="ut-sub">Direct</span>
            <h2>Messages</h2>
          </div>
          <span style={{ fontFamily: "var(--ut-font-mono)", fontSize: 12, color: "var(--ut-ink-mute)" }}>
            {items.length} conversation{items.length !== 1 ? "s" : ""}
          </span>
        </div>

        {items.length === 0 ? (
          <div style={{
            padding: "60px 40px", textAlign: "center",
            border: "1px dashed var(--ut-line)", borderRadius: "var(--ut-radius-lg)",
            background: "var(--ut-bg-card)",
          }}>
            <MessageCircle size={32} style={{ color: "var(--ut-ink-mute)", marginBottom: 12 }} />
            <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 500, color: "var(--ut-ink-soft)" }}>
              No conversations yet.
            </p>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--ut-ink-mute)" }}>
              Find an item you like and message the seller.
            </p>
            <Link href="/catalog" className="ut-cta ut-cta-primary" style={{ fontSize: 13, padding: "9px 16px" }}>
              Browse listings
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {items.map((conv) => {
              const other = user.id === (conv.buyer as any)?.id ? conv.seller : conv.buyer;
              const msgs = conv.messages ?? [];
              const lastMsg = [...msgs].sort(
                (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0];
              const isService = (conv.products as any)?.listing_type === "service";
              const name = (other as any)?.full_name ?? "Unknown";

              return (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  className="ut-msg-row"
                  style={{ borderRadius: "var(--ut-radius)", border: "1px solid var(--ut-line)", marginBottom: 4 }}
                >
                  <div
                    className="ut-avatar"
                    style={{ width: 40, height: 40, fontSize: 13, background: "var(--ut-primary)", color: "white", flexShrink: 0 }}
                  >
                    {getInitials(name)}
                  </div>
                  <div className="ut-msg-row-text">
                    <b>
                      {name}
                      <small>{lastMsg ? timeAgo(lastMsg.created_at) : ""}</small>
                    </b>
                    <div className="listing">
                      {isService ? <Briefcase size={10} style={{ verticalAlign: "middle", marginRight: 3 }} /> : <Tag size={10} style={{ verticalAlign: "middle", marginRight: 3 }} />}
                      {(conv.products as any)?.title ?? "Deleted listing"}
                    </div>
                    {lastMsg && (
                      <div className="snippet">
                        {lastMsg.sender_id === user.id ? "You: " : ""}{lastMsg.content}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
