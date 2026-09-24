import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:timeago/timeago.dart' as timeago;
import 'package:url_launcher/url_launcher.dart';

import '../../../core/api/mobile_api_client.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/image_compression.dart';
import '../../../core/utils/naira.dart';
import '../../../core/utils/phone.dart';
import '../../checkout/data/checkout_repository.dart';
import '../../product/presentation/fullscreen_image_viewer.dart';
import '../../safety/data/models.dart' as safety;
import '../../safety/data/safety_repository.dart';
import '../../safety/presentation/report_sheet.dart';
import '../../safety/presentation/safety_actions.dart';
import '../../offers/application/offer_providers.dart';
import '../../offers/data/offer_models.dart';
import '../../offers/data/offer_repository.dart';
import '../../offers/presentation/offer_bubble.dart';
import '../../offers/presentation/offer_sheet.dart';
import '../application/chat_providers.dart';
import '../data/calling_repository.dart';
import '../data/models.dart';

final _checkoutRepositoryProvider = Provider((ref) => CheckoutRepository());

class ConversationScreen extends ConsumerStatefulWidget {
  const ConversationScreen({super.key, required this.conversationId, this.summary});

  final String conversationId;
  final ConversationSummary? summary;

  @override
  ConsumerState<ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends ConsumerState<ConversationScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  bool _sending = false;
  bool _buying = false;
  bool _offerBusy = false;

  /// Offer messages already accounted for, so a repaint does not refetch the
  /// thread's offers over and over. See _syncOffersWith.
  final _seenOfferMessageIds = <String>{};
  bool _offerSyncPrimed = false;

  /// Last message count we scrolled for, so a rebuild that isn't a new
  /// message (a read receipt landing, say) doesn't yank the list.
  int _scrolledFor = 0;

  /// Shown at most once per app launch — the call/WhatsApp buttons in the
  /// app bar make it easy to slip into an off-app deal, so every buyer sees
  /// this warning the first time they open a seller chat.
  static bool _hasShownPaymentSafetyDialog = false;

