import 'package:flutter/material.dart';

/// Small brand mark used on auth screens — the same artwork as the app icon
/// (`assets/icon/Asset 6.svg`, rendered to `assets/icon/logo-mark.png`).
class AppLogoMark extends StatelessWidget {
  const AppLogoMark({super.key, this.size = 56});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      'assets/icon/logo-mark.png',
      width: size,
      height: size,
      filterQuality: FilterQuality.medium,
      semanticLabel: 'KolejSwap',
    );
  }
}
