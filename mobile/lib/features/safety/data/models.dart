/// Values match the content_reports.reason CHECK constraint in
/// 031_user_safety.sql and lib/safety.ts on the web. Keep the three in step.
enum ReportReason {
  harassment('harassment', 'Harassment or bullying', 'Threats, insults, or repeated unwanted contact'),
  sexualContent('sexual_content', 'Nudity or sexual content', 'Sexual images, or someone asking you for them'),
  violence('violence', 'Violence or threats', 'Threats of harm, or graphic violent content'),
  hateSpeech('hate_speech', 'Hate speech', 'Slurs or attacks on who someone is'),
  scam('scam', 'Scam or fraud', 'Trying to take payment outside escrow, fake items'),
  spam('spam', 'Spam or advertising', 'Repetitive junk or unrelated promotion'),
  prohibitedItem('prohibited_item', 'Prohibited item', 'Drugs, weapons, stolen or counterfeit goods'),
  impersonation('impersonation', 'Impersonation', 'Pretending to be someone else'),
  other('other', 'Something else', 'Tell us what happened');

  const ReportReason(this.value, this.label, this.hint);

  final String value;
  final String label;
  final String hint;
}

enum ReportTargetType {
  message('message'),
  user('user'),
  product('product'),
  review('review');

  const ReportTargetType(this.value);

  final String value;
}

class BlockedAccount {
  BlockedAccount({
    required this.id,
    required this.blockedId,
    required this.name,
    required this.createdAt,
  });

  final String id;
  final String blockedId;
  final String name;
  final DateTime createdAt;

  factory BlockedAccount.fromJson(Map<String, dynamic> json) => BlockedAccount(
        id: json['id'] as String,
        blockedId: json['blocked_id'] as String,
        name: (json['blocked']?['full_name'] as String?) ?? 'Former user',
        createdAt: DateTime.parse(json['created_at'] as String),
      );
}

/// Raised when an action fails in a way the user needs told about, with a
/// message already fit to put in front of them.
class SafetyException implements Exception {
  SafetyException(this.message);

  final String message;

  @override
  String toString() => message;
}
