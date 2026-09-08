/**
 * EzTalk Image Compressor Utility
 * High-performance client-side image compression using native HTML5 Canvas
 * Reduces file sizes 4x-8x before upload, conserving bandwidth and memory.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  format?: 'image/webp' | 'image/jpeg';
}

export interface CompressionResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
}

export async function compressImage(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    format = 'image/webp',
  } = options;

  return new Promise((resolve, reject) => {
    // If SVG or animated GIF, don't compress via canvas to avoid losing vector/animation
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          blob: file,
          dataUrl: reader.result as string,
          width: 0,
          height: 0,
          originalSize: file.size,
          compressedSize: file.size,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Maintain aspect ratio
      if (width > maxWidth || height > maxHeight) {
        if (width / maxWidth > height / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Canvas 2D context unavailable'));
      }

      // Smooth resampling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const exportFormat = format;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            // Fallback to jpeg if webp canvas export failed
            canvas.toBlob(
              (fallbackBlob) => {
                if (!fallbackBlob) return reject(new Error('Image compression failed'));
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve({
                  blob: fallbackBlob,
                  dataUrl,
                  width,
                  height,
                  originalSize: file.size,
                  compressedSize: fallbackBlob.size,
                });
              },
              'image/jpeg',
              quality
            );
            return;
          }

          const dataUrl = canvas.toDataURL(exportFormat, quality);
          resolve({
            blob,
            dataUrl,
            width,
            height,
            originalSize: file.size,
            compressedSize: blob.size,
          });
        },
        exportFormat,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = url;
  });
}

/**
 * Helper to compress avatars to compact 400x400 dataURL or webp blob
 */
export async function compressAvatar(file: File | Blob): Promise<string> {
  const result = await compressImage(file, {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.85,
    format: 'image/webp',
  });
  return result.dataUrl;
}
