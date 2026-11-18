import { removeBackground } from '@imgly/background-removal';

let isModelCachedInSession = false;

/**
 * Samples the clean background paper color from the brightest pixels in the top corners
 * (ignoring dark passport stamp ink on the top-left).
 */
function sampleTopCornerPaperColor(ctx, w, h) {
  const sampleW = Math.max(8, Math.round(w * 0.22));
  const sampleH = Math.max(8, Math.round(h * 0.22));
  const { data } = ctx.getImageData(0, 0, w, sampleH);

  const samples = [];
  for (let y = 0; y < sampleH; y += 2) {
    for (let x = 0; x < w; x += 2) {
      if (x < sampleW || x >= w - sampleW) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        samples.push({ r, g, b, luma });
      }
    }
  }

  if (samples.length === 0) return { r: 242, g: 242, b: 242 };

  // Sort brightest first to skip dark passport eagle stamp ink
  samples.sort((a, b) => b.luma - a.luma);
  const topCount = Math.max(1, Math.round(samples.length * 0.35));
  let sumR = 0,
    sumG = 0,
    sumB = 0;
  for (let i = 0; i < topCount; i++) {
    sumR += samples[i].r;
    sumG += samples[i].g;
    sumB += samples[i].b;
  }

  return {
    r: Math.round(sumR / topCount),
    g: Math.round(sumG / topCount),
    b: Math.round(sumB / topCount),
  };
}

/**
 * Prepares an image for @imgly/background-removal by:
 * 1. Normalizing resolution to crisp HD (800px..1400px).
 * 2. Adding outer padding (18% top/left/right filled with background paper color,
 *    and 24% bottom filled with a vertical mirror reflection of the shoulders/chest).
 * Why? When a tight passport scan has shoulders/hijab touching the image borders,
 * ISNet's border-background prior mistakenly erases the shoulders and outer hijab.
 * Padding moves the shoulders and hijab away from the tensor borders so ISNet segments
 * the full person (head, hijab, collar, and shoulders) accurately!
 */
async function preparePaddedSourceForAI(imageBlob, minDimension = 800, maxDimension = 1400) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(imageBlob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;
      const maxSide = Math.max(origW, origH);

      let scale = 1;
      if (maxSide < minDimension) scale = minDimension / maxSide;
      else if (maxSide > maxDimension) scale = maxDimension / maxSide;

      const innerW = Math.round(origW * scale);
      const innerH = Math.round(origH * scale);

      // Draw scaled inner image first to sample its corner paper color
      const innerCanvas = document.createElement('canvas');
      innerCanvas.width = innerW;
      innerCanvas.height = innerH;
      const innerCtx = innerCanvas.getContext('2d', { willReadFrequently: true });
      innerCtx.imageSmoothingEnabled = true;
      innerCtx.imageSmoothingQuality = 'high';
      innerCtx.drawImage(img, 0, 0, innerW, innerH);

      const paperColor = sampleTopCornerPaperColor(innerCtx, innerW, innerH);

      const padSide = Math.round(innerW * 0.18);
      const padTop = Math.round(innerH * 0.16);
      const padBottom = Math.round(innerH * 0.25);

      const totalW = innerW + padSide * 2;
      const totalH = innerH + padTop + padBottom;

      const paddedCanvas = document.createElement('canvas');
      paddedCanvas.width = totalW;
      paddedCanvas.height = totalH;
      const ctx = paddedCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Fill background with sampled paper color
      ctx.fillStyle = `rgb(${paperColor.r}, ${paperColor.g}, ${paperColor.b})`;
      ctx.fillRect(0, 0, totalW, totalH);

      // Draw main image in the center
      ctx.drawImage(innerCanvas, padSide, padTop, innerW, innerH);

      // Mirror-reflect the bottom 25% (shoulders & clothing) into the bottom padding zone
      // so the AI sees a continuous torso instead of a sharp cutoff at the bottom border
      ctx.save();
      ctx.translate(padSide, padTop + innerH * 2);
      ctx.scale(1, -1);
      ctx.drawImage(
        innerCanvas,
        0,
        innerH - padBottom,
        innerW,
        padBottom,
        0,
        0,
        innerW,
        padBottom
      );
      ctx.restore();

      innerCanvas.width = 0;
      innerCanvas.height = 0;

      paddedCanvas.toBlob(
        (paddedBlob) => {
          paddedCanvas.width = 0;
          paddedCanvas.height = 0;
          resolve({
            blob: paddedBlob || imageBlob,
            isPadded: Boolean(paddedBlob),
            padSide,
            padTop,
            innerW,
            innerH,
          });
        },
        'image/png',
        1.0
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ blob: imageBlob, isPadded: false });
    };
    img.src = url;
  });
}

/**
 * Crops the padded AI output PNG back to the exact inner (innerW x innerH) region.
 */
async function unpadSegmentedBlob(segmentedBlob, padInfo) {
  if (!padInfo?.isPadded) return segmentedBlob;

  return new Promise((resolve) => {
    const url = URL.createObjectURL(segmentedBlob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = padInfo.innerW;
      canvas.height = padInfo.innerH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        img,
        padInfo.padSide,
        padInfo.padTop,
        padInfo.innerW,
        padInfo.innerH,
        0,
        0,
        padInfo.innerW,
        padInfo.innerH
      );
      canvas.toBlob(
        (croppedBlob) => {
          canvas.width = 0;
          canvas.height = 0;
          resolve(croppedBlob || segmentedBlob);
        },
        'image/png',
        1.0
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(segmentedBlob);
    };
    img.src = url;
  });
}

/**
 * Removes background from an image File/Blob using @imgly/background-removal
 * with intelligent border & mirror-torso padding so shoulders and hijabs are never amputated.
 */
export async function removePhotoBackground(imageFile, onProgress) {
  const padInfo = await preparePaddedSourceForAI(imageFile, 800, 1400);

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

  const rawSegmentedBlob = await removeBackground(padInfo.blob, config);
  isModelCachedInSession = true;

  return unpadSegmentedBlob(rawSegmentedBlob, padInfo);
}

export function getIsModelLoaded() {
  return isModelCachedInSession;
}
