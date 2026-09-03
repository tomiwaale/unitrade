import 'dart:typed_data';

import 'package:flutter_image_compress/flutter_image_compress.dart';

/// Client-side compression before upload — mirrors
/// lib/compress-image.ts (browser-image-compression) on the web, keeping
/// uploads well under the 5 MB storage bucket limit (005_storage_product_images.sql).
Future<Uint8List> compressImageBytes(Uint8List bytes) {
  return FlutterImageCompress.compressWithList(
    bytes,
    minWidth: 1440,
    minHeight: 1440,
    quality: 75,
  );
}
