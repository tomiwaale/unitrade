import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

class _StatusStyle {
  const _StatusStyle(this.label, this.color, this.bg);
  final String label;
  final Color color;
  final Color bg;
}

const _statusStyles = <String, _StatusStyle>{
  'pending': _StatusStyle('Pending payment', AppColors.inkSoft, AppColors.backgroundSunken),
  'paid': _StatusStyle('Awaiting delivery', Color(0xFF7A5C00), Color(0xFFFFF7CC)),
  'confirmed': _StatusStyle('Received', AppColors.primaryInk, AppColors.primaryTint),
  'disputed': _StatusStyle('Disputed', Color(0xFF8B0000), Color(0xFFFDEAEA)),
};

/// Mirrors STATUS_CONFIG in app/orders/page.tsx.
class OrderStatusBadge extends StatelessWidget {
  const OrderStatusBadge({super.key, required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final style = _statusStyles[status] ?? _statusStyles['pending']!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: style.bg, borderRadius: BorderRadius.circular(999)),
      child: Text(
        style.label,
        style: TextStyle(
          fontFamily: 'GeistMono',
          fontSize: 10.5,
          fontWeight: FontWeight.w600,
          color: style.color,
        ),
      ),
    );
  }
}
