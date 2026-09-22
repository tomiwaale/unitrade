import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../application/safety_providers.dart';
import '../data/models.dart';

/// Opens the report flow. Returns true if a report was filed.
///
/// [blockUserId] adds an "also block" switch. The two have to happen in this
/// order: blocking hides the conversation (031_user_safety.sql), so a user who
/// blocks first and then looks for the report button will not find the thread.
Future<bool> showReportSheet(
  BuildContext context, {
  required ReportTargetType targetType,
  required String targetId,
  required String subject,
  String? blockUserId,
  String? blockUserName,
}) async {
  final reported = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.background,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (context) => _ReportSheet(
      targetType: targetType,
      targetId: targetId,
      subject: subject,
      blockUserId: blockUserId,
      blockUserName: blockUserName,
    ),
  );

  return reported ?? false;
}

class _ReportSheet extends ConsumerStatefulWidget {
  const _ReportSheet({
    required this.targetType,
    required this.targetId,
    required this.subject,
    this.blockUserId,
    this.blockUserName,
  });

  final ReportTargetType targetType;
  final String targetId;
  final String subject;
  final String? blockUserId;
  final String? blockUserName;

  @override
  ConsumerState<_ReportSheet> createState() => _ReportSheetState();
}

class _ReportSheetState extends ConsumerState<_ReportSheet> {
  final _detailsController = TextEditingController();
  ReportReason? _reason;
  bool _alsoBlock = false;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _detailsController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final reason = _reason;
    if (reason == null) {
      setState(() => _error = 'Pick a reason so we know what to look for.');
      return;
    }

    setState(() { _submitting = true; _error = null; });

    final repository = ref.read(safetyRepositoryProvider);

    try {
      await repository.report(
        targetType: widget.targetType,
        targetId: widget.targetId,
        reason: reason,
        details: _detailsController.text,
      );
    } on SafetyException catch (e) {
      // An already-filed report should still let the block through.
      final alreadyFiled = e.message.startsWith("You've already reported");
      if (!alreadyFiled) {
        if (mounted) setState(() { _submitting = false; _error = e.message; });
        return;
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _submitting = false;
          _error = 'Could not submit the report. Please try again.';
        });
      }
      return;
    }

    if (_alsoBlock && widget.blockUserId != null) {
      try {
        await repository.blockUser(widget.blockUserId!);
        ref.invalidate(blockedAccountsProvider);
        ref.invalidate(blockedUserIdsProvider);
      } on SafetyException catch (e) {
        if (mounted) setState(() { _submitting = false; _error = e.message; });
        return;
      }
    }

    if (!mounted) return;
    Navigator.of(context).pop(true);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          _alsoBlock && widget.blockUserName != null
              ? 'Report received. ${widget.blockUserName} can no longer message you.'
              : 'Report received — we review every report within 24 hours.',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final label = widget.targetType == ReportTargetType.user
        ? 'this person'
        : 'this ${widget.targetType.value}';

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.75,
        maxChildSize: 0.95,
        builder: (context, scrollController) => ListView(
          controller: scrollController,
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          children: [
            Center(
              child: Container(
                width: 36, height: 4,
                margin: const EdgeInsets.only(bottom: 18),
                decoration: BoxDecoration(
                  color: AppColors.line,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
            Row(
              children: [
                const Icon(Icons.flag_outlined, size: 18, color: AppColors.inkSoft),
                const SizedBox(width: 8),
                Text('Report $label',
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.ink)),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              widget.subject,
              style: const TextStyle(fontSize: 13, color: AppColors.inkMute),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 18),
            const Text("What's wrong?",
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.ink)),
            const SizedBox(height: 6),
            RadioGroup<ReportReason>(
              groupValue: _reason,
              // RadioGroup.onChanged is non-nullable, so the disabled case is
              // handled here rather than by passing null.
              onChanged: (value) {
                if (_submitting) return;
                setState(() => _reason = value);
              },
              child: Column(
                children: ReportReason.values
                    .map((reason) => RadioListTile<ReportReason>(
                          value: reason,
                          activeColor: AppColors.primary,
                          contentPadding: EdgeInsets.zero,
                          visualDensity: VisualDensity.compact,
                          title: Text(reason.label,
                              style: const TextStyle(
                                  fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.ink)),
                          subtitle: Text(reason.hint,
                              style: const TextStyle(fontSize: 12, color: AppColors.inkMute)),
                        ))
                    .toList(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _detailsController,
              enabled: !_submitting,
              minLines: 2,
              maxLines: 4,
              maxLength: 2000,
              decoration: const InputDecoration(
                labelText: 'Anything else we should know? (optional)',
                hintText: 'Tell us what happened.',
              ),
            ),
            if (widget.blockUserId != null) ...[
              const SizedBox(height: 4),
              SwitchListTile.adaptive(
                value: _alsoBlock,
                onChanged: _submitting ? null : (value) => setState(() => _alsoBlock = value),
                activeThumbColor: AppColors.primary,
                contentPadding: EdgeInsets.zero,
                title: Text('Also block ${widget.blockUserName ?? "this person"}',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.ink)),
                subtitle: const Text(
                  "They won't be able to message you, and their conversation leaves your inbox. "
                  'You can undo this in Settings.',
                  style: TextStyle(fontSize: 12, color: AppColors.inkMute),
                ),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors.destructive.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(_error!,
                    style: const TextStyle(fontSize: 12.5, color: AppColors.destructive)),
              ),
            ],
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _submitting ? null : () => Navigator.of(context).pop(false),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton(
                    onPressed: _submitting ? null : _submit,
                    child: Text(_submitting ? 'Sending…' : 'Submit report'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
