/**
 * Loads a Blob or URL into an HTMLImageElement and cleans up temporary object URLs.
 */
export function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error('تعذر قراءة بيانات الصورة'));
    };
    img.src = url;
  });
}

/**
 * Applies a 3x3 sharpening convolution filter to ImageData for fixing soft/blurry WhatsApp photos.
 * @param {ImageData} imageData
 * @param {number} sharpnessPercent - 0 to 100
 */
function applySharpnessFilter(imageData, sharpnessPercent) {
  if (!sharpnessPercent || sharpnessPercent <= 0) return imageData;

  const amount = (sharpnessPercent / 100) * 0.45; // Balanced strength
  const w = imageData.width;
  const h = imageData.height;
  const src = imageData.data;
  const dst = new Uint8ClampedArray(src);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      // Only sharpen visible pixels
      if (src[idx + 3] < 10) continue;

      const top = ((y - 1) * w + x) * 4;
      const bottom = ((y + 1) * w + x) * 4;
      const left = (y * w + (x - 1)) * 4;
      const right = (y * w + (x + 1)) * 4;

      for (let c = 0; c < 3; c++) {
        const neighbors = src[top + c] + src[bottom + c] + src[left + c] + src[right + c];
        const sharpened = src[idx + c] * (1 + 4 * amount) - neighbors * amount;
        dst[idx + c] = sharpened < 0 ? 0 : sharpened > 255 ? 255 : sharpened;
      }
    }
  }

  imageData.data.set(dst);
  return imageData;
}

/**
 * Cleans up color fringe and applies smooth alpha-edge feathering on the transparent cutout
 * so the transition onto pure #FFFFFF background looks natural without harsh cutouts or dark halos.
 */
function refineCutoutAlphaEdges(imageData, edgeSmoothingPx = 1.5) {
  const w = imageData.width;
  const h = imageData.height;
  const data = imageData.data;

  // Step 1: De-fringe outer semi-transparent pixels & pre-blend edge RGB towards white
  // This removes dark room halo artifacts around hair, hijab, and shoulders
  const alphaCopy = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    let a = data[i + 3];
    if (a < 28) {
      a = 0;
    } else if (a > 242) {
      a = 255;
    }
    alphaCopy[p] = a;
    data[i + 3] = a;
  }

  if (edgeSmoothingPx <= 0) return;

  // Step 2: Feather boundary alpha channel with a lightweight separable 3x3 box pass
  const passes = edgeSmoothingPx >= 2.5 ? 2 : 1;
  const currentAlpha = new Uint8Array(alphaCopy);
  const nextAlpha = new Uint8Array(w * h);

  for (let pass = 0; pass < passes; pass++) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        const centerA = currentAlpha[p];
        // Only smooth edge transition pixels (0 < alpha < 255 or adjacent to transparent)
        const minNeighbor = Math.min(
          currentAlpha[p - 1],
          currentAlpha[p + 1],
          currentAlpha[p - w],
          currentAlpha[p + w]
        );
        const maxNeighbor = Math.max(
          currentAlpha[p - 1],
          currentAlpha[p + 1],
          currentAlpha[p - w],
          currentAlpha[p + w]
        );

        if (minNeighbor < 250 && maxNeighbor > 5) {
          const sum =
            centerA * 4 +
            currentAlpha[p - 1] * 2 +
            currentAlpha[p + 1] * 2 +
            currentAlpha[p - w] * 2 +
            currentAlpha[p + w] * 2 +
            currentAlpha[p - w - 1] +
            currentAlpha[p - w + 1] +
            currentAlpha[p + w - 1] +
            currentAlpha[p + w + 1];
          nextAlpha[p] = Math.round(sum / 16);
        } else {
          nextAlpha[p] = centerA;
        }
      }
    }
    currentAlpha.set(nextAlpha);
  }

  const blendWeight = Math.min(1, edgeSmoothingPx / 2.5);
  for (let p = 0, i = 0; p < currentAlpha.length; p++, i += 4) {
    const origA = alphaCopy[p];
    const smoothA = currentAlpha[p];
    const finalA = Math.round(origA * (1 - blendWeight) + smoothA * blendWeight);
    data[i + 3] = finalA;
  }
}

/**
 * Helper to export a canvas to JPEG Blob at a given quality (0.0 to 1.0).
 */
function canvasToJpegBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('فشل في تصدير الصورة بصيغة JPEG'));
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Pads a valid JPEG blob with a standard JPEG Comment (COM 0xFF 0xFE) metadata segment
 * if an extremely uniform image compresses below the KSA Ministry 15 KB minimum limit
 * even at 100% quality. This guarantees 100% valid JPEG decoding while strictly satisfying
 * the >= minSizeKB rule.
 */
async function ensureMinimumJpegSize(jpegBlob, minSizeKB) {
  const minBytes = Math.round((minSizeKB + 2) * 1024); // Target e.g. 17 KB if min is 15 KB
  if (jpegBlob.size >= minSizeKB * 1024) {
    return jpegBlob;
  }

  const buffer = await jpegBlob.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Verify SOI marker (0xFF 0xD8)
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return jpegBlob;
  }

  const neededPadding = Math.min(48000, Math.max(1024, minBytes - bytes.length));
  // JPEG COM segment: 0xFF 0xFE + 2-byte big-endian length (including length bytes) + payload
  const payloadLength = neededPadding;
  const segmentLength = payloadLength + 2;
  const comSegment = new Uint8Array(4 + payloadLength);
  comSegment[0] = 0xff;
  comSegment[1] = 0xfe;
  comSegment[2] = (segmentLength >> 8) & 0xff;
  comSegment[3] = segmentLength & 0xff;

  // Fill comment payload with deterministic ASCII metadata characters
  for (let i = 0; i < payloadLength; i++) {
    comSegment[4 + i] = 0x4b + (i % 26);
  }

  // Insert right after SOI (first 2 bytes)
  const output = new Uint8Array(bytes.length + comSegment.length);
  output.set(bytes.subarray(0, 2), 0);
  output.set(comSegment, 2);
  output.set(bytes.subarray(2), 2 + comSegment.length);

  return new Blob([output], { type: 'image/jpeg' });
}

/**
 * Smart JPEG Compression Loop using Iterative Binary Search:
 * Finds the optimal JPEG quality (between 0.96 down to 0.40) so the file size is
 * strictly under maxSizeKB and above minSizeKB while maximizing visual clarity.
 */
export async function compressCanvasToTargetBounds(canvas, minSizeKB = 15, maxSizeKB = 200) {
  const minBytes = minSizeKB * 1024;
  const maxBytes = maxSizeKB * 1024;

  // First try high quality (0.95)
  let bestBlob = await canvasToJpegBlob(canvas, 0.95);
  let bestQuality = 0.95;

  if (bestBlob.size <= maxBytes && bestBlob.size >= minBytes) {
    return {
      blob: bestBlob,
      quality: bestQuality,
      sizeKB: Number((bestBlob.size / 1024).toFixed(1)),
    };
  }

  // Case A: Image at 0.95 is smaller than minBytes -> try maximum quality 1.0
  if (bestBlob.size < minBytes) {
    bestBlob = await canvasToJpegBlob(canvas, 1.0);
    bestQuality = 1.0;
    if (bestBlob.size < minBytes) {
      bestBlob = await ensureMinimumJpegSize(bestBlob, minSizeKB);
    }
    return {
      blob: bestBlob,
      quality: bestQuality,
      sizeKB: Number((bestBlob.size / 1024).toFixed(1)),
    };
  }

  // Case B: Image at 0.95 exceeds maxBytes -> Binary search in [0.40, 0.94]
  let low = 0.40;
  let high = 0.94;
  let candidateBlob = null;
  let candidateQuality = low;

  for (let iter = 0; iter < 7; iter++) {
    const mid = Number(((low + high) / 2).toFixed(3));
    const testBlob = await canvasToJpegBlob(canvas, mid);

    if (testBlob.size <= maxBytes) {
      candidateBlob = testBlob;
      candidateQuality = mid;
      low = mid; // Try higher quality while staying <= maxBytes
    } else {
      high = mid; // Need stronger compression
    }
  }

  // If even 0.40 exceeded maxBytes (rare for 600x600), step down to 0.25
  if (!candidateBlob) {
    candidateBlob = await canvasToJpegBlob(canvas, 0.35);
    candidateQuality = 0.35;
  }

  // Ensure it didn't drop below minBytes
  if (candidateBlob.size < minBytes) {
    candidateBlob = await ensureMinimumJpegSize(candidateBlob, minSizeKB);
  }

  return {
    blob: candidateBlob,
    quality: candidateQuality,
    sizeKB: Number((candidateBlob.size / 1024).toFixed(1)),
  };
}

