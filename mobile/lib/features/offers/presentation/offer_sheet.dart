import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../application/offer_providers.dart';
import '../../../core/utils/naira.dart';
import '../data/offer_models.dart';
import '../data/offer_repository.dart';

/// Bottom sheet for naming a price. Shared by the product screen's "Make an
/// offer", the chat composer's tag button and the seller's "Counter" action —
/// the same form with different copy, so the quick-pick maths and the
/// validation live in one place. Mirrors
/// components/offers/offer-composer.tsx on the web.
///
/// Resolves to the placed offer, or null if the sheet was dismissed.
Future<PriceOffer?> showOfferSheet(
  BuildContext context, {
  required String productId,
  required String productTitle,
  required double listPrice,
  PriceOffer? counterTo,
}) {
  return showModalBottomSheet<PriceOffer>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.background,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => _OfferSheet(
      productId: productId,
      productTitle: productTitle,
      listPrice: listPrice,
      counterTo: counterTo,
    ),
  );
}

class _OfferSheet extends ConsumerStatefulWidget {
  const _OfferSheet({
    required this.productId,
    required this.productTitle,
    required this.listPrice,
    this.counterTo,
  });

  final String productId;
  final String productTitle;
  final double listPrice;
  final PriceOffer? counterTo;

  @override
  ConsumerState<_OfferSheet> createState() => _OfferSheetState();
}

class _OfferSheetState extends ConsumerState<_OfferSheet> {
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();
  bool _sending = false;
  String? _error;

  bool get _isCounter => widget.counterTo != null;

  @override
  void dispose() {
    _amountController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  double? get _amount {
    final parsed = double.tryParse(_amountController.text.trim());
    return (parsed != null && parsed > 0) ? parsed : null;
  }

  /// Meeting in the middle is the commonest counter, so it is a chip rather
  /// than mental arithmetic.
  List<({String label, double value})> get _chips {
    if (_isCounter) {
      return [
        (
          label: 'Split the difference',
          value: ((widget.counterTo!.amount + widget.listPrice) / 2).roundToDouble(),
        ),
        (label: 'Hold at asking', value: widget.listPrice),
      ];
    }
    return [0.9, 0.8, 0.7].map((factor) {
      final value = ((widget.listPrice * factor) / 50).round() * 50.0;
      return (label: '${((1 - factor) * 100).round()}% off', value: value);
    }).toList();
  }

  Future<void> _submit() async {
    final amount = _amount;
    if (amount == null || _sending) return;

    setState(() {
      _sending = true;
      _error = null;
    });

    try {
      final offer = await ref.read(offerRepositoryProvider).place(
            productId: widget.productId,
            amount: amount,
            note: _noteController.text,
            countersId: widget.counterTo?.id,
          );
      if (mounted) Navigator.of(context).pop(offer);
    } on OfferException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not send that offer. Please try again.');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final amount = _amount;
    final discount = (amount != null && widget.listPrice > 0)
        ? ((1 - amount / widget.listPrice) * 100).round()
        : 0;

    return Padding(
      // Lifts the sheet clear of the keyboard, which otherwise covers the
      // submit button on shorter devices.
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 22),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _isCounter ? 'Counter their offer' : 'Make an offer',
                          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          _isCounter
                              ? 'They offered ${formatNaira(widget.counterTo!.amount)} · asking ${formatNaira(widget.listPrice)}'
                              : '${widget.productTitle} · asking ${formatNaira(widget.listPrice)}',
                          style: const TextStyle(fontSize: 12.5, color: AppColors.inkMute),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: AppColors.inkMute),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              const Text(
                'YOUR PRICE',
                style: TextStyle(
                  fontFamily: 'GeistMono', fontSize: 10.5, letterSpacing: 1.2,
                  color: AppColors.inkMute, fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 7),
              TextField(
                controller: _amountController,
                autofocus: true,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
                onChanged: (_) => setState(() {}),
                onSubmitted: (_) => _submit(),
                style: const TextStyle(
                  fontFamily: 'GeistMono', fontSize: 20, fontWeight: FontWeight.w600,
                ),
                decoration: const InputDecoration(
                  prefixText: '₦ ',
                  prefixStyle: TextStyle(
                    fontFamily: 'GeistMono', fontSize: 20, color: AppColors.inkMute,
                  ),
                  hintText: '0',
                ),
              ),
              if (amount != null && discount != 0)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    discount > 0
                        ? '$discount% below the asking price'
                        : '${discount.abs()}% above the asking price',
                    style: const TextStyle(fontSize: 11.5, color: AppColors.inkMute),
                  ),
                ),
              const SizedBox(height: 12),

              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: _chips
                    .map((chip) => ActionChip(
                          label: Text(
                            '${chip.label} · ${formatNaira(chip.value)}',
                            style: const TextStyle(fontSize: 12),
                          ),
                          backgroundColor: Colors.white,
                          side: const BorderSide(color: AppColors.line),
                          onPressed: () {
                            _amountController.text = chip.value == chip.value.roundToDouble()
                                ? chip.value.round().toString()
                                : chip.value.toStringAsFixed(2);
                            setState(() {});
                          },
                        ))
                    .toList(),
              ),
              const SizedBox(height: 16),

              const Text(
                'ADD A NOTE (OPTIONAL)',
                style: TextStyle(
                  fontFamily: 'GeistMono', fontSize: 10.5, letterSpacing: 1.2,
                  color: AppColors.inkMute, fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 7),
              TextField(
                controller: _noteController,
                minLines: 2,
                maxLines: 4,
                maxLength: 500,
                decoration: InputDecoration(
                  hintText: _isCounter
                      ? "Best I can do — it's barely used."
                      : 'I can pick up on campus today.',
                  counterText: '',
                ),
              ),

              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(
                  _error!,
                  style: const TextStyle(fontSize: 12.5, color: AppColors.destructive),
                ),
              ],

              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: (amount == null || _sending) ? null : _submit,
                  icon: _sending
                      ? const SizedBox(
                          width: 14, height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Icon(_isCounter ? Icons.swap_horiz : Icons.sell_outlined, size: 17),
                  label: Text(_sending
                      ? 'Sending…'
                      : _isCounter
                          ? 'Send counter-offer'
                          : 'Send offer'),
                  style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                _isCounter
                    ? 'They have 48 hours to accept before this lapses.'
                    : 'The seller has 48 hours to reply. Pay through escrow once they accept.',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 11.5, color: AppColors.inkMute),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
