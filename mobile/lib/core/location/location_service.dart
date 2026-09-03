import 'package:geolocator/geolocator.dart';

/// Thin wrapper around geolocator — "when in use" permission only, no
/// background tracking (see the plan's location design). Used for pinning a
/// listing's pickup point and for client-side "near me" distance sorting;
/// the user's own position is never sent to or stored on the server.
class LocationService {
  /// Returns null if location services are off or permission was refused —
  /// callers should treat that as "location unavailable" and degrade
  /// gracefully (skip the near-me sort, let the seller type a location by
  /// hand) rather than blocking the flow.
  Future<Position?> getCurrentPosition() async {
    if (!await Geolocator.isLocationServiceEnabled()) return null;

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return null;
    }

    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium),
    );
  }

  double distanceKm(double lat1, double lon1, double lat2, double lon2) {
    return Geolocator.distanceBetween(lat1, lon1, lat2, lon2) / 1000;
  }
}
