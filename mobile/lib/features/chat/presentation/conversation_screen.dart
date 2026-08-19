import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/supabase/supabase_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/phone.dart';
import '../application/chat_providers.dart';
import '../data/calling_repository.dart';
import '../data/models.dart';

class ConversationScreen extends ConsumerStatefulWidget {
  const ConversationScreen({super.key, required this.conversationId, this.summary});

  final String conversationId;
  final ConversationSummary? summary;

  @override
  ConsumerState<ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends ConsumerState<ConversationScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  bool _sending = false;

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _controller.text;
    if (text.trim().isEmpty || _sending) return;

    setState(() => _sending = true);
    _controller.clear();
    try {
      await ref.read(chatRepositoryProvider).sendMessage(widget.conversationId, text);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _call({required bool whatsapp, required String? otherUserId}) async {
    if (otherUserId == null) {
      _showMessage('Still loading this conversation — try again in a moment.');
      return;
    }

    try {
      final phone = await ref.read(callingRepositoryProvider).getCounterpartPhone(otherUserId);
      final uri = whatsapp
          ? Uri.parse('https://wa.me/${toWhatsAppNumber(phone)}')
          : Uri.parse('tel:${toDialNumber(phone)}');

      // No canLaunchUrl() gate: it needs the platform query declarations
      // (android/app/src/main/AndroidManifest.xml <queries>,
      // ios/Runner/Info.plist LSApplicationQueriesSchemes) and returning
      // false there used to make this button silently do nothing. Attempt
      // the launch and report it if it actually fails.
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        _showMessage(whatsapp ? "Couldn't open WhatsApp." : "Couldn't open the dialer.");
      }
    } on NoSharedRelationshipException {
      _showMessage("You'll need to be in a conversation with them first.");
    } catch (_) {
      _showMessage('Could not get contact details. Please try again.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final messagesAsync = ref.watch(conversationMessagesProvider(widget.conversationId));
    final myId = supabase.auth.currentUser?.id;

    // Opened from a push-notification tap there is no `extra`, so fall back
    // to loading the conversation — otherwise the title and the call
    // buttons have nothing to work with.
    final summary = widget.summary ??
        (ref.watch(conversationSummaryProvider(widget.conversationId)).value);

    return Scaffold(
      appBar: AppBar(
        title: Text(summary?.otherUserName ?? 'Conversation'),
        actions: [
          IconButton(
            icon: const Icon(Icons.call_outlined),
            tooltip: 'Call',
            onPressed: () => _call(whatsapp: false, otherUserId: summary?.otherUserId),
          ),
          IconButton(
            icon: const Icon(Icons.chat_outlined),
            tooltip: 'WhatsApp',
            onPressed: () => _call(whatsapp: true, otherUserId: summary?.otherUserId),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: messagesAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) =>
                  const Center(child: Text("Couldn't load messages", style: TextStyle(color: AppColors.inkMute))),
              data: (messages) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (_scrollController.hasClients) {
                    _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
                  }
                });
                return ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final ChatMessage message = messages[index];
                    final isMine = message.senderId == myId;
                    return Align(
                      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                        decoration: BoxDecoration(
                          color: isMine ? AppColors.primary : Colors.white,
                          border: isMine ? null : Border.all(color: AppColors.line),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Text(
                          message.content,
                          style: TextStyle(color: isMine ? AppColors.primaryForeground : AppColors.ink),
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      decoration: const InputDecoration(hintText: 'Message'),
                      minLines: 1,
                      maxLines: 4,
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _sending ? null : _send,
                    icon: const Icon(Icons.arrow_upward),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