  @override
  void initState() {
    super.initState();
    if (!_hasShownPaymentSafetyDialog) {
      _hasShownPaymentSafetyDialog = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _showPaymentSafetyDialog();
      });
    }
  }

  void _showPaymentSafetyDialog() {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        icon: const Icon(Icons.warning_amber_rounded, color: Color(0xFFCA8A04), size: 28),
        title: const Text('Keep it on KolejSwap'),
        content: const Text(
          "Always pay through KolejSwap's escrow — never send money directly to a seller "
          "outside the app. If you transact off-platform, we can't protect your payment "
          "or step in if something goes wrong.",
          style: TextStyle(fontSize: 13.5, height: 1.4),
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  /// Only follow new messages when the reader is already at the bottom —
  /// jumping someone out of the scrollback they're reading is worse than
  /// making them tap down.
  void _maybeAutoScroll(int messageCount) {
    if (messageCount == _scrolledFor) return;

    final isFirstLoad = _scrolledFor == 0;
    _scrolledFor = messageCount;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      final position = _scrollController.position;
      final distanceFromBottom = position.maxScrollExtent - position.pixels;
      if (!isFirstLoad && distanceFromBottom > 100) return;

      if (isFirstLoad) {
        _scrollController.jumpTo(position.maxScrollExtent);
      } else {
        _scrollController.animateTo(
          position.maxScrollExtent,
          duration: const Duration(milliseconds: 240),
          curve: Curves.easeOut,
        );
      }
    });
  }

  /// Offer state lives in price_offers, not on the message, because one offer
  /// spans several bubbles and its status changes after the fact. Every offer
  /// event does post a message though, so a new offer message arriving on the
  /// stream is the cue to refetch — which is what lets this screen get by with
  /// the one subscription it already had.
  void _syncOffersWith(List<ChatMessage> messages) {
    final offerMessageIds =
        messages.where((m) => m.offerId != null).map((m) => m.id).toSet();

    // The provider fetches the thread's offers when first watched, so whatever
    // is on screen at that point needs no extra round trip.
    if (!_offerSyncPrimed) {
      _offerSyncPrimed = true;
      _seenOfferMessageIds.addAll(offerMessageIds);
      return;
    }

    final fresh = offerMessageIds.difference(_seenOfferMessageIds);
    if (fresh.isEmpty) return;
    _seenOfferMessageIds.addAll(fresh);

    // Invalidating during build would be re-entrant; the counterpart's accept
    // or counter lands a frame later instead.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ref.invalidate(conversationOffersProvider(widget.conversationId));
    });
  }

  Future<void> _send() async {
    final text = _controller.text;
    if (text.trim().isEmpty || _sending) return;

    setState(() => _sending = true);
    _controller.clear();
    try {
      await ref.read(chatRepositoryProvider).sendMessage(widget.conversationId, text);
    } catch (error) {
      // The moderation filter and a block both arrive as an opaque Postgres
      // error. Put the message back in the box so a refusal does not also
      // lose what they typed.
      final explanation = describeMessageError(error);
      _controller.text = text;
      _showMessage(explanation ?? "Couldn't send that message. Please try again.");
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _sendImage() async {
    if (_sending) return;

    final picked = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 1600);
    if (picked == null) return;

    setState(() => _sending = true);
    try {
      final bytes = await compressImageBytes(await picked.readAsBytes());
      // Whatever is already typed rides along as the caption.
      final caption = _controller.text;
      _controller.clear();
      await ref.read(chatRepositoryProvider).sendImage(
            widget.conversationId,
            bytes,
            caption: caption,
          );
    } catch (error) {
      _showMessage(describeMessageError(error) ?? "Couldn't send that photo. Please try again.");
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _reportMessage(ChatMessage message) async {
    final preview = message.hasText
        ? '"${message.content!.trim()}"'
        : 'Photo sent ${timeago.format(message.createdAt)}';

    await showReportSheet(
      context,
      targetType: safety.ReportTargetType.message,
      targetId: message.id,
      subject: preview,
    );
  }

  /// `agreedOffer` is the buyer's negotiated price, when they have one. Passed
  /// as a hint only — reserve_product_for_checkout resolves the offer itself, so
  /// the amount charged never comes from here.
  Future<void> _buyNow(ConversationSummary summary, {PriceOffer? agreedOffer}) async {
    if (_buying || summary.productId == null) return;
    setState(() => _buying = true);
    try {
      final checkoutUrl = await ref
          .read(_checkoutRepositoryProvider)
          .initCheckout(summary.productId!, offerId: agreedOffer?.id);
      if (!mounted) return;
      final completed = await context.push<bool>('/checkout', extra: checkoutUrl);
      if (completed == true && mounted) context.push('/orders');
    } on MobileApiException catch (e) {
      _showMessage(e.message);
    } catch (_) {
      _showMessage('Could not start checkout. Please try again.');
    } finally {
      if (mounted) setState(() => _buying = false);
    }
  }

  /// Opens the composer for a fresh offer, or for a counter when `counterTo` is
  /// given. The offer list is invalidated on success so the new card appears
  /// even if the realtime message has not landed yet.
  Future<void> _openOfferSheet(ConversationSummary summary, {PriceOffer? counterTo}) async {
    if (summary.productId == null) return;

    final placed = await showOfferSheet(
      context,
      productId: summary.productId!,
      productTitle: summary.productTitle ?? 'this listing',
      listPrice: counterTo?.amount != null && summary.productPrice == null
          ? counterTo!.amount
          : (summary.productPrice ?? 0),
      counterTo: counterTo,
    );

    if (placed != null && mounted) {
      ref.invalidate(conversationOffersProvider(widget.conversationId));
    }
  }

  Future<void> _respondToOffer(PriceOffer offer, String action) async {
    if (_offerBusy) return;
    setState(() => _offerBusy = true);
    try {
      await ref.read(offerRepositoryProvider).respond(offer.id, action);
    } on OfferException catch (e) {
      _showMessage(e.message);
    } catch (_) {
      _showMessage('Could not update that offer. Please try again.');
    } finally {
      if (mounted) {
        setState(() => _offerBusy = false);
        ref.invalidate(conversationOffersProvider(widget.conversationId));
      }
    }
  }

  Future<void> _confirmDecline(PriceOffer offer) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Decline this offer?'),
        content: Text(
          'They offered ${formatNaira(offer.amount)}. Countering keeps the '
          'conversation going instead.',
          style: const TextStyle(fontSize: 13.5, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Keep it open'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.destructive),
            child: const Text('Decline'),
          ),
        ],
      ),
    );

    if (confirmed == true) await _respondToOffer(offer, 'decline');
  }

  Future<void> _call({required bool whatsapp, required String? otherUserId}) async {
    if (otherUserId == null) {
      _showMessage('Still loading this conversation — try again in a moment.');
      return;
    }

    try {
      final phone = await ref.read(callingRepositoryProvider).getCounterpartPhone(otherUserId);
      final uri = whatsapp
          ? Uri.parse('https://wa.me/${toWhatsAppNumber(phone)}')
          : Uri.parse('tel:${toDialNumber(phone)}');

      // No canLaunchUrl() gate: it needs the platform query declarations
      // (android/app/src/main/AndroidManifest.xml <queries>,
      // ios/Runner/Info.plist LSApplicationQueriesSchemes) and returning
      // false there used to make this button silently do nothing. Attempt
      // the launch and report it if it actually fails.
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        _showMessage(whatsapp ? "Couldn't open WhatsApp." : "Couldn't open the dialer.");
      }
    } on NoSharedRelationshipException {
      _showMessage("You'll need to be in a conversation with them first.");
    } catch (_) {
      _showMessage('Could not get contact details. Please try again.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final messagesAsync = ref.watch(conversationMessagesProvider(widget.conversationId));
    final myId = supabase.auth.currentUser?.id;

    // Opened from a push-notification tap there is no `extra`, so fall back
    // to loading the conversation — otherwise the title and the call
    // buttons have nothing to work with.
    final summary = widget.summary ??
        (ref.watch(conversationSummaryProvider(widget.conversationId)).value);

    // Offer rows are read separately from the messages stream: one offer spans
    // several messages, and the card renders from the offer's live status rather
    // than from whatever was true when the bubble was posted.
    final offers = ref.watch(conversationOffersProvider(widget.conversationId)).value ?? const [];
    final offersById = {for (final offer in offers) offer.id: offer};

    // The buyer's agreed price, if one is standing. A buyer arriving from the
    // "offer accepted" push lands here, so paying has to be reachable without
    // going back to the listing.
    // fetchForConversation returns both sides' offers, so this is still scoped
    // to the signed-in buyer before asking for the redeemable one.
    final agreedOffer =
        offers.where((offer) => offer.buyerId == myId).toList().redeemable;

    return Scaffold(
      appBar: AppBar(
        title: Text(summary?.otherUserName ?? 'Conversation'),
        actions: [
          IconButton(
            icon: const Icon(Icons.call_outlined),
            tooltip: 'Call',
            onPressed: () => _call(whatsapp: false, otherUserId: summary?.otherUserId),
          ),
          IconButton(
            icon: const Icon(Icons.chat_outlined),
            tooltip: 'WhatsApp',
            onPressed: () => _call(whatsapp: true, otherUserId: summary?.otherUserId),
          ),
          // Report and block have to be reachable from the conversation
          // itself — App Store Review Guideline 1.2. Blocking hides this
          // thread, so it pops back to the inbox rather than leaving the user
          // on a screen that can no longer load.
          if (summary != null)
            SafetyMenuButton(
              otherUserId: summary.otherUserId,
              otherUserName: summary.otherUserName,
              onBlocked: () {
                // RLS stops serving this conversation the moment the block
                // lands, but the inbox is holding a cached list that still
                // has it.
                ref.invalidate(conversationsProvider);
                if (context.canPop()) {
                  context.pop();
                } else {
                  context.go('/messages');
                }
              },
            ),
        ],
      ),
      body: Column(
        children: [
          if (summary?.productId != null)
            _ProductContextBar(
              summary: summary!,
              buying: _buying,
              onBuy: () => _buyNow(summary),
            ),
          Expanded(
            child: messagesAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) =>
                  const Center(child: Text("Couldn't load messages", style: TextStyle(color: AppColors.inkMute))),
              data: (messages) {
                _maybeAutoScroll(messages.length);

                // Fire-and-forget: a failed receipt is not worth an error
                // state in front of the conversation.
                if (messages.any((m) => m.senderId != myId && !m.isRead)) {
                  ref.read(chatRepositoryProvider).markConversationRead(widget.conversationId).ignore();
                }

                // Every offer event posts a message, so the arrival of one whose
                // offer we have not loaded is the cue to refetch — that makes
                // the messages stream the only subscription this screen needs.
                _syncOffersWith(messages);

                // Only the newest proposal can still be acted on, so the id is
                // resolved once rather than per bubble.
                final latestProposalId = messages.reversed
                    .where((m) =>
                        m.offerId != null &&
                        (m.offerEvent == OfferEvent.offered || m.offerEvent == OfferEvent.countered))
                    .firstOrNull
                    ?.offerId;

                return ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final message = messages[index];
                    final previous = index > 0 ? messages[index - 1] : null;
                    final offer = message.offerId != null ? offersById[message.offerId] : null;

                    // Falls through to the text bubble until the offer row
                    // loads; `content` already reads "Offered ₦18,000", which is
                    // also what an older build shows.
                    if (offer != null && message.offerEvent != null && !message.isRemoved) {
                      return OfferBubble(
                        offer: offer,
                        event: message.offerEvent!,
                        isMine: message.senderId == myId,
                        currentUserId: myId ?? '',
                        listPrice: summary?.productPrice ?? 0,
                        isLatest: message.offerId == latestProposalId,
                        busy: _offerBusy,
                        onAccept: () => _respondToOffer(offer, 'accept'),
                        onDecline: () => _confirmDecline(offer),
                        onCounter: summary == null
                            ? () {}
                            : () => _openOfferSheet(summary, counterTo: offer),
                        onWithdraw: () => _respondToOffer(offer, 'withdraw'),
                      );
                    }

                    return _MessageBubble(
                      message: message,
                      isMine: message.senderId == myId,
                      onReport: () => _reportMessage(message),
                      // One timestamp per burst rather than one per bubble.
                      showTimestamp: previous == null ||
                          previous.senderId != message.senderId ||
                          message.createdAt.difference(previous.createdAt).inMinutes >= 5,
                    );
                  },
                );
              },
            ),
          ),
          // An agreed price is only worth anything if it gets paid, so it sits
          // above the composer until it is spent or lapses.
          if (agreedOffer != null && summary != null)
            Container(
              padding: const EdgeInsets.fromLTRB(14, 10, 12, 10),
              decoration: const BoxDecoration(
                color: AppColors.primaryTint,
                border: Border(top: BorderSide(color: AppColors.line)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Agreed at ${formatNaira(agreedOffer.amount)} — pay through escrow to lock it in.',
                      style: const TextStyle(fontSize: 12.5, color: AppColors.primaryInk, height: 1.3),
                    ),
                  ),
                  const SizedBox(width: 10),
                  FilledButton.icon(
                    onPressed: _buying ? null : () => _buyNow(summary, agreedOffer: agreedOffer),
                    icon: const Icon(Icons.lock_outline, size: 14),
                    label: Text(_buying ? '…' : 'Pay ${formatNaira(agreedOffer.amount)}'),
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      visualDensity: VisualDensity.compact,
                    ),
                  ),
                ],
              ),
            ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(6, 8, 12, 8),
              child: Row(
                children: [
                  IconButton(
                    onPressed: _sending ? null : _sendImage,
                    icon: const Icon(Icons.add_photo_alternate_outlined),
                    tooltip: 'Send a photo',
                    color: AppColors.inkSoft,
                  ),
                  // Only the buyer opens a negotiation; the seller answers one
                  // from the offer card itself.
                  if (summary != null && summary.canOffer && agreedOffer == null)
                    IconButton(
                      onPressed: _sending ? null : () => _openOfferSheet(summary),
                      icon: const Icon(Icons.sell_outlined),
                      tooltip: 'Make an offer',
                      color: AppColors.inkSoft,
                    ),
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      decoration: const InputDecoration(hintText: 'Message'),
                      minLines: 1,
                      maxLines: 4,
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _sending ? null : _send,
                    icon: const Icon(Icons.arrow_upward),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Which listing this conversation is about, pinned above the thread — chat
/// about a marketplace item is useless without the item in view.
class _ProductContextBar extends StatelessWidget {
  const _ProductContextBar({required this.summary, required this.buying, required this.onBuy});

  final ConversationSummary summary;
  final bool buying;
  final VoidCallback onBuy;

  @override
  Widget build(BuildContext context) {
    final isSold = summary.productStatus != null && summary.productStatus != 'active';

    return Material(
      color: Colors.white,
      child: InkWell(
        onTap: () => context.push('/product/${summary.productId}'),
        child: Container(
          decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: AppColors.line)),
          ),
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(
                  width: 44,
                  height: 44,
                  child: summary.productImage != null
                      ? CachedNetworkImage(imageUrl: summary.productImage!, fit: BoxFit.cover)
                      : const ColoredBox(color: AppColors.backgroundSunken),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      summary.productTitle ?? 'Deleted listing',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        if (summary.productPrice != null)
                          Text(
                            '₦${summary.productPrice!.toStringAsFixed(0)}',
                            style: const TextStyle(
                              fontFamily: 'GeistMono',
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        if (isSold) ...[
                          const SizedBox(width: 8),
                          const Text(
                            'No longer available',
                            style: TextStyle(fontSize: 12, color: AppColors.inkMute),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              if (summary.canBuy) ...[
                const SizedBox(width: 10),
                FilledButton(
                  onPressed: buying ? null : onBuy,
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    visualDensity: VisualDensity.compact,
                  ),
                  child: Text(buying ? '…' : 'Buy'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    required this.message,
    required this.isMine,
    required this.showTimestamp,
    this.onReport,
  });

  final ChatMessage message;
  final bool isMine;
  final bool showTimestamp;
  final VoidCallback? onReport;

  /// Long-press is the platform-conventional affordance for per-message
  /// actions, and it is the only way to report an individual message. Your
  /// own messages and ones a moderator has already removed have nothing to
  /// report.
  bool get _canReport => !isMine && !message.isRemoved && onReport != null;

  @override
  Widget build(BuildContext context) {
    final maxWidth = MediaQuery.of(context).size.width * 0.75;

    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: Column(
          crossAxisAlignment: isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            GestureDetector(
              onLongPress: _canReport ? () => _showMessageActions(context) : null,
              child: Container(
              padding: message.imageUrl != null
                  ? const EdgeInsets.all(4)
                  : const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: message.isRemoved
                    ? AppColors.backgroundSunken
                    : (isMine ? AppColors.primary : Colors.white),
                border: message.isRemoved
                    ? Border.all(color: AppColors.line)
                    : (isMine ? null : Border.all(color: AppColors.line)),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (message.imageUrl != null)
                    GestureDetector(
                      onTap: () => FullScreenImageViewer.show(context, images: [message.imageUrl!]),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: CachedNetworkImage(
                          imageUrl: message.imageUrl!,
                          width: maxWidth,
                          fit: BoxFit.cover,
                          placeholder: (_, _) => Container(
                            width: maxWidth,
                            height: 160,
                            color: AppColors.backgroundSunken,
                          ),
                          errorWidget: (_, _, _) => Container(
                            width: maxWidth,
                            height: 160,
                            color: AppColors.backgroundSunken,
                            child: const Icon(Icons.broken_image_outlined, color: AppColors.inkMute),
                          ),
                        ),
                      ),
                    ),
                  if (message.hasText)
                    Padding(
                      padding: message.imageUrl != null
                          ? const EdgeInsets.fromLTRB(10, 8, 10, 6)
                          : EdgeInsets.zero,
                      child: Text(
                        message.content!,
                        style: TextStyle(
                          color: message.isRemoved
                              ? AppColors.inkMute
                              : (isMine ? AppColors.primaryForeground : AppColors.ink),
                          fontStyle: message.isRemoved ? FontStyle.italic : FontStyle.normal,
                        ),
                      ),
                    ),
                ],
              ),
              ),
            ),
            if (showTimestamp || isMine)
              Padding(
                padding: const EdgeInsets.only(top: 3, left: 4, right: 4),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (showTimestamp)
                      Text(
                        timeago.format(message.createdAt, locale: 'en_short'),
                        style: const TextStyle(fontSize: 11, color: AppColors.inkMute),
                      ),
                    if (isMine) ...[
                      const SizedBox(width: 4),
                      Icon(
                        message.isRead ? Icons.done_all : Icons.done,
                        size: 13,
                        color: message.isRead ? AppColors.primary : AppColors.inkMute,
                      ),
                    ],
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

extension on _MessageBubble {
  void _showMessageActions(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.background,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.flag_outlined, color: AppColors.destructive),
              title: const Text('Report this message',
                  style: TextStyle(color: AppColors.destructive, fontWeight: FontWeight.w600)),
              onTap: () {
                Navigator.of(sheetContext).pop();
                onReport?.call();
              },
            ),
            ListTile(
              leading: const Icon(Icons.close, color: AppColors.inkSoft),
              title: const Text('Cancel'),
              onTap: () => Navigator.of(sheetContext).pop(),
            ),
          ],
        ),
      ),
    );
  }
}
