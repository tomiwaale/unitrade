import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/naira.dart';
import '../data/offer_models.dart';

/// An offer in the chat thread. A card rather than a text bubble: the amount is
/// the point, and it needs room for the accept / counter buttons. Mirrors
/// components/offers/offer-card.tsx on the web.
class OfferBubble extends StatelessWidget {
  const OfferBubble({
    super.key,
    required this.offer,
    required this.event,
    required this.isMine,
    required this.currentUserId,
    required this.listPrice,
    required this.isLatest,
    required this.busy,
    required this.onAccept,
    required this.onDecline,
    required this.onCounter,
    required this.onWithdraw,
  });

  final PriceOffer offer;

  /// Which event this bubble announced. One offer produces several bubbles
  /// (offered → accepted), so the headline comes from the event while the amount
  /// and the available actions come from the live offer row.
  final OfferEvent event;
  final bool isMine;
  final String currentUserId;
  final double listPrice;

  /// Only the newest proposal in a thread can still be acted on, so an older
  /// bubble keeps its history but loses its buttons.
  final bool isLatest;
  final bool busy;
  final VoidCallback onAccept;
  final VoidCallback onDecline;
  final VoidCallback onCounter;
  final VoidCallback onWithdraw;

  /// The response bubbles ('accepted' and friends) are a record of what
  /// happened and never carry actions; only the bubble that opened a live offer
  /// does.
  bool get _isProposal => event == OfferEvent.offered || event == OfferEvent.countered;
  bool get _canRespond => _isProposal && isLatest && offer.canRespondBy(currentUserId);
  bool get _canWithdraw => _isProposal && isLatest && offer.canWithdrawBy(currentUserId);

  bool get _isDead =>
      const {'declined', 'withdrawn', 'expired', 'countered'}.contains(offer.status);

  (String, IconData) get _kicker => switch (event) {
        OfferEvent.offered => ('Offer', Icons.sell_outlined),
        OfferEvent.countered => ('Counter-offer', Icons.swap_horiz),
        OfferEvent.accepted => ('Deal agreed', Icons.check_circle_outline),
        OfferEvent.declined => ('Declined', Icons.cancel_outlined),
        OfferEvent.withdrawn => ('Withdrawn', Icons.block_outlined),
      };

  @override
  Widget build(BuildContext context) {
    final isActionable = _canRespond || _canWithdraw;
    final (kickerLabel, kickerIcon) = _kicker;

    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.82,
          minWidth: 208,
        ),
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 13),
        decoration: BoxDecoration(
          // The live one is the only card with anything to do, so it is the only
          // one that draws attention.
          color: isActionable ? AppColors.primaryTint : Colors.white,
          border: Border.all(
            color: isActionable ? AppColors.primary : AppColors.line,
            width: 1.5,
          ),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(kickerIcon, size: 11, color: AppColors.inkMute),
                const SizedBox(width: 5),
                Text(
                  kickerLabel.toUpperCase(),
                  style: const TextStyle(
                    fontFamily: 'GeistMono', fontSize: 10, letterSpacing: 1.1,
                    color: AppColors.inkMute, fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              formatNaira(offer.amount),
              style: TextStyle(
                fontFamily: 'GeistMono', fontSize: 21, fontWeight: FontWeight.w600,
                color: _isDead ? AppColors.inkMute : AppColors.ink,
                decoration: _isDead ? TextDecoration.lineThrough : null,
              ),
            ),
            if (listPrice > offer.amount)
              Text(
                'was ${formatNaira(listPrice)}',
                style: const TextStyle(
                  fontFamily: 'GeistMono', fontSize: 11.5, color: AppColors.inkMute,
                ),
              ),
            if (_isProposal && (offer.note?.trim().isNotEmpty ?? false)) ...[
              const SizedBox(height: 5),
              Text(
                offer.note!.trim(),
                style: const TextStyle(fontSize: 13, height: 1.35, color: AppColors.inkSoft),
              ),
            ],
            const SizedBox(height: 6),
            Text(
              _metaLine,
              style: const TextStyle(fontSize: 11.5, color: AppColors.inkMute),
            ),
            if (_canRespond) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: FilledButton(
                      onPressed: busy ? null : onAccept,
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        visualDensity: VisualDensity.compact,
                      ),
                      child: const Text('Accept', style: TextStyle(fontSize: 12.5)),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: busy ? null : onCounter,
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        visualDensity: VisualDensity.compact,
                      ),
                      child: const Text('Counter', style: TextStyle(fontSize: 12.5)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: busy ? null : onDecline,
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    visualDensity: VisualDensity.compact,
                    foregroundColor: AppColors.destructive,
                  ),
                  child: const Text('Decline', style: TextStyle(fontSize: 12.5)),
                ),
              ),
            ],
            if (_canWithdraw) ...[
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: busy ? null : onWithdraw,
                  icon: const Icon(Icons.block_outlined, size: 13),
                  label: const Text('Withdraw offer', style: TextStyle(fontSize: 12.5)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    visualDensity: VisualDensity.compact,
                    foregroundColor: AppColors.destructive,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  /// A live offer shows its clock; a settled one shows what became of it.
  String get _metaLine {
    if (offer.status == 'pending') return offer.expiryLabel;
    if (_isProposal) return offer.statusLabel;
    if (offer.status == 'accepted') {
      return offer.orderId != null ? 'Paid' : offer.expiryLabel;
    }
    return offer.statusLabel;
  }
}
