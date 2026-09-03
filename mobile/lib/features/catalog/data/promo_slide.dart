import 'package:flutter/material.dart';

/// Mirrors the `promo_slides` table (supabase/migrations/020_promo_slides.sql),
/// admin-managed at /admin/promo-slides on the web app.
class PromoSlide {
  PromoSlide({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.colorStart,
    required this.colorEnd,
    this.imageUrl,
    this.route,
  });

  final String id;
  final String title;
  final String subtitle;
  final String icon;
  final Color colorStart;
  final Color colorEnd;
  final String? imageUrl;
  final String? route;

  factory PromoSlide.fromJson(Map<String, dynamic> json) {
    return PromoSlide(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      subtitle: json['subtitle'] as String? ?? '',
      icon: json['icon'] as String? ?? 'megaphone',
      colorStart:
          _parseHexColor(json['color_start'] as String?) ??
          const Color(0xFF0F8A4F),
      colorEnd:
          _parseHexColor(json['color_end'] as String?) ??
          const Color(0xFF073B22),
      imageUrl: json['image_url'] as String?,
      route: json['route'] as String?,
    );
  }
}

Color? _parseHexColor(String? hex) {
  if (hex == null) return null;
  final cleaned = hex.replaceFirst('#', '').trim();
  if (cleaned.length != 6) return null;
  final value = int.tryParse(cleaned, radix: 16);
  if (value == null) return null;
  return Color(0xFF000000 | value);
}

/// Fixed icon set shared with the admin UI — keys must match PROMO_ICONS
/// in app/admin/promo-slides/icons.tsx.
const Map<String, IconData> promoIconMap = {
  'shield': Icons.shield_outlined,
  'sell': Icons.add_circle_outline,
  'swap': Icons.swap_horiz,
  'tag': Icons.sell_outlined,
  'delivery': Icons.local_shipping_outlined,
  'school': Icons.school_outlined,
  'star': Icons.star_outline,
  'gift': Icons.card_giftcard_outlined,
  'megaphone': Icons.campaign_outlined,
  'wallet': Icons.account_balance_wallet_outlined,
};

IconData iconForPromoSlide(PromoSlide slide) =>
    promoIconMap[slide.icon] ?? Icons.campaign_outlined;
