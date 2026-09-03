/// Mirrors lib/validations/auth.ts on the web so both platforms reject the
/// same inputs before hitting the network.
class AuthValidators {
  AuthValidators._();

  static final _emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
  static final _phoneRegex = RegExp(r'^(\+234|0)[789]\d{9}$');

  static String? email(String? value) {
    final v = value?.trim() ?? '';
    if (v.isEmpty) return 'Email is required';
    if (!_emailRegex.hasMatch(v)) return 'Invalid email address';
    return null;
  }

  static String? password(String? value) {
    final v = value ?? '';
    if (v.length < 6) return 'Password must be at least 6 characters';
    return null;
  }

  static String? fullName(String? value) {
    final v = value?.trim() ?? '';
    if (v.length < 2) return 'Full name is required';
    return null;
  }

  static String? university(String? value) {
    final v = value?.trim() ?? '';
    if (v.length < 2) return 'University name is required';
    return null;
  }

  static String? phone(String? value) {
    final v = value?.trim() ?? '';
    if (!_phoneRegex.hasMatch(v)) {
      return 'Enter a valid Nigerian mobile number (e.g. 08012345678)';
    }
    return null;
  }
}
