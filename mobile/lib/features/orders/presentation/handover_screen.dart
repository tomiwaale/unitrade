import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../core/theme/app_colors.dart';

/// Deterministic 6-digit code derived from the orderId and the current day
/// (UTC), so both devices compute the same value with no server round-trip
/// and yesterday's screenshot is worthless.
///
/// This is a handover *ritual*, not an authentication secret: the seed is the
/// order id, which both parties already hold, so either side could in
/// principle compute the code without meeting. What it buys is that releasing
/// escrow is now a deliberate two-person act at the point of handover instead
/// of a single button the buyer can fat-finger from their sofa. Making it
/// unforgeable needs a server-issued nonce on the order row — see the note in
/// [HandoverScreen].
String generateHandoverOtp(String orderId) {
  final today = DateTime.now().toUtc();
  final day = today.day.toString().padLeft(2, '0');
  final month = today.month.toString().padLeft(2, '0');
  final seed = '${orderId}_${today.year}$month$day';
  // Mask every step: an unbounded fold overflows differently on 64-bit
  // native and on web's doubles, and the two devices must agree.
  final hash = seed.codeUnits.fold<int>(7, (acc, c) => (acc * 31 + c) & 0x7FFFFFFF);
  return (hash % 1000000).toString().padLeft(6, '0');
}

/// The handover payload embedded in the QR code.
String handoverQrPayload(String orderId, String otp) => 'kolejswap:handover:$orderId:$otp';

/// Full-screen code shown to the SELLER on a 'paid' order, for the buyer to
/// scan or type at the moment the item changes hands.
///
/// The direction matters: only the buyer can release escrow
/// (lib/orders.ts:confirmOrderReceived rejects everyone else), so the seller
/// is the one who proves they showed up, and the buyer's tap is what pays
/// them. Reversing it would need the server to accept a seller-initiated
/// release, which is the money path and not worth widening for this.
class HandoverScreen extends StatefulWidget {
  const HandoverScreen({super.key, required this.orderId, required this.productTitle});

  final String orderId;
  final String? productTitle;

  @override
  State<HandoverScreen> createState() => _HandoverScreenState();
}

class _HandoverScreenState extends State<HandoverScreen> with TickerProviderStateMixin {
  late final AnimationController _pulseController;
  late final Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(vsync: this, duration: const Duration(seconds: 2))
      ..repeat(reverse: true);
    _pulseAnimation = Tween<double>(
      begin: 0.96,
      end: 1.0,
    ).animate(CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final otp = generateHandoverOtp(widget.orderId);
    final qrPayload = handoverQrPayload(widget.orderId, otp);
    final otpFormatted = '${otp.substring(0, 3)} ${otp.substring(3)}';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Show Handover Code'), backgroundColor: AppColors.background),
      // Scrollable, not a bare Column: the QR alone is 220px before the code
      // and the copy below it, which overflows a short phone in landscape or
      // at a large text scale.
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Header info strip
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.primaryTint,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.shield_outlined, color: AppColors.primaryInk, size: 18),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          widget.productTitle != null
                              ? 'Handover code for: ${widget.productTitle}'
                              : 'Handover code',
                          style: const TextStyle(
                            color: AppColors.primaryInk,
                            fontWeight: FontWeight.w600,
                            fontSize: 13.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),

                // Animated QR Code
                ScaleTransition(
                  scale: _pulseAnimation,
                  child: Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.08),
                          blurRadius: 24,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: QrImageView(
                      data: qrPayload,
                      version: QrVersions.auto,
                      size: 220,
                      eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: AppColors.ink),
                      dataModuleStyle: const QrDataModuleStyle(
                        dataModuleShape: QrDataModuleShape.square,
                        color: AppColors.ink,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 28),

                // OR divider
                Row(
                  children: [
                    const Expanded(child: Divider()),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Text('or share OTP', style: TextStyle(color: AppColors.inkMute, fontSize: 13)),
                    ),
                    const Expanded(child: Divider()),
                  ],
                ),

                const SizedBox(height: 20),

                // Large copyable OTP
                GestureDetector(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: otp));
                    ScaffoldMessenger.of(
                      context,
                    ).showSnackBar(const SnackBar(content: Text('OTP copied to clipboard')));
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 18),
                    decoration: BoxDecoration(
                      color: AppColors.backgroundSunken,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.line),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          otpFormatted,
                          style: const TextStyle(
                            fontFamily: 'GeistMono',
                            fontSize: 38,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 4,
                            color: AppColors.ink,
                          ),
                        ),
                        const SizedBox(width: 14),
                        const Icon(Icons.copy_outlined, size: 20, color: AppColors.inkSoft),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 20),

                Text(
                  'Show this screen to the buyer when you hand over the item.\nThey enter this code to release your payment.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13.5, color: AppColors.inkMute, height: 1.5),
                ),

                const SizedBox(height: 32),

                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.schedule, size: 14, color: AppColors.inkMute),
                    const SizedBox(width: 6),
                    const Text(
                      'Code refreshes at midnight UTC',
                      style: TextStyle(fontSize: 12, color: AppColors.inkMute),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
