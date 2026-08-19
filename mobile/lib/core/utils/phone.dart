/// Normalizes a Nigerian mobile number (as stored per lib/validations/auth.ts
/// on the web — "0801234567" or "+234801234567") into the digits-only
/// international format wa.me requires ("234801234567").
String toWhatsAppNumber(String phone) {
  var digits = phone.replaceAll(RegExp(r'[^0-9]'), '');
  if (digits.startsWith('0')) {
    digits = '234${digits.substring(1)}';
  } else if (!digits.startsWith('234')) {
    digits = '234$digits';
  }
  return digits;
}

/// Strips the separators a stored number may carry ("+234 801 234 5678")
/// so it can go straight into a `tel:` URI — a space would be percent-encoded
/// and some dialers refuse the result.
String toDialNumber(String phone) {
  return phone.replaceAll(RegExp(r'[^0-9+]'), '');
}
