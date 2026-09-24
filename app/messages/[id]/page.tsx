import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { ChevronLeft, Tag } from "lucide-react";
import { productHref } from "@/lib/product-slug";
import ChatView from "./chat-view";
import { fetchConversationOffers } from "@/lib/offers";
import PaymentSafetyDialog from "./payment-safety-dialog";
import SafetyMenu from "@/components/safety/safety-menu";

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
      products(id, title, listing_type, price, allow_offers, status),
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
    .select("id, sender_id, content, created_at, hidden_at, offer_id, offer_event")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  // Offer rows are fetched alongside the thread rather than joined onto it: one
  // offer spans several messages, and the card renders from the offer's live
  // status rather than from whatever was true when the bubble was posted.
  const initialOffers = await fetchConversationOffers(supabase, id);

  const other = user.id === buyerId ? conv.seller : conv.buyer;
  const otherName = (other as any)?.full_name ?? "User";
  const otherId = (other as any)?.id as string;

  const listing = conv.products as any;
  // A service has no fixed unit to haggle over, and a deleted listing has
  // nothing left to negotiate; both simply leave the offer affordances out.
  const product =
    listing?.id && listing?.listing_type !== "service"
      ? {
          id: listing.id as string,
          title: (listing.title as string) ?? "This listing",
          price: Number(listing.price ?? 0),
          allowOffers: listing.allow_offers !== false,
          isActive: listing.status === "active",
        }
      : null;

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
              href={(conv.products as any)?.id && (conv.products as any)?.title
                ? productHref((conv.products as any).title, (conv.products as any).id)
                : "#"}
              className="listing-ref"
            >
              <Tag size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />
              {(conv.products as any)?.title ?? "Deleted listing"}
            </Link>
            {/* Blocking here removes this conversation from the inbox, so the
                menu sends the user back to /messages rather than leaving them
                on a page they can no longer load. */}
            <SafetyMenu
              otherUserId={otherId}
              otherUserName={otherName}
              redirectAfterBlock="/messages"
            />
          </div>

          <ChatView
            conversationId={id}
            currentUserId={user.id}
            initialMessages={initialMessages ?? []}
            initialOffers={initialOffers}
            product={product}
            isBuyer={user.id === buyerId}
          />
        </div>
      </main>
      <PaymentSafetyDialog />
    </div>
  );
}
