import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/api/mobile_api_client.dart';
import '../../../core/supabase/supabase_client.dart';

/// Mirrors the profile block on app/profile/page.tsx. Everything here is
/// direct-to-Supabase: profiles is world-readable and self-writable
/// (supabase/schema.sql), and the counts are plain RLS-scoped selects.
class UserProfile {
  UserProfile({
    required this.id,
    required this.fullName,
    required this.university,
    this.phone,
    this.avatarUrl,
    this.ninVerified = false,
    this.schoolIdStatus = 'none',
  });

  final String id;
  final String fullName;
  final String university;
  final String? phone;
  final String? avatarUrl;
  final bool ninVerified;

  /// none | pending | approved | rejected (015_launch_hardening.sql).
  final String schoolIdStatus;

  /// The badge the profile header shows. NIN is the stronger signal, so it
  /// wins when both are present.
  bool get isVerified => ninVerified || schoolIdStatus == 'approved';

  factory UserProfile.fromJson(Map<String, dynamic> row) => UserProfile(
        id: row['id'] as String,
        fullName: (row['full_name'] as String?) ?? 'Student',
        university: (row['university'] as String?) ?? '',
        phone: row['phone'] as String?,
        avatarUrl: row['avatar_url'] as String?,
        ninVerified: row['nin_verified'] as bool? ?? false,
        schoolIdStatus: (row['school_id_status'] as String?) ?? 'none',
      );
}

class ProfileStats {
  const ProfileStats({
    required this.activeListings,
    required this.itemsSold,
    required this.swaps,
  });

  final int activeListings;
  final int itemsSold;
  final int swaps;

  static const empty = ProfileStats(activeListings: 0, itemsSold: 0, swaps: 0);
}

class ProfileRepository {
  final _api = MobileApiClient();

  String get _myId => supabase.auth.currentUser!.id;

  Future<UserProfile> fetchProfile(String userId) async {
    final row = await supabase
        .from('profiles')
        .select('id, full_name, university, phone, avatar_url, nin_verified, school_id_status')
        .eq('id', userId)
        .single();
    return UserProfile.fromJson(row);
  }

  /// Sold means escrow actually completed (status 'confirmed'), not merely
  /// paid — a paid order can still end up disputed and refunded.
  Future<ProfileStats> fetchProfileStats(String userId) async {
    final activeListings = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', userId)
        .eq('status', 'active')
        .count();

    final swaps = await supabase
        .from('swap_offers')
        .select('id')
        .or('buyer_id.eq.$userId,seller_id.eq.$userId')
        .eq('status', 'accepted')
        .count();

    // orders has no seller_id column — it hangs off the product
    // (supabase/schema.sql), so the sold count needs the product ids first.
    final myProducts = await supabase.from('products').select('id').eq('seller_id', userId);
    final myProductIds = (myProducts as List).map((p) => p['id'] as String).toList();

    var itemsSold = 0;
    if (myProductIds.isNotEmpty) {
      final sold = await supabase
          .from('orders')
          .select('id')
          .inFilter('product_id', myProductIds)
          .eq('status', 'confirmed')
          .count();
      itemsSold = sold.count;
    }

    return ProfileStats(
      activeListings: activeListings.count,
      itemsSold: itemsSold,
      swaps: swaps.count,
    );
  }

  Future<void> updateProfile({
    required String fullName,
    required String university,
    String? phone,
    String? avatarUrl,
  }) async {
    await supabase.from('profiles').update({
      'full_name': fullName.trim(),
      'university': university,
      'phone': (phone?.trim().isEmpty ?? true) ? null : phone!.trim(),
      'avatar_url': ?avatarUrl,
    }).eq('id', _myId);
  }

  /// Uploads to the public avatars bucket (028_profile_avatars.sql) and
  /// returns the public URL. `upsert` because the path is fixed per user —
  /// an avatar replaces the old one rather than accumulating orphans.
  Future<String> uploadAvatar(Uint8List bytes) async {
    final path = '$_myId/avatar.jpg';
    await supabase.storage.from('avatars').uploadBinary(
          path,
          bytes,
          fileOptions: const FileOptions(contentType: 'image/jpeg', upsert: true),
        );

    // Same path every time, so bust the CDN cache or the old face sticks.
    final version = DateTime.now().millisecondsSinceEpoch;
    return '${supabase.storage.from('avatars').getPublicUrl(path)}?v=$version';
  }

  /// Hits lib/account.ts:deleteUserAccount via POST /api/mobile/account/delete
  /// (needs the service-role client to cascade-delete the auth user, which
  /// the mobile app can't hold). Throws MobileApiException with a
  /// user-facing message if an escrow order blocks deletion.
  Future<void> deleteAccount() => _api.post('/api/mobile/account/delete');
}
