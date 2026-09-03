import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/api/mobile_api_client.dart';
import '../../../core/supabase/supabase_client.dart';

class KycStatus {
  KycStatus({required this.schoolIdStatus, required this.ninVerified, this.ninLast4});

  final String schoolIdStatus; // none | pending | approved | rejected
  final bool ninVerified;
  final String? ninLast4;

  bool get canSell => schoolIdStatus == 'approved';

  factory KycStatus.fromRow(Map<String, dynamic> row) => KycStatus(
        schoolIdStatus: row['school_id_status'] as String? ?? 'none',
        ninVerified: row['nin_verified'] as bool? ?? false,
        ninLast4: row['nin_last4'] as String?,
      );
}

/// Mirrors app/actions/kyc.ts. School-ID status/upload go straight to
/// Supabase (get_my_kyc_status / submit_school_id RPCs — 017/018_*.sql).
/// NIN verification needs the Prembly secret key, so it goes through
/// POST /api/mobile/kyc/verify-nin (lib/kyc.ts on the server) instead.
class KycRepository {
  final _api = MobileApiClient();

  Future<KycStatus> getStatus() async {
    final rows = await supabase.rpc('get_my_kyc_status') as List;
    if (rows.isEmpty) return KycStatus(schoolIdStatus: 'none', ninVerified: false);
    return KycStatus.fromRow(rows.first as Map<String, dynamic>);
  }

  Future<void> uploadAndSubmitSchoolId(Uint8List bytes, {required String extension}) async {
    final userId = supabase.auth.currentUser!.id;
    final path = '$userId/${DateTime.now().millisecondsSinceEpoch}.$extension';

    await supabase.storage.from('school-ids').uploadBinary(
          path,
          bytes,
          fileOptions: const FileOptions(contentType: 'image/jpeg'),
        );

    await supabase.rpc('submit_school_id', params: {'p_school_id_path': path});
  }

  Future<void> submitNIN(String nin) async {
    await _api.post('/api/mobile/kyc/verify-nin', body: {'nin': nin});
  }
}