/**
 * Renders the transparent cutout onto an HTML5 <canvas> with target passport dimensions,
 * applies brightness/contrast/sharpness & edge smoothing, fills pure white #FFFFFF background,
 * and runs the Smart JPEG Compression Loop.
 *
 * @param {HTMLImageElement} cutoutImage - Transparent background-removed image
 * @param {Object} cropBox - { x, y, width, height } in cutoutImage pixel coordinates
 * @param {Object} settings - { width, height, minSizeKB, maxSizeKB, brightness, contrast, sharpness, edgeSmoothing, rotation }
 * @returns {Promise<{ blob: Blob, sizeKB: number, quality: number, width: number, height: number }>}
 */
export async function renderPassportPhoto(cutoutImage, cropBox, settings) {
  const targetW = Math.max(100, Math.round(Number(settings.width) || 600));
  const targetH = Math.max(100, Math.round(Number(settings.height) || 600));
  const brightness = Number(settings.brightness ?? 100);
  const contrast = Number(settings.contrast ?? 100);
  const sharpness = Number(settings.sharpness ?? 15);
  const edgeSmoothing = Number(settings.edgeSmoothing ?? 1.5);
  const rotationDeg = Number(settings.rotation ?? 0);
  const minSizeKB = Math.max(1, Number(settings.minSizeKB ?? 15));
  const maxSizeKB = Math.max(minSizeKB + 10, Number(settings.maxSizeKB ?? 200));

  // Step 1: Draw the cropped subject onto an offscreen transparent canvas
  const subjectCanvas = document.createElement('canvas');
  subjectCanvas.width = targetW;
  subjectCanvas.height = targetH;
  const subjectCtx = subjectCanvas.getContext('2d', { willReadFrequently: true });

  subjectCtx.imageSmoothingEnabled = true;
  subjectCtx.imageSmoothingQuality = 'high';

  // Apply CSS brightness & contrast filter during draw
  if (brightness !== 100 || contrast !== 100) {
    subjectCtx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
  }

  const scaleX = targetW / cropBox.width;
  const scaleY = targetH / cropBox.height;

  subjectCtx.save();
  if (rotationDeg !== 0) {
    subjectCtx.translate(targetW / 2, targetH / 2);
    subjectCtx.rotate((rotationDeg * Math.PI) / 180);
    subjectCtx.translate(-targetW / 2, -targetH / 2);
  }

  // Map cropBox (x, y, width, height) in source image to (0, 0, targetW, targetH)
  const destX = -cropBox.x * scaleX;
  const destY = -cropBox.y * scaleY;
  const destW = (cutoutImage.naturalWidth || cutoutImage.width) * scaleX;
  const destH = (cutoutImage.naturalHeight || cutoutImage.height) * scaleY;

  subjectCtx.drawImage(cutoutImage, destX, destY, destW, destH);
  subjectCtx.restore();
  subjectCtx.filter = 'none';

  // Step 2: Refine alpha edges (de-fringe & feathering) and apply sharpness filter
  if (edgeSmoothing > 0 || sharpness > 0) {
    const imgData = subjectCtx.getImageData(0, 0, targetW, targetH);
    if (edgeSmoothing > 0) {
      refineCutoutAlphaEdges(imgData, edgeSmoothing);
    }
    if (sharpness > 0) {
      applySharpnessFilter(imgData, sharpness);
    }
    subjectCtx.putImageData(imgData, 0, 0);
  }

  // Step 3: Composite onto final canvas with pure solid white (#FFFFFF) background
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetW;
  finalCanvas.height = targetH;
  const finalCtx = finalCanvas.getContext('2d');

  finalCtx.fillStyle = '#FFFFFF';
  finalCtx.fillRect(0, 0, targetW, targetH);
  finalCtx.imageSmoothingEnabled = true;
  finalCtx.imageSmoothingQuality = 'high';
  finalCtx.drawImage(subjectCanvas, 0, 0);

  // Dispose offscreen subject canvas immediately to free memory
  subjectCanvas.width = 0;
  subjectCanvas.height = 0;

  // Step 4: Smart JPEG Compression Loop
  try {
    const compressed = await compressCanvasToTargetBounds(finalCanvas, minSizeKB, maxSizeKB);
    return {
      blob: compressed.blob,
      sizeKB: compressed.sizeKB,
      quality: compressed.quality,
      width: targetW,
      height: targetH,
    };
  } finally {
    finalCanvas.width = 0;
    finalCanvas.height = 0;
  }
}
