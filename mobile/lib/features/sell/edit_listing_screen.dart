import 'dart:typed_data';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/location/location_providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/image_compression.dart';
import '../catalog/application/catalog_providers.dart';
import '../catalog/data/product.dart';
import '../product/application/product_detail_providers.dart';
import 'application/sell_providers.dart';

const _conditionValues = {'new', 'like-new', 'good', 'fair', 'poor'};
const _openToValues = {'cash-only', 'cash-or-swap', 'swap-only'};

/// Mirrors app/listings/[id]/edit/ — unlike the web form, this edits every
/// field the listing actually has (condition, open_to included), since the
/// underlying Product model and update grant already support it and
/// omitting them would silently blank those columns on save.
class EditListingScreen extends ConsumerWidget {
  const EditListingScreen({super.key, required this.productId});

  final String productId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productAsync = ref.watch(productDetailProvider(productId));

    return Scaffold(
      appBar: AppBar(title: const Text('Edit listing')),
      body: productAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => const Center(child: Text("Couldn't load this listing")),
        data: (product) => _EditForm(product: product),
      ),
    );
  }
}

class _EditForm extends ConsumerStatefulWidget {
  const _EditForm({required this.product});

  final Product product;

  @override
  ConsumerState<_EditForm> createState() => _EditFormState();
}

class _EditFormState extends ConsumerState<_EditForm> {
  final _formKey = GlobalKey<FormState>();
  late final _titleController = TextEditingController(text: widget.product.title);
  late final _descriptionController = TextEditingController(text: widget.product.description);
  late final _priceController = TextEditingController(text: widget.product.price.toStringAsFixed(0));
  late final _locationController = TextEditingController(text: widget.product.location ?? '');

  // DropdownButtonFormField crashes if initialValue doesn't exactly match one
  // of its items, and older listings can carry values that predate the
  // current option sets (e.g. category "furniture" before productCategories
  // was narrowed) — fall back to unselected rather than matching nothing.
  late String? _category =
      productCategories.containsKey(widget.product.category) ? widget.product.category : null;
  late String? _condition = _conditionValues.contains(widget.product.condition) ? widget.product.condition : null;
  late String _openTo =
      _openToValues.contains(widget.product.openTo) ? widget.product.openTo! : 'cash-only';
  late double? _latitude = widget.product.latitude;
  late double? _longitude = widget.product.longitude;
  late final List<String> _existingImageUrls = [...widget.product.images];
  final List<Uint8List> _newImages = [];
  bool _locating = false;
  bool _submitting = false;

  int get _totalImageCount => _existingImageUrls.length + _newImages.length;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final remaining = 6 - _totalImageCount;
    if (remaining <= 0) return;
    final picked = await ImagePicker().pickMultiImage(imageQuality: 90, limit: remaining);
    if (picked.isEmpty) return;

    final compressed = <Uint8List>[];
    for (final file in picked.take(remaining)) {
      final bytes = await file.readAsBytes();
      compressed.add(await compressImageBytes(bytes));
    }
    setState(() => _newImages.addAll(compressed));
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
      final newUrls = <String>[];
      for (final bytes in _newImages) {
        newUrls.add(await repo.uploadProductImage(bytes, extension: 'jpg'));
      }

      await repo.updateProduct(
        id: widget.product.id,
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        price: double.parse(_priceController.text),
        images: [..._existingImageUrls, ...newUrls],
        category: _category!,
        condition: _condition,
        openTo: _openTo,
        location: _locationController.text.trim(),
        latitude: _latitude,
        longitude: _longitude,
      );

      ref.invalidate(myListingsProvider);
      ref.invalidate(catalogProductsProvider);
      ref.invalidate(productDetailProvider(widget.product.id));

      if (mounted) context.pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save changes: $e')),
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
                  for (var i = 0; i < _existingImageUrls.length; i++)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: CachedNetworkImage(
                              imageUrl: _existingImageUrls[i],
                              width: 90,
                              height: 90,
                              fit: BoxFit.cover,
                            ),
                          ),
                          Positioned(
                            top: 2,
                            right: 2,
                            child: GestureDetector(
                              onTap: () => setState(() => _existingImageUrls.removeAt(i)),
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
                  for (var i = 0; i < _newImages.length; i++)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: Image.memory(_newImages[i], width: 90, height: 90, fit: BoxFit.cover),
                          ),
                          Positioned(
                            top: 2,
                            right: 2,
                            child: GestureDetector(
                              onTap: () => setState(() => _newImages.removeAt(i)),
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
                  if (_totalImageCount < 6)
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
                  : const Text('Save changes'),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
