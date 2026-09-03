import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

import '../../../core/location/location_providers.dart';
import '../data/product.dart';
import '../data/product_repository.dart';
import '../data/promo_slide.dart';
import '../data/promo_slide_repository.dart';

final productRepositoryProvider = Provider<ProductRepository>(
  (ref) => ProductRepository(),
);
final promoSlideRepositoryProvider = Provider<PromoSlideRepository>(
  (ref) => PromoSlideRepository(),
);

final promoSlidesProvider = FutureProvider<List<PromoSlide>>((ref) {
  return ref.watch(promoSlideRepositoryProvider).fetchActiveSlides();
});

final categoryFilterProvider = StateProvider<String?>((ref) => null);
final searchQueryProvider = StateProvider<String>((ref) => '');
final nearMeEnabledProvider = StateProvider<bool>((ref) => false);
final sortOptionProvider = StateProvider<SortOption>(
  (ref) => SortOption.newest,
);
final universityFilterProvider = StateProvider<String?>((ref) => null);

/// Client-side only — the repository always orders by created_at desc, so
/// "newest" is a no-op and the other options just re-sort the fetched page.
enum SortOption { newest, priceLowHigh, priceHighLow }

extension SortOptionLabel on SortOption {
  String get label => switch (this) {
    SortOption.newest => 'Newest',
    SortOption.priceLowHigh => 'Price: Low to high',
    SortOption.priceHighLow => 'Price: High to low',
  };
}

final catalogProductsProvider = FutureProvider<List<Product>>((ref) async {
  final repo = ref.watch(productRepositoryProvider);
  final category = ref.watch(categoryFilterProvider);
  final search = ref.watch(searchQueryProvider);
  final sort = ref.watch(sortOptionProvider);
  final university = ref.watch(universityFilterProvider);

  var products = await repo.fetchActiveProducts(
    category: category,
    search: search,
  );

  if (university != null) {
    products = products.where((p) => p.sellerUniversity == university).toList();
  }

  if (ref.watch(nearMeEnabledProvider)) {
    final position = await ref.watch(currentPositionProvider.future);
    if (position != null) {
      final locationService = ref.watch(locationServiceProvider);
      final withDistance =
          products
              .where((p) => p.latitude != null && p.longitude != null)
              .toList()
            ..sort((a, b) {
              final da = locationService.distanceKm(
                position.latitude,
                position.longitude,
                a.latitude!,
                a.longitude!,
              );
              final db = locationService.distanceKm(
                position.latitude,
                position.longitude,
                b.latitude!,
                b.longitude!,
              );
              return da.compareTo(db);
            });
      final withoutLocation = products.where(
        (p) => p.latitude == null || p.longitude == null,
      );
      return [...withDistance, ...withoutLocation];
    }
  }

  switch (sort) {
    case SortOption.newest:
      return products;
    case SortOption.priceLowHigh:
      return [...products]..sort((a, b) => a.price.compareTo(b.price));
    case SortOption.priceHighLow:
      return [...products]..sort((a, b) => b.price.compareTo(a.price));
  }
});
