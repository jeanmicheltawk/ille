/**
 * Downscale + re-encode an image in the browser before upload.
 *
 * Camera/phone photos are often 5–15 MB. Uploading many of them at once
 * overwhelms the (memory-limited) API host and makes uploads slow/unreliable.
 * Shrinking them client-side to a sane max dimension + JPEG quality keeps
 * uploads small and fast without any noticeable quality loss for the site.
 */

export interface CompressOptions {
  /** Longest edge in pixels. Larger images are scaled down to fit. */
  maxDimension?: number;
  /** JPEG quality, 0–1. */
  quality?: number;
  /** Skip compression for files already under this size (bytes). */
  skipUnderBytes?: number;
}

const DEFAULTS: Required<CompressOptions> = {
  maxDimension: 2200,
  quality: 0.82,
  skipUnderBytes: 300 * 1024,
};

/** Formats we can safely re-encode via canvas. Animated GIFs are left alone. */
const COMPRESSIBLE = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const { maxDimension, quality, skipUnderBytes } = { ...DEFAULTS, ...opts };

  if (!COMPRESSIBLE.has(file.type)) return file;
  if (file.size <= skipUnderBytes) return file;

  try {
    const bitmap = await loadBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxDimension);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close();

    const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.(png|webp|gif|bmp|tiff?)$/i, '.jpg');
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    // On any failure, fall back to the original file so uploads still work.
    return file;
  }
}

function fitWithin(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h };
  const scale = Math.min(max / w, max / h);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through to the <img> path
    }
  }
  return await loadImageElement(file);
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}
