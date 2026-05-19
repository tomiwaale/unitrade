import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { ChevronLeft, Tag } from "lucide-react";
import ChatView from "./chat-view";

export const dynamic = "force-dynamic";

function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: conv } = await supabase
    .from("conversations")
    .select(`
      id,
      products(id, title, listing_type),
      buyer:profiles!conversations_buyer_id_fkey(id, full_name),
      seller:profiles!conversations_seller_id_fkey(id, full_name)
    `)
    .eq("id", id)
    .single();

  if (!conv) notFound();

  const buyerId  = (conv.buyer as any)?.id;
  const sellerId = (conv.seller as any)?.id;
  if (user.id !== buyerId && user.id !== sellerId) notFound();

  const { data: initialMessages } = await supabase
    .from("messages")
    .select("id, sender_id, content, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  const other = user.id === buyerId ? conv.seller : conv.buyer;
  const otherName = (other as any)?.full_name ?? "User";

  return (
    <div className="ut-app">
      <Navbar />
      <main className="ut-main" style={{ paddingBottom: 40 }}>
        <Link href="/messages" className="ut-detail-back">
          <ChevronLeft size={15} /> All messages
        </Link>

        <div
          style={{
            background: "var(--ut-bg-card)",
            border: "1px solid var(--ut-line)",
            borderRadius: "var(--ut-radius-lg)",
            overflow: "hidden",
          }}
        >
          {/* Thread header */}
          <div className="ut-msg-thread-head">
            <div
              className="ut-avatar"
              style={{ width: 40, height: 40, fontSize: 13, background: "var(--ut-primary)", color: "white" }}
            >
              {getInitials(otherName)}
            </div>
            <div className="who">
              <b>{otherName}</b>
              <span>Student trader</span>
            </div>
            <Link
              href={`/product/${(conv.products as any)?.id}`}
              className="listing-ref"
            >
              <Tag size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />
              {(conv.products as any)?.title ?? "Deleted listing"}
            </Link>
          </div>

          <ChatView
            conversationId={id}
            currentUserId={user.id}
            initialMessages={initialMessages ?? []}
          />
        </div>
      </main>
    </div>
  );
}
