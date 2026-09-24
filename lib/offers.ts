import type { SupabaseClient } from "@supabase/supabase-js";
import { describeMessageError } from "@/lib/safety";

// Price negotiation. The state machine itself lives in the database
// (033_price_offers.sql) because an offer sets the amount money moves at, so
// this module is deliberately thin: it calls the RPCs, and it turns their
// error codes into something a student can read.
//
// Shared by the web server actions (app/actions/offer.ts, cookie-scoped
// client) and by any mobile route that needs it (Bearer-token-scoped client).
// The Flutter app calls the same two RPCs directly — see
// mobile/lib/features/offers/data/offer_repository.dart — so the rules below
// are enforced in one place for both.

export type OfferStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "countered"
  | "withdrawn"
  | "expired";

/// What happened to an offer, as recorded on the chat message that announced
/// it. A single offer produces several of these (offered → accepted), which is
/// why the bubble needs the event and not just the offer.
export type OfferEvent = "offered" | "countered" | "accepted" | "declined" | "withdrawn";

export interface PriceOffer {
  id: string;
  product_id: string;
  conversation_id: string | null;
  buyer_id: string;
  seller_id: string;
  offered_by: string;
  amount: number;
  note: string | null;
  status: OfferStatus;
  counters_id: string | null;
  expires_at: string;
  responded_at: string | null;
  order_id: string | null;
  created_at: string;
  updated_at: string;
}

export const OFFER_SELECT =
  "id, product_id, conversation_id, buyer_id, seller_id, offered_by, amount, note, " +
  "status, counters_id, expires_at, responded_at, order_id, created_at, updated_at";

export type OfferResult = { offer: PriceOffer } | { error: string };

export function formatNaira(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return `₦${rounded.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
  })}`;
}

// The RPCs raise bare codes so that every caller — web, mobile, a future admin
// tool — can phrase them for its own audience. Postgres prefixes them, so
// match rather than compare.
export function describeOfferError(error: { code?: string; message?: string } | null): string {
  if (!error) return "Something went wrong. Please try again.";

  // A note that trips the content filter fails the whole offer, since the note
  // travels as the chat message announcing it.
  const moderation = describeMessageError(error);
  if (moderation) return moderation;

  const message = error.message ?? "";
  const has = (code: string) => message.includes(code);

  if (has("NOT_AUTHENTICATED")) return "Please sign in to make an offer.";
  if (has("OFFER_RATE_LIMITED")) return "You're sending offers too quickly. Give it a minute.";
  if (has("PRODUCT_NOT_FOUND")) return "This listing no longer exists.";
  if (has("PRODUCT_NOT_AVAILABLE")) return "This item is no longer available.";
  if (has("OFFERS_NOT_ACCEPTED")) return "This seller isn't taking offers on this item.";
  if (has("AMOUNT_TOO_HIGH")) return "That's well above the asking price — check the amount.";
  if (has("INVALID_AMOUNT")) return "Enter an amount greater than ₦0.";
  if (has("SELF_OFFER")) return "You can't make an offer on your own listing.";
  if (has("COUNTER_REQUIRES_OFFER")) return "You can only counter an offer a buyer has made.";
  if (has("CANNOT_COUNTER_OWN_OFFER")) return "You've already named a price — wait for a reply.";
  if (has("CANNOT_RESPOND_TO_OWN_OFFER")) return "You can't accept your own offer.";
  if (has("NOT_YOUR_OFFER")) return "Only the person who made an offer can withdraw it.";
  if (has("OFFER_NOT_PENDING")) return "This offer has already been answered.";
  if (has("OFFER_NOT_FOUND")) return "That offer no longer exists.";
  if (has("OFFER_PRODUCT_MISMATCH")) return "That offer belongs to a different listing.";
  if (has("NOT_A_PARTICIPANT")) return "You're not part of this negotiation.";
  if (has("CONVERSATION_BLOCKED")) return "You can't negotiate with this person.";
  if (has("USER_SUSPENDED")) return "Your account can't make offers right now.";
  if (has("OFFER_NOT_REDEEMABLE")) {
    return "That agreed price has expired or was already used. Ask the seller for a fresh offer.";
  }
  if (has("INVALID_ACTION")) return "That isn't something you can do to an offer.";

  return "Could not complete that. Please try again.";
}

