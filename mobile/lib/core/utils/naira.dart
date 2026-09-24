/// Naira formatting, matching format_naira() in 033_price_offers.sql and
/// formatNaira() in lib/offers.ts: grouped thousands, and kobo only when there
/// are any. Campus prices are whole naira, so `₦18,000` is the normal case.
///
/// The rest of the app writes `'₦${price.toStringAsFixed(0)}'` inline, which
/// loses the separators. That is tolerable on a listing card where the number
/// is small print; it is not on an offer, where the amount *is* the message and
/// misreading ₦18000 as ₦1,800 changes what someone agrees to.
String formatNaira(num amount) {
  final value = (amount * 100).round() / 100;
  final isNegative = value < 0;
  final absolute = value.abs();

  final whole = absolute.floor();
  // `value` is already rounded to two places, so this can never reach 100.
  final kobo = ((absolute - whole) * 100).round();

  final digits = whole.toString();
  final grouped = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) grouped.write(',');
    grouped.write(digits[i]);
  }

  final koboSuffix = kobo == 0 ? '' : '.${kobo.toString().padLeft(2, '0')}';
  return '${isNegative ? '-' : ''}₦$grouped$koboSuffix';
}
