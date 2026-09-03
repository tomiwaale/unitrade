class AppNotification {
  AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.relatedId,
    required this.read,
    required this.createdAt,
  });

  final String id;
  final String type;
  final String title;
  final String? body;
  final String? relatedId;
  final bool read;
  final DateTime createdAt;

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
        id: json['id'] as String,
        type: json['type'] as String,
        title: json['title'] as String,
        body: json['body'] as String?,
        relatedId: json['related_id'] as String?,
        read: json['read'] as bool? ?? false,
        createdAt: DateTime.parse(json['created_at'] as String),
      );

  /// Mirrors the href logic in app/notifications/page.tsx. Order/review
  /// don't have a mobile screen yet (Phase 2), so they fall back to null —
  /// callers should just leave the user on the notifications list.
  String? get route {
    if (relatedId == null) return null;
    switch (type) {
      case 'message':
        return '/messages/$relatedId';
      case 'swap':
        return '/swaps';
      default:
        return null;
    }
  }
}