/// A buyer naming a price, or a seller countering one. `countersId` is what
/// distinguishes the two, and the database decides which side the caller is on
/// rather than trusting a flag from here.
export async function placeOffer(
  supabase: SupabaseClient,
  params: { productId: string; amount: number; note?: string | null; countersId?: string | null },
): Promise<OfferResult> {
  const { data, error } = await supabase.rpc("place_price_offer", {
    p_product_id: params.productId,
    p_amount: params.amount,
    p_note: params.note?.trim() || null,
    p_counters_id: params.countersId ?? null,
  });

  if (error) return { error: describeOfferError(error) };
  // RETURNS price_offers hands back the whole row, as an object from
  // PostgREST; a set-returning shape would arrive as a single-element array.
  const offer = (Array.isArray(data) ? data[0] : data) as PriceOffer | null;
  if (!offer) return { error: "Could not place that offer. Please try again." };

  return { offer };
}

export async function respondToOffer(
  supabase: SupabaseClient,
  offerId: string,
  action: "accept" | "decline" | "withdraw",
): Promise<OfferResult> {
  const { data, error } = await supabase.rpc("respond_to_price_offer", {
    p_offer_id: offerId,
    p_action: action,
  });

  if (error) return { error: describeOfferError(error) };
  const offer = (Array.isArray(data) ? data[0] : data) as PriceOffer | null;
  if (!offer) return { error: "Could not update that offer. Please try again." };

  return { offer };
}

/// Every offer in a thread, for rendering the cards. RLS scopes this to the
/// two participants.
export async function fetchConversationOffers(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<PriceOffer[]> {
  const { data } = await supabase
    .from("price_offers")
    .select(OFFER_SELECT)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  // Cast through unknown: the client is untyped here, so PostgREST's row type
  // is inferred as an error-shaped union.
  return (data ?? []) as unknown as PriceOffer[];
}

/// The buyer's live agreed price for a listing, if they have one. Drives the
/// "Buy at ₦X" copy on the product page and in the thread. Checkout re-derives
/// this server-side, so this is presentation only.
export async function fetchRedeemableOffer(
  supabase: SupabaseClient,
  productId: string,
  buyerId: string,
): Promise<PriceOffer | null> {
  const { data } = await supabase
    .from("price_offers")
    .select(OFFER_SELECT)
    .eq("product_id", productId)
    .eq("buyer_id", buyerId)
    .eq("status", "accepted")
    .is("order_id", null)
    .gt("expires_at", new Date().toISOString())
    .order("responded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as unknown as PriceOffer | null) ?? null;
}

// ── Presentation helpers, shared by the chat thread and the product page ────

export function isOfferLive(offer: PriceOffer): boolean {
  return (
    (offer.status === "pending" || offer.status === "accepted") &&
    new Date(offer.expires_at).getTime() > Date.now()
  );
}

/// Whether `userId` is the one being asked. Accepting and declining belong to
/// the side that did *not* name the price; withdrawing belongs to the side that
/// did.
export function canRespondToOffer(offer: PriceOffer, userId: string): boolean {
  return (
    offer.status === "pending" &&
    isOfferLive(offer) &&
    offer.offered_by !== userId &&
    (offer.buyer_id === userId || offer.seller_id === userId)
  );
}

export function canWithdrawOffer(offer: PriceOffer, userId: string): boolean {
  return offer.status === "pending" && isOfferLive(offer) && offer.offered_by === userId;
}

/// Rounded up, so "expires in 0 hours" never appears on a live offer.
export function offerExpiryLabel(offer: PriceOffer): string {
  const ms = new Date(offer.expires_at).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.ceil(ms / 3_600_000);
  if (hours <= 1) return "Expires within the hour";
  if (hours < 24) return `Expires in ${hours} hours`;
  const days = Math.ceil(hours / 24);
  return `Expires in ${days} day${days === 1 ? "" : "s"}`;
}

export function offerStatusLabel(status: OfferStatus): string {
  switch (status) {
    case "pending": return "Awaiting reply";
    case "accepted": return "Accepted";
    case "declined": return "Declined";
    case "countered": return "Countered";
    case "withdrawn": return "Withdrawn";
    case "expired": return "Expired";
  }
}
