import imageCompression from "browser-image-compression";

// Product thumbnails — smaller, optimised for catalog browsing
export async function compressProductImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1200,
    initialQuality: 0.82,
    useWebWorker: true,
    fileType: "image/webp",
  });
}

// Hero / slider banners — wider canvas, slightly larger budget for detail
export async function compressSlideImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1600,
    initialQuality: 0.85,
    useWebWorker: true,
    fileType: "image/webp",
  });
}
