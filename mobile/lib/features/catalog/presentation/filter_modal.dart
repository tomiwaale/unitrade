import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/location/location_providers.dart';
import '../../../core/theme/app_colors.dart';
import '../application/catalog_providers.dart';
import '../data/product.dart';
import 'university_picker_sheet.dart';

/// Bottom sheet for sort + category + proximity filters, opened from the
/// filter icon beside the catalog search bar.
class CatalogFilterModal {
  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.background,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => const _FilterSheet(),
    );
  }
}

class _FilterSheet extends ConsumerStatefulWidget {
  const _FilterSheet();

  @override
  ConsumerState<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends ConsumerState<_FilterSheet> {
  late String? _category;
  late SortOption _sort;
  late bool _nearMe;
  late String? _university;

  @override
  void initState() {
    super.initState();
    _category = ref.read(categoryFilterProvider);
    _sort = ref.read(sortOptionProvider);
    _nearMe = ref.read(nearMeEnabledProvider);
    _university = ref.read(universityFilterProvider);
  }

  void _clear() {
    setState(() {
      _category = null;
      _sort = SortOption.newest;
      _nearMe = false;
      _university = null;
    });
  }

  void _apply() {
    ref.read(categoryFilterProvider.notifier).state = _category;
    ref.read(sortOptionProvider.notifier).state = _sort;
    ref.read(universityFilterProvider.notifier).state = _university;

    final nearMeTurnedOn = _nearMe && !ref.read(nearMeEnabledProvider);
    ref.read(nearMeEnabledProvider.notifier).state = _nearMe;
    if (nearMeTurnedOn) ref.invalidate(currentPositionProvider);

    Navigator.pop(context);
  }

  Future<void> _pickUniversity() async {
    final result = await showUniversityPicker(context, current: _university);
    if (result != null) {
      setState(() => _university = result.isEmpty ? null : result);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 10),
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.line,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 12, 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Filter listings',
                            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Sort, then choose a category.',
                            style: TextStyle(fontSize: 12.5, color: AppColors.inkMute),
                          ),
                        ],
                      ),
                    ),
                    TextButton.icon(
                      onPressed: _clear,
                      icon: const Icon(Icons.refresh, size: 16),
                      label: const Text('Clear'),
                      style: TextButton.styleFrom(foregroundColor: AppColors.inkSoft),
                    ),
                  ],
                ),
              ),
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const _SectionLabel('Sort by'),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final option in SortOption.values)
                            _Chip(
                              label: option.label,
                              selected: _sort == option,
                              onTap: () => setState(() => _sort = option),
                            ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      const _SectionLabel('Category'),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _Chip(
                            label: 'All',
                            selected: _category == null,
                            onTap: () => setState(() => _category = null),
                          ),
                          for (final entry in productCategories.entries)
                            _Chip(
                              label: entry.value,
                              selected: _category == entry.key,
                              onTap: () => setState(() => _category = entry.key),
                            ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      const _SectionLabel('Location'),
                      const SizedBox(height: 8),
                      InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () => setState(() => _nearMe = !_nearMe),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.line),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.near_me, size: 18, color: AppColors.primary),
                              const SizedBox(width: 10),
                              const Expanded(
                                child: Text('Show nearest listings first', style: TextStyle(fontSize: 13.5)),
                              ),
                              Switch(
                                value: _nearMe,
                                activeThumbColor: AppColors.primary,
                                onChanged: (value) => setState(() => _nearMe = value),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      const _SectionLabel('University'),
                      const SizedBox(height: 8),
                      InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: _pickUniversity,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.line),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.school_outlined, size: 18, color: AppColors.primary),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  _university ?? 'All universities',
                                  style: const TextStyle(fontSize: 13.5),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const Icon(Icons.chevron_right, size: 18, color: AppColors.inkMute),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 16),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _apply,
                    icon: const Icon(Icons.check, size: 18),
                    label: const Text('Apply filters'),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5, color: AppColors.ink),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
      selectedColor: AppColors.primary,
      labelStyle: TextStyle(
        color: selected ? Colors.white : AppColors.inkSoft,
        fontSize: 13,
        fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
      ),
      side: BorderSide(color: selected ? AppColors.primary : AppColors.line),
      backgroundColor: Colors.white,
      showCheckmark: false,
    );
  }
}
