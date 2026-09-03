import 'package:flutter_test/flutter_test.dart';
import 'package:kolejswap_mobile/features/chat/data/models.dart';

void main() {
  Map<String, dynamic> row({String? content, String? imageUrl, String? readAt}) => {
        'id': 'm1',
        'conversation_id': 'c1',
        'sender_id': 'u1',
        'content': content,
        'image_url': imageUrl,
        'created_at': '2026-08-30T10:00:00Z',
        'read_at': readAt,
      };

  group('ChatMessage', () {
    test('parses a text message', () {
      final message = ChatMessage.fromJson(row(content: 'Is this still available?'));
      expect(message.hasText, isTrue);
      expect(message.imageUrl, isNull);
      expect(message.isRead, isFalse);
    });

    test('parses an image-only message', () {
      // 027_chat_images.sql drops the NOT NULL on content for exactly this.
      final message = ChatMessage.fromJson(row(imageUrl: 'https://cdn/x.jpg'));
      expect(message.content, isNull);
      expect(message.hasText, isFalse);
      expect(message.imageUrl, 'https://cdn/x.jpg');
    });

    test('whitespace-only content does not count as text', () {
      expect(ChatMessage.fromJson(row(content: '   ')).hasText, isFalse);
    });

    test('read_at drives the double tick', () {
      expect(ChatMessage.fromJson(row(content: 'hi', readAt: '2026-08-30T10:05:00Z')).isRead, isTrue);
    });
  });

  group('ConversationSummary.canBuy', () {
    ConversationSummary summary({
      String? productId = 'p1',
      String? status = 'active',
      bool isBuyer = true,
    }) =>
        ConversationSummary(
          id: 'c1',
          productId: productId,
          productTitle: 'Casio FX-991',
          productImage: null,
          productStatus: status,
          isBuyer: isBuyer,
          otherUserId: 'u2',
          otherUserName: 'Ada',
          createdAt: DateTime.utc(2026, 8, 30),
        );

    test('offered to the buyer on an active listing', () {
      expect(summary().canBuy, isTrue);
    });

    test('never offered to the seller', () {
      expect(summary(isBuyer: false).canBuy, isFalse);
    });

    test('not offered once the listing is sold', () {
      expect(summary(status: 'sold').canBuy, isFalse);
    });

    test('not offered when the listing is gone', () {
      expect(summary(productId: null).canBuy, isFalse);
    });
  });
}
