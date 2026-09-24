import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../data/price_stat.dart';

/// The value signal on a listing card. Deliberately small and deliberately
/// only ever positive — see PriceStats.tierFor for why nothing here calls a
/// listing overpriced.
///
/// Sized to sit over the card image, where it competes with a photograph rather
/// than with the app's own background, so both tiers are solid fills with a
/// shadow instead of the tinted pills used elsewhere.
class DealBadgeChip extends StatelessWidget {
  const DealBadgeChip({super.key, required this.tier, this.compact = false});

  final DealTier tier;

  /// Feed cards are roughly half a phone wide and their titles matter more than
  /// this does, so there the chip drops to the icon and a shorter label.
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final isGreat = tier == DealTier.greatDeal;

    return Container(
      padding: EdgeInsets.symmetric(horizontal: compact ? 5 : 8, vertical: compact ? 2.5 : 4),
      decoration: BoxDecoration(
        color: isGreat ? AppColors.primary : Colors.white,
        borderRadius: BorderRadius.circular(999),
        boxShadow: const [
          BoxShadow(color: Color(0x1F000000), blurRadius: 4, offset: Offset(0, 1)),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isGreat ? Icons.local_fire_department : Icons.verified_outlined,
            size: compact ? 10 : 12,
            color: isGreat ? AppColors.primaryForeground : AppColors.primary,
          ),
          SizedBox(width: compact ? 2.5 : 4),
          Text(
            tier.label,
            style: TextStyle(
              fontSize: compact ? 9.5 : 11,
              height: 1.1,
              fontWeight: FontWeight.w600,
              color: isGreat ? AppColors.primaryForeground : AppColors.ink,
            ),
          ),
        ],
      ),
    );
  }
}
