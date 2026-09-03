import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Small brand mark used on auth screens — a green rounded square with the
/// "K" initial, standing in for the full KolejSwap wordmark/logo asset.
class AppLogoMark extends StatelessWidget {
  const AppLogoMark({super.key, this.size = 56});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(size * 0.28),
      ),
      alignment: Alignment.center,
      child: Text(
        'K',
        style: TextStyle(
          color: AppColors.primaryForeground,
          fontFamily: 'Geist',
          fontWeight: FontWeight.w700,
          fontSize: size * 0.5,
        ),
      ),
    );
  }
}
