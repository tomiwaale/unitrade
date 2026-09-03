import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import 'location_service.dart';

final locationServiceProvider = Provider<LocationService>((ref) => LocationService());

/// Cached for the app session — re-fetched only when explicitly invalidated
/// (e.g. toggling "near me" back on) rather than on every rebuild.
final currentPositionProvider = FutureProvider<Position?>((ref) {
  return ref.watch(locationServiceProvider).getCurrentPosition();
});
