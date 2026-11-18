import { removeBackground } from '@imgly/background-removal';

let isModelCachedInSession = false;

/**
 * Normalizes input image resolution prior to AI segmentation:
 * - Upscales tiny passport scanner crops (e.g. 150x200 px) to at least 800px so
 *   hair, hijab, and shoulder edges are segmented at crisp HD resolution without jagged pixels.
 * - Downscales huge 12MP camera photos (e.g. 4000x3000 px) to 1500px to save RAM.
 */
async function prepareOptimalSourceBlob(imageBlob, minDimension = 800, maxDimension = 1500) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(imageBlob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      const maxSide = Math.max(w, h);

      if (maxSide >= minDimension && maxSide <= maxDimension) {
        resolve(imageBlob);
        return;
      }

      const scale =
        maxSide < minDimension ? minDimension / maxSide : maxDimension / maxSide;
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
 */
export async function removePhotoBackground(imageFile, onProgress) {
  const preparedBlob = await prepareOptimalSourceBlob(imageFile, 800, 1500);

  const config = {
    model: 'medium',
    device: 'cpu',
    output: {
      format: 'image/png',
      quality: 1.0,
    },
    progress: (key, current, total) => {
      if (!onProgress) return;
      const isFetchingModel =
        key && (key.includes('fetch') || key.includes('model') || key.includes('wasm'));
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
