import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/image_compression.dart';
import '../application/kyc_providers.dart';
import '../data/kyc_repository.dart';

class KycScreen extends ConsumerWidget {
  const KycScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statusAsync = ref.watch(myKycStatusProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Verification')),
      body: statusAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: OutlinedButton(
            onPressed: () => ref.invalidate(myKycStatusProvider),
            child: const Text('Retry'),
          ),
        ),
        data: (status) => ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text('School ID', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
            const SizedBox(height: 4),
            const Text(
              'Required to list items — confirms you\'re a verified student.',
              style: TextStyle(color: AppColors.inkMute, fontSize: 13),
            ),
            const SizedBox(height: 12),
            _SchoolIdCard(status: status),
            const SizedBox(height: 28),
            const Text('NIN verification', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
            const SizedBox(height: 4),
            const Text(
              'Optional — adds a verified badge and speeds up payout approval.',
              style: TextStyle(color: AppColors.inkMute, fontSize: 13),
            ),
            const SizedBox(height: 12),
            _NinCard(status: status),
          ],
        ),
      ),
    );
  }
}

class _SchoolIdCard extends ConsumerStatefulWidget {
  const _SchoolIdCard({required this.status});

  final KycStatus status;

  @override
  ConsumerState<_SchoolIdCard> createState() => _SchoolIdCardState();
}

class _SchoolIdCardState extends ConsumerState<_SchoolIdCard> {
  bool _uploading = false;

  Future<void> _upload() async {
    final picked = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 90);
    if (picked == null) return;

    setState(() => _uploading = true);
    try {
      final bytes = await picked.readAsBytes();
      final compressed = await compressImageBytes(bytes);
      await ref.read(kycRepositoryProvider).uploadAndSubmitSchoolId(compressed, extension: 'jpg');
      ref.invalidate(myKycStatusProvider);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Upload failed. Please try again.')),
        );
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = widget.status.schoolIdStatus;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(
              status == 'approved'
                  ? Icons.verified_outlined
                  : status == 'pending'
                      ? Icons.hourglass_top
                      : Icons.badge_outlined,
              color: status == 'approved' ? AppColors.primary : AppColors.inkMute,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                switch (status) {
                  'approved' => 'Verified',
                  'pending' => 'Under review',
                  'rejected' => 'Rejected — please re-upload',
                  _ => 'Not submitted',
                },
                style: const TextStyle(fontWeight: FontWeight.w500),
              ),
            ),
            if (status != 'approved' && status != 'pending')
              TextButton(
                onPressed: _uploading ? null : _upload,
                child: Text(_uploading ? 'Uploading…' : 'Upload'),
              ),
          ],
        ),
      ),
    );
  }
}

class _NinCard extends ConsumerStatefulWidget {
  const _NinCard({required this.status});

  final KycStatus status;

  @override
  ConsumerState<_NinCard> createState() => _NinCardState();
}

class _NinCardState extends ConsumerState<_NinCard> {
  final _controller = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final nin = _controller.text.trim();
    if (!RegExp(r'^\d{11}$').hasMatch(nin)) {
      setState(() => _error = 'NIN must be exactly 11 digits');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref.read(kycRepositoryProvider).submitNIN(nin);
      ref.invalidate(myKycStatusProvider);
      _controller.clear();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.status.ninVerified) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              const Icon(Icons.verified_outlined, color: AppColors.primary),
              const SizedBox(width: 12),
              Text(
                widget.status.ninLast4 != null
                    ? 'Verified — ending in ${widget.status.ninLast4}'
                    : 'Verified',
                style: const TextStyle(fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _controller,
              decoration: const InputDecoration(labelText: 'NIN', hintText: '11-digit National ID Number'),
              keyboardType: TextInputType.number,
              maxLength: 11,
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(_error!, style: const TextStyle(color: AppColors.destructive, fontSize: 12)),
              ),
            ElevatedButton(
              onPressed: _submitting ? null : _submit,
              child: Text(_submitting ? 'Verifying…' : 'Verify NIN'),
            ),
          ],
        ),
      ),
    );
  }
}
