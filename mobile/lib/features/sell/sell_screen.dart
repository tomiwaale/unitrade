import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/location/location_providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/image_compression.dart';
import '../catalog/application/catalog_providers.dart';
import '../catalog/data/product.dart';
import '../kyc/data/kyc_repository.dart';
import 'application/sell_providers.dart';

class SellScreen extends ConsumerWidget {
  const SellScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statusAsync = ref.watch(myKycStatusProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Sell')),
      body: statusAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text("Couldn't load your verification status", style: TextStyle(color: AppColors.inkMute)),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: () => ref.invalidate(myKycStatusProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (status) => status.canSell ? const _ListingForm() : _KycGate(status: status),
      ),
    );
  }
}

class _KycGate extends ConsumerStatefulWidget {
  const _KycGate({required this.status});

  final KycStatus status;

  @override
  ConsumerState<_KycGate> createState() => _KycGateState();
}

class _KycGateState extends ConsumerState<_KycGate> {
  bool _uploading = false;

  Future<void> _uploadSchoolId() async {
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
    final pending = widget.status.schoolIdStatus == 'pending';

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(pending ? Icons.hourglass_top : Icons.badge_outlined, size: 48, color: AppColors.primary),
          const SizedBox(height: 16),
          Text(
            pending ? 'Your school ID is under review' : 'Verify your school ID to start selling',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            pending
                ? "We'll notify you once it's approved — usually within a day."
                : 'KolejSwap requires school ID verification before you can list items, to keep the marketplace student-only.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.inkMute),
          ),
          const SizedBox(height: 24),
          if (!pending)
            ElevatedButton.icon(
              onPressed: _uploading ? null : _uploadSchoolId,
              icon: const Icon(Icons.upload_outlined),
              label: Text(_uploading ? 'Uploading…' : 'Upload school ID'),
            ),
        ],
      ),
    );
  }
}

class _ListingForm extends ConsumerStatefulWidget {
  const _ListingForm();

  @override
  ConsumerState<_ListingForm> createState() => _ListingFormState();
}

class _ListingFormState extends ConsumerState<_ListingForm> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _priceController = TextEditingController();
  final _locationController = TextEditingController();

  String? _category;
  String? _condition;
  String _openTo = 'cash-only';
  double? _latitude;
  double? _longitude;
  bool _locating = false;
  bool _submitting = false;
  final List<Uint8List> _images = [];

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final remaining = 6 - _images.length;
    if (remaining <= 0) return;
    final picked = await ImagePicker().pickMultiImage(imageQuality: 90, limit: remaining);
    if (picked.isEmpty) return;

    final compressed = <Uint8List>[];
    for (final file in picked.take(remaining)) {
      final bytes = await file.readAsBytes();
      compressed.add(await compressImageBytes(bytes));
    }
    setState(() => _images.addAll(compressed));
  }

  Future<void> _useCurrentLocation() async {
    setState(() => _locating = true);
    try {
      final position = await ref.read(locationServiceProvider).getCurrentPosition();
      if (position == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Location unavailable — check permissions and try again.')),
          );
        }
        return;
      }
      setState(() {
        _latitude = position.latitude;
        _longitude = position.longitude;
      });
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_category == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a category')));
      return;
    }

    setState(() => _submitting = true);
    try {
      final repo = ref.read(sellRepositoryProvider);
      final imageUrls = <String>[];
      for (final bytes in _images) {
        imageUrls.add(await repo.uploadProductImage(bytes, extension: 'jpg'));
      }

      await repo.createProduct(
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        price: double.parse(_priceController.text),
        images: imageUrls,
        category: _category!,
        condition: _condition,
        openTo: _openTo,
        location: _locationController.text.trim(),
        latitude: _latitude,
        longitude: _longitude,
      );

      ref.invalidate(catalogProductsProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Listing created!')));
        _formKey.currentState!.reset();
        _titleController.clear();
        _descriptionController.clear();
        _priceController.clear();
        _locationController.clear();
        setState(() {
          _images.clear();
          _category = null;
          _condition = null;
          _openTo = 'cash-only';
          _latitude = null;
          _longitude = null;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create listing: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Photos', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            SizedBox(
              height: 90,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  for (var i = 0; i < _images.length; i++)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: Image.memory(_images[i], width: 90, height: 90, fit: BoxFit.cover),
                          ),
                          Positioned(
                            top: 2,
                            right: 2,
                            child: GestureDetector(
                              onTap: () => setState(() => _images.removeAt(i)),
                              child: const CircleAvatar(
                                radius: 10,
                                backgroundColor: Colors.black54,
                                child: Icon(Icons.close, size: 14, color: Colors.white),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (_images.length < 6)
                    InkWell(
                      onTap: _pickImage,
                      child: Container(
                        width: 90,
                        height: 90,
                        decoration: BoxDecoration(
                          border: Border.all(color: AppColors.line),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.add_a_photo_outlined, color: AppColors.inkMute),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(labelText: 'Title'),
              validator: (v) => (v?.trim().length ?? 0) < 5 ? 'Title must be at least 5 characters' : null,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(labelText: 'Description'),
              minLines: 3,
              maxLines: 6,
              validator: (v) => (v?.trim().length ?? 0) < 10 ? 'Description must be at least 10 characters' : null,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _priceController,
              decoration: const InputDecoration(labelText: 'Price (₦)'),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              validator: (v) {
                final n = double.tryParse(v ?? '');
                return (n == null || n <= 0) ? 'Enter a valid price' : null;
              },
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              initialValue: _category,
              decoration: const InputDecoration(labelText: 'Category'),
              items: [
                for (final entry in productCategories.entries)
                  DropdownMenuItem(value: entry.key, child: Text(entry.value)),
              ],
              onChanged: (v) => setState(() => _category = v),
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              initialValue: _condition,
              decoration: const InputDecoration(labelText: 'Condition (optional)'),
              items: const [
                DropdownMenuItem(value: 'new', child: Text('New')),
                DropdownMenuItem(value: 'like-new', child: Text('Like new')),
                DropdownMenuItem(value: 'good', child: Text('Good')),
                DropdownMenuItem(value: 'fair', child: Text('Fair')),
                DropdownMenuItem(value: 'poor', child: Text('Poor')),
              ],
              onChanged: (v) => setState(() => _condition = v),
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              initialValue: _openTo,
              decoration: const InputDecoration(labelText: 'Open to'),
              items: const [
                DropdownMenuItem(value: 'cash-only', child: Text('Cash only')),
                DropdownMenuItem(value: 'cash-or-swap', child: Text('Cash or swap')),
                DropdownMenuItem(value: 'swap-only', child: Text('Swap only')),
              ],
              onChanged: (v) => setState(() => _openTo = v ?? 'cash-only'),
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _locationController,
              decoration: InputDecoration(
                labelText: 'Pickup location',
                hintText: 'e.g. Hall 3, Main Campus',
                suffixIcon: IconButton(
                  icon: _locating
                      ? const Padding(
                          padding: EdgeInsets.all(12),
                          child: SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                        )
                      : Icon(Icons.my_location, color: _latitude != null ? AppColors.primary : AppColors.inkMute),
                  onPressed: _locating ? null : _useCurrentLocation,
                  tooltip: 'Pin my current location',
                ),
              ),
              validator: (v) => (v?.trim().isEmpty ?? true) ? 'Location is required' : null,
            ),
            if (_latitude != null) ...[
              const SizedBox(height: 6),
              const Text('📍 Current location pinned for "near me" search', style: TextStyle(fontSize: 12, color: AppColors.primary)),
            ],
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _submitting ? null : _submit,
              child: _submitting
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Publish listing'),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
