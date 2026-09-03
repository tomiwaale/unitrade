import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../application/order_providers.dart';
import 'handover_screen.dart';

/// Bottom sheet shown to the BUYER on a paid order. They read the 6-digit
/// code off the seller's [HandoverScreen] at the point of handover; entering
/// it correctly is what releases escrow.
///
/// The code is checked on-device against [generateHandoverOtp] — the server
/// still just sees a normal buyer confirm (lib/orders.ts). It's a deliberate
/// two-person ritual replacing a one-tap release, not a server-enforced gate;
/// see the note on [generateHandoverOtp].
Future<void> showHandoverConfirmSheet(
  BuildContext context, {
  required String orderId,
  required String? productTitle,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.background,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => _HandoverConfirmSheet(orderId: orderId, productTitle: productTitle),
  );
}

class _HandoverConfirmSheet extends ConsumerStatefulWidget {
  const _HandoverConfirmSheet({required this.orderId, required this.productTitle});

  final String orderId;
  final String? productTitle;

  @override
  ConsumerState<_HandoverConfirmSheet> createState() => _HandoverConfirmSheetState();
}

class _HandoverConfirmSheetState extends ConsumerState<_HandoverConfirmSheet> {
  final _otpController = TextEditingController();
  bool _submitting = false;
  String? _error;
  bool _success = false;

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _confirm() async {
    final otp = _otpController.text.trim();
    if (otp.length != 6) {
      setState(() => _error = 'Please enter the full 6-digit code');
      return;
    }

    if (otp != generateHandoverOtp(widget.orderId)) {
      setState(() => _error = "Incorrect code — ask the seller to show their screen again");
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      await ref.read(orderRepositoryProvider).confirmReceived(widget.orderId);
      ref.invalidate(orderDetailProvider(widget.orderId));
      ref.invalidate(purchasesProvider);
      if (!mounted) return;
      setState(() => _success = true);
      await Future.delayed(const Duration(milliseconds: 1600));
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(24, 16, 24, MediaQuery.of(context).viewInsets.bottom + 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.line,
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          const SizedBox(height: 20),
          if (_success) ...[
            const Icon(Icons.check_circle, color: AppColors.primary, size: 56),
            const SizedBox(height: 14),
            const Text('Handover confirmed!', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            const Text(
              'Payment has been released to the seller.',
              style: TextStyle(color: AppColors.inkMute),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
          ] else ...[
            const Align(
              alignment: Alignment.centerLeft,
              child: Text('Confirm handover', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            ),
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                widget.productTitle != null
                    ? "Enter the seller's 6-digit code to confirm you received: ${widget.productTitle}"
                    : "Enter the 6-digit code from the seller's screen",
                style: const TextStyle(color: AppColors.inkMute, fontSize: 13.5),
              ),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF3CD),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Row(
                children: [
                  Icon(Icons.warning_amber_outlined, size: 18, color: Color(0xFF856404)),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'This releases payment immediately and cannot be undone. '
                      'Only confirm once the item is in your hands and in good condition.',
                      style: TextStyle(fontSize: 13, color: Color(0xFF856404)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _otpController,
              autofocus: true,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              maxLength: 6,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              style: const TextStyle(
                fontFamily: 'GeistMono',
                fontSize: 28,
                fontWeight: FontWeight.w700,
                letterSpacing: 10,
              ),
              decoration: InputDecoration(
                hintText: '000000',
                counterText: '',
                errorText: _error,
              ),
              onChanged: (_) {
                if (_error != null) setState(() => _error = null);
              },
              onSubmitted: (_) => _submitting ? null : _confirm(),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _submitting ? null : _confirm,
                icon: _submitting
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.check_circle_outline),
                label: const Text('Confirm & release payment'),
              ),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
          ],
        ],
      ),
    );
  }
}
