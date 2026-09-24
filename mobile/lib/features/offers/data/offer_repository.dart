import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase/supabase_client.dart';
import '../../safety/data/safety_repository.dart';
import 'offer_models.dart';

const _offerSelect =
    'id, product_id, conversation_id, buyer_id, seller_id, offered_by, amount, note, '
    'status, counters_id, expires_at, responded_at, order_id, created_at, updated_at';

/// Thrown with a message already fit to show the user. The RPCs raise bare
/// codes precisely so each client can phrase them for its own audience.
class OfferException implements Exception {
  OfferException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Price negotiation, against the same two RPCs the web server actions call
/// (lib/offers.ts → app/actions/offer.ts). Direct Supabase rather than an
/// /api/mobile/* route: place_price_offer and respond_to_price_offer are
/// SECURITY DEFINER and carry their own per-actor throttle, so there is no
/// secret to hold and nothing the server needs to add.
///
/// Reads go straight at the table — price_offers is SELECT-only for
/// authenticated and RLS scopes it to the two participants
/// (033_price_offers.sql).
class OfferRepository {
  String get _myId => supabase.auth.currentUser!.id;

  /// A buyer naming a price, or a seller countering one. [countersId] is what
  /// distinguishes the two, and the database decides which side the caller is
  /// on rather than trusting a flag from here.
  Future<PriceOffer> place({
    required String productId,
    required double amount,
    String? note,
    String? countersId,
  }) async {
    final trimmedNote = note?.trim();

    try {
      final result = await supabase.rpc<dynamic>('place_price_offer', params: {
        'p_product_id': productId,
        'p_amount': amount,
        'p_note': trimmedNote == null || trimmedNote.isEmpty ? null : trimmedNote,
        'p_counters_id': countersId,
      });
      return _single(result);
    } on PostgrestException catch (error) {
      throw OfferException(describeOfferError(error));
    }
  }

  Future<PriceOffer> respond(String offerId, String action) async {
    try {
      final result = await supabase.rpc<dynamic>('respond_to_price_offer', params: {
        'p_offer_id': offerId,
        'p_action': action,
      });
      return _single(result);
    } on PostgrestException catch (error) {
      throw OfferException(describeOfferError(error));
    }
  }

  /// `RETURNS price_offers` arrives as an object from PostgREST; a
  /// set-returning shape would arrive as a single-element list.
  PriceOffer _single(dynamic result) {
    final row = result is List ? result.firstOrNull : result;
    if (row is! Map) {
      throw OfferException('Could not complete that. Please try again.');
    }
    return PriceOffer.fromJson(Map<String, dynamic>.from(row));
  }

  /// Every offer in a thread, for rendering the bubbles.
  Future<List<PriceOffer>> fetchForConversation(String conversationId) async {
    final rows = await supabase
        .from('price_offers')
        .select(_offerSelect)
        .eq('conversation_id', conversationId)
        .order('created_at', ascending: true);

    return (rows as List)
        .map((row) => PriceOffer.fromJson(row as Map<String, dynamic>))
        .toList();
  }

  /// Every offer this user has on a listing, newest first. The product screen
  /// needs both the agreed price (to offer to pay it) and any offer still
  /// awaiting a reply (so it does not invite a second one).
  Future<List<PriceOffer>> fetchForProduct(String productId) async {
    final rows = await supabase
        .from('price_offers')
        .select(_offerSelect)
        .eq('product_id', productId)
        .eq('buyer_id', _myId)
        .order('created_at', ascending: false);

    return (rows as List)
        .map((row) => PriceOffer.fromJson(row as Map<String, dynamic>))
        .toList();
  }
}

/// Mirrors describeOfferError() in lib/offers.ts. Postgres prefixes the codes
/// its RAISE EXCEPTION produces, so these match rather than compare.
String describeOfferError(Object error) {
  if (error is! PostgrestException) {
    return 'Something went wrong. Please try again.';
  }

  // A note that trips the content filter fails the whole offer, since the note
  // travels as the chat message announcing it.
  final moderation = describeMessageError(error);
  if (moderation != null) return moderation;

  final message = error.message;
  bool has(String code) => message.contains(code);

  if (has('NOT_AUTHENTICATED')) return 'Please sign in to make an offer.';
  if (has('OFFER_RATE_LIMITED')) {
    return "You're sending offers too quickly. Give it a minute.";
  }
  if (has('PRODUCT_NOT_FOUND')) return 'This listing no longer exists.';
  if (has('PRODUCT_NOT_AVAILABLE')) return 'This item is no longer available.';
  if (has('OFFERS_NOT_ACCEPTED')) {
    return "This seller isn't taking offers on this item.";
  }
  if (has('AMOUNT_TOO_HIGH')) {
    return "That's well above the asking price — check the amount.";
  }
  if (has('INVALID_AMOUNT')) return 'Enter an amount greater than ₦0.';
  if (has('SELF_OFFER')) return "You can't make an offer on your own listing.";
  if (has('COUNTER_REQUIRES_OFFER')) {
    return 'You can only counter an offer a buyer has made.';
  }
  if (has('CANNOT_COUNTER_OWN_OFFER')) {
    return "You've already named a price — wait for a reply.";
  }
  if (has('CANNOT_RESPOND_TO_OWN_OFFER')) {
    return "You can't accept your own offer.";
  }
  if (has('NOT_YOUR_OFFER')) {
    return 'Only the person who made an offer can withdraw it.';
  }
  if (has('OFFER_NOT_PENDING')) return 'This offer has already been answered.';
  if (has('OFFER_NOT_FOUND')) return 'That offer no longer exists.';
  if (has('OFFER_PRODUCT_MISMATCH')) {
    return 'That offer belongs to a different listing.';
  }
  if (has('NOT_A_PARTICIPANT')) return "You're not part of this negotiation.";
  if (has('CONVERSATION_BLOCKED')) return "You can't negotiate with this person.";
  if (has('USER_SUSPENDED')) return "Your account can't make offers right now.";
  if (has('OFFER_NOT_REDEEMABLE')) {
    return 'That agreed price has expired or was already used. '
        'Ask the seller for a fresh offer.';
  }
  if (has('INVALID_ACTION')) return "That isn't something you can do to an offer.";

  return 'Could not complete that. Please try again.';
}
