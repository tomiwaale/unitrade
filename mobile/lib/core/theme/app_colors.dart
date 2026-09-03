import 'package:flutter/material.dart';

/// Design tokens ported from the web app's "Campus Green" theme
/// (app/globals.css and unitrade/project/app.jsx THEMES.campus).
/// Keep these in sync if the web palette changes.
class AppColors {
  AppColors._();

  static const primary = Color(0xFF0F8A4F);
  static const primaryInk = Color(0xFF073B22);
  static const primaryTint = Color(0xFFE6F4ED);
  static const primaryForeground = Color(0xFFFFFFFF);

  static const accent = Color(0xFFFF5A1F);

  static const background = Color(0xFFF7F4EE);
  static const backgroundSunken = Color(0xFFEFEBE3);

  static const line = Color(0xFFE4DFD3);
  static const lineSoft = Color(0xFFEDE9DF);

  static const ink = Color(0xFF14130F);
  static const inkSoft = Color(0xFF4A4940);
  static const inkMute = Color(0xFF8A877B);

  static const destructive = Color(0xFFDC2626);
}
