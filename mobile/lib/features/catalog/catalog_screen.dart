import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/widgets/skeletons.dart';
import 'application/catalog_providers.dart';
import 'data/product.dart';
import 'presentation/filter_modal.dart';
import 'presentation/product_card.dart';
import 'presentation/promo_carousel.dart';

class CatalogScreen extends ConsumerStatefulWidget {
  const CatalogScreen({super.key});

  @override
  ConsumerState<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends ConsumerState<CatalogScreen> {
  late final TextEditingController _searchController;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController(text: ref.read(searchQueryProvider));
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      if (mounted) {
        ref.read(searchQueryProvider.notifier).state = query;
      }
    });
    setState(() {}); // Rebuild for clear button visibility
  }

  void _clearSearch() {
    _debounce?.cancel();
    _searchController.clear();
    ref.read(searchQueryProvider.notifier).state = '';
    setState(() {});
  }

  void _resetAllFilters() {
    _clearSearch();
    ref.read(categoryFilterProvider.notifier).state = null;
    ref.read(sortOptionProvider.notifier).state = SortOption.newest;
    ref.read(nearMeEnabledProvider.notifier).state = false;
    ref.read(universityFilterProvider.notifier).state = null;
  }

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(catalogProductsProvider);
    final selectedCategory = ref.watch(categoryFilterProvider);
    final sort = ref.watch(sortOptionProvider);
    final nearMe = ref.watch(nearMeEnabledProvider);
    final university = ref.watch(universityFilterProvider);
    final searchQuery = ref.watch(searchQueryProvider);
    final filtersActive =
        selectedCategory != null ||
        sort != SortOption.newest ||
        nearMe ||
        university != null ||
        searchQuery.isNotEmpty;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      decoration: InputDecoration(
                        hintText: 'Search listings',
                        prefixIcon: const Icon(Icons.search, size: 20),
                        suffixIcon: _searchController.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear, size: 18),
                                onPressed: _clearSearch,
                              )
                            : null,
                      ),
                      onChanged: _onSearchChanged,
                      onSubmitted: (value) {
                        _debounce?.cancel();
                        ref.read(searchQueryProvider.notifier).state = value;
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  _FilterButton(
                    active: filtersActive,
                    onTap: () => CatalogFilterModal.show(context),
                  ),
                ],
              ),
            ),
            _CategoryChipBar(
              selectedCategory: selectedCategory,
              onSelected: (category) {
                ref.read(categoryFilterProvider.notifier).state = category;
              },
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async => ref.invalidate(catalogProductsProvider),
                child: CustomScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  slivers: [
                    const SliverToBoxAdapter(child: SizedBox(height: 8)),
                    const SliverToBoxAdapter(child: PromoCarousel()),
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              selectedCategory != null
                                  ? (productCategories[selectedCategory] ?? 'Listings')
                                  : 'All listings',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            if (filtersActive)
                              TextButton(
                                onPressed: _resetAllFilters,
                                child: const Text('Reset filters'),
                              ),
                          ],
                        ),
                      ),
                    ),
                    productsAsync.when(
                      loading: () => const CatalogGridSkeleton(),
                      error: (error, stack) => SliverFillRemaining(
                        hasScrollBody: false,
                        child: _ErrorState(
                          onRetry: () => ref.invalidate(catalogProductsProvider),
                        ),
                      ),
                      data: (products) => products.isEmpty
                          ? const SliverFillRemaining(
                              hasScrollBody: false,
                              child: Center(
                                child: Text(
                                  'No listings found',
                                  style: TextStyle(color: AppColors.inkMute),
                                ),
                              ),
                            )
                          : SliverPadding(
                              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                              sliver: SliverGrid(
                                gridDelegate:
                                    const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2,
                                  mainAxisSpacing: 10,
                                  crossAxisSpacing: 10,
                                  childAspectRatio: 1,
                                ),
                                delegate: SliverChildBuilderDelegate((
                                  context,
                                  index,
                                ) {
                                  final Product product = products[index];
                                  return ProductCard(
                                    product: product,
                                    onTap: () =>
                                        context.push('/product/${product.id}'),
                                  );
                                }, childCount: products.length),
                              ),
                            ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryChipBar extends StatelessWidget {
  const _CategoryChipBar({
    required this.selectedCategory,
    required this.onSelected,
  });

  final String? selectedCategory;
  final ValueChanged<String?> onSelected;

  static const _icons = <String, IconData>{
    'textbooks': Icons.menu_book_outlined,
    'electronics': Icons.devices_outlined,
    'fashion': Icons.checkroom_outlined,
    'hostel': Icons.hotel_outlined,
    'services': Icons.build_outlined,
    'other': Icons.more_horiz_outlined,
  };

  @override
  Widget build(BuildContext context) {
    final allSelected = selectedCategory == null;

    return SizedBox(
      height: 38,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          _ChipItem(
            label: 'All',
            icon: Icons.grid_view_outlined,
            selected: allSelected,
            onTap: () => onSelected(null),
          ),
          for (final entry in productCategories.entries)
            Padding(
              padding: const EdgeInsets.only(left: 8),
              child: _ChipItem(
                label: entry.value,
                icon: _icons[entry.key],
                selected: selectedCategory == entry.key,
                onTap: () {
                  if (selectedCategory == entry.key) {
                    onSelected(null);
                  } else {
                    onSelected(entry.key);
                  }
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _ChipItem extends StatelessWidget {
  const _ChipItem({
    required this.label,
    required this.selected,
    required this.onTap,
    this.icon,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.line,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(
                icon,
                size: 14,
                color: selected ? Colors.white : AppColors.inkSoft,
              ),
              const SizedBox(width: 5),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                color: selected ? Colors.white : AppColors.ink,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterButton extends StatelessWidget {
  const _FilterButton({required this.active, required this.onTap});

  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: onTap,
      child: Container(
        width: 46,
        height: 46,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: active ? AppColors.primary : AppColors.line,
          ),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(
              Icons.tune,
              size: 20,
              color: active ? AppColors.primary : AppColors.inkSoft,
            ),
            if (active)
              Positioned(
                top: 8,
                right: 9,
                child: Container(
                  width: 7,
                  height: 7,
                  decoration: const BoxDecoration(
                    color: AppColors.accent,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            "Couldn't load listings",
            style: TextStyle(color: AppColors.inkMute),
          ),
          const SizedBox(height: 8),
          OutlinedButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}
