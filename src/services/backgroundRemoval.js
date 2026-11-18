import { removeBackground } from '@imgly/background-removal';

let isModelCachedInSession = false;

/**
 * Downscales extremely large raw camera photos (e.g. 4000x3000) to a reasonable
 * high-definition working resolution (max 1600px) prior to AI segmentation.
 * This preserves 2.5x supersampling detail for 600x600 passport crops while
 * preventing WebAssembly out-of-memory errors when processing 30-50 photos.
 */
async function prepareOptimalSourceBlob(imageBlob, maxDimension = 1600) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(imageBlob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      if (w <= maxDimension && h <= maxDimension) {
        resolve(imageBlob);
        return;
      }

      const scale = maxDimension / Math.max(w, h);
      const targetW = Math.round(w * scale);
      const targetH = Math.round(h * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);

      canvas.toBlob(
        (scaledBlob) => {
          canvas.width = 0;
          canvas.height = 0;
          resolve(scaledBlob || imageBlob);
        },
        'image/png',
        1.0
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(imageBlob);
    };
    img.src = url;
  });
}

/**
 * Removes background from an image File/Blob using @imgly/background-removal
 * configured for high-precision segmentation ('medium' full-precision model).
 *
 * @param {Blob|File} imageFile - Input image file or blob
 * @param {Function} onProgress - Optional callback: ({ phase, percent, isFirstLoad })
 * @returns {Promise<Blob>} Transparent PNG blob of the foreground subject
 */
export async function removePhotoBackground(imageFile, onProgress) {
  const preparedBlob = await prepareOptimalSourceBlob(imageFile, 1600);

  const config = {
    model: 'medium', // High-precision model for accurate hair, hijab, and ghutra edges
    device: 'cpu',   // Reliable cross-browser WASM execution
    output: {
      format: 'image/png',
      quality: 1.0,
    },
    progress: (key, current, total) => {
      if (!onProgress) return;
      const isFetchingModel = key && (key.includes('fetch') || key.includes('model') || key.includes('wasm'));
      const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

      if (isFetchingModel && !isModelCachedInSession) {
        onProgress({
          phase: 'model_download',
          key,
          percent,
          isFirstLoad: true,
        });
      } else {
        onProgress({
          phase: 'inference',
          key,
          percent,
          isFirstLoad: !isModelCachedInSession,
        });
      }
    },
  };

  const resultBlob = await removeBackground(preparedBlob, config);
  isModelCachedInSession = true;
  return resultBlob;
}

export function getIsModelLoaded() {
  return isModelCachedInSession;
}
