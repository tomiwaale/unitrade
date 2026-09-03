import '../../../core/api/mobile_api_client.dart';
import '../../../core/supabase/supabase_client.dart';

class Bank {
  Bank({required this.name, required this.code});
  final String name;
  final String code;

  factory Bank.fromJson(Map<String, dynamic> json) =>
      Bank(name: json['name'] as String, code: json['code'] as String);
}

class PayoutStatus {
  PayoutStatus({this.bankName, this.accountName, this.accountNumber, required this.hasSubaccount});

  final String? bankName;
  final String? accountName;
  final String? accountNumber;
  final bool hasSubaccount;

  factory PayoutStatus.fromRow(Map<String, dynamic> row) => PayoutStatus(
        bankName: row['bank_name'] as String?,
        accountName: row['account_name'] as String?,
        accountNumber: row['account_number'] as String?,
        hasSubaccount: row['has_subaccount'] as bool? ?? false,
      );
}

/// Mirrors app/actions/payout.ts. Reading current status uses
/// get_my_payout_status() (019_payout_status.sql, since bank_name etc.
/// aren't in the authenticated SELECT grant); saving needs the Paystack
/// secret key so it goes through /api/mobile/payout/* (lib/payout.ts on
/// the server).
class PayoutRepository {
  final _api = MobileApiClient();

  Future<PayoutStatus> getStatus() async {
    final rows = await supabase.rpc('get_my_payout_status') as List;
    if (rows.isEmpty) return PayoutStatus(hasSubaccount: false);
    return PayoutStatus.fromRow(rows.first as Map<String, dynamic>);
  }

  Future<List<Bank>> fetchBanks() async {
    final result = await _api.get('/api/mobile/payout/banks');
    final banks = (result['banks'] as List?) ?? [];
    return banks.map((b) => Bank.fromJson(b as Map<String, dynamic>)).toList();
  }

  Future<void> save({required String bankCode, required String bankName, required String accountNumber}) async {
    await _api.post('/api/mobile/payout/save', body: {
      'bankCode': bankCode,
      'bankName': bankName,
      'accountNumber': accountNumber,
    });
  }
}
