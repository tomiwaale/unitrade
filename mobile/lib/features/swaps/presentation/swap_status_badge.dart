import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

class _StatusStyle {
  const _StatusStyle(this.label, this.color, this.bg);
  final String label;
  final Color color;
  final Color bg;
}

const _statusStyles = <String, _StatusStyle>{
  'pending': _StatusStyle('Pending', Color(0xFF7A5C00), Color(0xFFFFF7CC)),
  'accepted': _StatusStyle('Accepted', AppColors.primaryInk, AppColors.primaryTint),
  'declined': _StatusStyle('Declined', Color(0xFF9B1C1C), Color(0xFFFDEAEA)),
  'cancelled': _StatusStyle('Cancelled', AppColors.inkMute, AppColors.backgroundSunken),
};

/// Mirrors STATUS_CONFIG in app/swaps/page.tsx.
class SwapStatusBadge extends StatelessWidget {
  const SwapStatusBadge({super.key, required this.status});

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
