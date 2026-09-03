import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/image_compression.dart';
import '../application/order_providers.dart';

/// Reason codes, not display strings — these are stored in
/// orders.dispute_reason and are constrained by orders_dispute_reason_check
/// (026_dispute_details.sql). DISPUTE_REASONS in lib/orders.ts holds the same
/// set and renders the labels for the admin dispute page and support email.
const disputeReasons = <String, String>{
  'item_not_received': 'Item not received',
  'item_damaged': 'Item damaged or defective',
  'wrong_item': 'Wrong item',
  'seller_no_show': 'Seller did not show up',
  'other': 'Other',
};

/// Shows a structured dispute bottom sheet with reason picker, explanation,
/// and up to 3 photo evidence slots.
Future<void> showDisputeModal(
  BuildContext context, {
  required String orderId,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.background,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => _DisputeSheet(orderId: orderId),
  );
}

class _DisputeSheet extends ConsumerStatefulWidget {
  const _DisputeSheet({required this.orderId});

  final String orderId;

  @override
  ConsumerState<_DisputeSheet> createState() => _DisputeSheetState();
}

class _DisputeSheetState extends ConsumerState<_DisputeSheet> {
  final _formKey = GlobalKey<FormState>();
  final _explanationController = TextEditingController();
  String? _selectedReason;
  final List<File> _evidence = [];
  bool _submitting = false;

  @override
  void dispose() {
    _explanationController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    if (_evidence.length >= 3) return;
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery, imageQuality: 75, maxWidth: 1280);
    if (picked != null && mounted) {
      setState(() => _evidence.add(File(picked.path)));
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _submitting = true);
    try {
      final repository = ref.read(orderRepositoryProvider);

      // Upload first: a dispute filed with half its evidence missing is worse
      // than one that failed outright and can be retried.
      final evidencePaths = <String>[];
      for (final file in _evidence) {
        final bytes = await compressImageBytes(await file.readAsBytes());
        evidencePaths.add(await repository.uploadDisputeEvidence(bytes, extension: 'jpg'));
      }

      await repository.dispute(
            widget.orderId,
            reason: _selectedReason!,
            explanation: _explanationController.text.trim(),
            evidence: evidencePaths,
          );
      ref.invalidate(orderDetailProvider(widget.orderId));
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Dispute filed — we'll review and contact you shortly.")),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(24, 16, 24, MediaQuery.of(context).viewInsets.bottom + 24),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle
              Center(
                child: Container(
                  width: 36, height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.line,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Warning strip
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF3CD),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.warning_amber_outlined, size: 18, color: Color(0xFF856404)),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Filing a dispute freezes the payment and notifies our team. '
                        'Only use this if you have a genuine problem.',
                        style: TextStyle(fontSize: 13, color: Color(0xFF856404)),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),
              const Text('Report a problem', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),

              // Reason dropdown
              DropdownButtonFormField<String>(
                initialValue: _selectedReason,
                decoration: const InputDecoration(
                  labelText: 'What went wrong?',
                  prefixIcon: Icon(Icons.help_outline, size: 20),
                ),
                items: disputeReasons.entries
                    .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value, overflow: TextOverflow.ellipsis)))
                    .toList(),
                onChanged: (v) => setState(() => _selectedReason = v),
                validator: (v) => v == null ? 'Please select a reason' : null,
              ),

              const SizedBox(height: 16),

              // Explanation
              TextFormField(
                controller: _explanationController,
                decoration: const InputDecoration(
                  labelText: 'Describe what happened',
                  hintText: 'The more detail you provide, the faster we can resolve this...',
                  alignLabelWithHint: true,
                ),
                minLines: 3,
                maxLines: 6,
                validator: (v) {
                  if (v == null || v.trim().length < 20) return 'Please provide at least 20 characters';
                  return null;
                },
              ),

              const SizedBox(height: 20),

              // Photo evidence
              const Text('Photo evidence (optional, up to 3)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
              const SizedBox(height: 10),
              Row(
                children: [
                  ..._evidence.asMap().entries.map((entry) => Padding(
                    padding: const EdgeInsets.only(right: 10),
                    child: Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.file(entry.value, width: 72, height: 72, fit: BoxFit.cover),
                        ),
                        Positioned(
                          top: 2, right: 2,
                          child: GestureDetector(
                            onTap: () => setState(() => _evidence.removeAt(entry.key)),
                            child: Container(
                              padding: const EdgeInsets.all(2),
                              decoration: const BoxDecoration(
                                color: Colors.black54,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.close, size: 14, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    ),
                  )),
                  if (_evidence.length < 3)
                    GestureDetector(
                      onTap: _pickImage,
                      child: Container(
                        width: 72, height: 72,
                        decoration: BoxDecoration(
                          color: AppColors.backgroundSunken,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.line, style: BorderStyle.solid),
                        ),
                        child: const Icon(Icons.add_photo_alternate_outlined, color: AppColors.inkSoft),
                      ),
                    ),
                ],
              ),

              const SizedBox(height: 24),

              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(backgroundColor: AppColors.destructive),
                  onPressed: _submitting ? null : _submit,
                  icon: _submitting
                      ? const SizedBox(
                          width: 16, height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.report_problem_outlined),
                  label: const Text('File Dispute'),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
