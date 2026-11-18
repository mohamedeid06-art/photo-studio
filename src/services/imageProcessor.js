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
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('تعذر قراءة بيانات الصورة'));
    };
    img.src = url;
  });
}

/**
 * Converts an HTMLCanvasElement into a PNG Blob.
 */
export function canvasToPngBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
  });
}

/**
 * Reconstructs & protects the person's neck, collar, shoulders, upper chest (الجسم والكتفين),
 * and hijab/ghutra from the ORIGINAL image whenever @imgly/background-removal over-erases them,
 * AND smoothly extends the shoulders/chest downward if the original photo is a tightly-cropped
 * passport scan (like 20.A18115760) that ends right below the chin.
 *
 * @param {HTMLImageElement} originalImage - Raw original image
 * @param {HTMLImageElement} cutoutImage - AI background-removed transparent image
 * @param {Object|null} faceBox - Detected face boundingBox in originalImage coordinates
 * @returns {Promise<{ blob: Blob, image: HTMLImageElement, faceBoxInCutout: Object }>}
 */
export async function reconstructSubjectWithBodyAndShoulders(
  originalImage,
  cutoutImage,
  faceBox
) {
  const cutW = cutoutImage.naturalWidth || cutoutImage.width;
  const cutH = cutoutImage.naturalHeight || cutoutImage.height;
  const origW = originalImage.naturalWidth || originalImage.width;
  const origH = originalImage.naturalHeight || originalImage.height;

  // Draw originalImage scaled to (cutW, cutH)
  const origCanvas = document.createElement('canvas');
  origCanvas.width = cutW;
  origCanvas.height = cutH;
  const origCtx = origCanvas.getContext('2d', { willReadFrequently: true });
  origCtx.imageSmoothingEnabled = true;
  origCtx.imageSmoothingQuality = 'high';
  origCtx.drawImage(originalImage, 0, 0, cutW, cutH);
  const origData = origCtx.getImageData(0, 0, cutW, cutH).data;

  // Draw AI cutoutImage at (cutW, cutH)
  const cutCanvas = document.createElement('canvas');
  cutCanvas.width = cutW;
  cutCanvas.height = cutH;
  const cutCtx = cutCanvas.getContext('2d', { willReadFrequently: true });
  cutCtx.drawImage(cutoutImage, 0, 0, cutW, cutH);
  const cutImgData = cutCtx.getImageData(0, 0, cutW, cutH);
  const cutData = cutImgData.data;

  // Map face coordinates into (cutW, cutH) space
  const scaleX = cutW / origW;
  const scaleY = cutH / origH;

  let faceCenterX = cutW * 0.5;
  let faceTopY = cutH * 0.25;
  let faceBottomY = cutH * 0.80;
  let faceW = cutW * 0.62;
  let faceH = cutH * 0.55;

  if (faceBox) {
    faceW = faceBox.width * scaleX;
    faceH = faceBox.height * scaleY;
    faceCenterX = (faceBox.originX + faceBox.width / 2) * scaleX;
    faceTopY = faceBox.originY * scaleY;
    faceBottomY = (faceBox.originY + faceBox.height) * scaleY;
  }

  const estimatedCrownY = Math.max(0, faceTopY - faceH * 0.34);
  const fullHeadHeight = Math.max(faceH * 1.2, faceBottomY - estimatedCrownY);

  // Check if AI cutout stripped away the headscarf/hijab around the cheeks/ears
  const checkY = Math.min(cutH - 1, Math.max(0, Math.round(faceTopY + faceH * 0.65)));
  let maskLeftX = cutW,
    maskRightX = 0;
  for (let x = 0; x < cutW; x++) {
    if (cutData[(checkY * cutW + x) * 4 + 3] > 80) {
      if (x < maskLeftX) maskLeftX = x;
      if (x > maskRightX) maskRightX = x;
    }
  }
  const midFaceMaskWidth = maskRightX > maskLeftX ? maskRightX - maskLeftX : 0;
  const needsHeadwearRecovery = midFaceMaskWidth < faceW * 1.28;

  // Step 1: Unconditionally restore Anatomical Neck, Collar, Shoulders & Hijab from originalImage
  // Start neck/shoulder dome above the jawline (faceBottomY - 0.22 * faceH) so jacket/hijab
  // meeting the cheeks/beard is 100% preserved!
  const neckStartY = Math.max(0, faceBottomY - faceH * 0.22);
  const featherWidthPx = Math.max(8, faceW * 0.08);

  for (let y = Math.round(estimatedCrownY); y < cutH; y++) {
    let anatomicalHalfW = 0;

    if (y >= neckStartY) {
      // Rapid, smooth anatomical shoulder slope from jawline/neck out to the shoulders
      const dy = y - neckStartY;
      const shoulderProgress = Math.min(1, dy / (faceH * 0.28));
      const baseNeckFactor = needsHeadwearRecovery ? 0.78 : 0.58;
      // Expands to 1.75 * faceW half-width (3.5x face width total across both shoulders)
      const shoulderExpansion = 1.15 * Math.sin(shoulderProgress * (Math.PI / 2));
      anatomicalHalfW = faceW * (baseNeckFactor + shoulderExpansion);
    } else if (needsHeadwearRecovery && y >= estimatedCrownY) {
      // Headscarf / Hijab / Ghutra protective dome around forehead, cheeks & jaw
      const headProgress = (y - estimatedCrownY) / Math.max(1, neckStartY - estimatedCrownY);
      const domeArch = Math.sin(Math.min(1, headProgress * 0.85 + 0.15) * (Math.PI / 2));
      anatomicalHalfW = faceW * (0.78 * domeArch);
    }

    if (anatomicalHalfW <= 0) continue;

    for (let x = 0; x < cutW; x++) {
      const idx = (y * cutW + x) * 4;
      const currentAlpha = cutData[idx + 3];
      if (currentAlpha >= 250) continue;

      const distFromCenter = Math.abs(x - faceCenterX);
      if (distFromCenter > anatomicalHalfW) continue;

      const distFromEdge = anatomicalHalfW - distFromCenter;
      let targetAnatomicalAlpha = 255;
      if (distFromEdge < featherWidthPx) {
        targetAnatomicalAlpha = Math.round((distFromEdge / featherWidthPx) * 255);
      }

      if (targetAnatomicalAlpha > currentAlpha) {
        cutData[idx] = origData[idx];
        cutData[idx + 1] = origData[idx + 1];
        cutData[idx + 2] = origData[idx + 2];
        cutData[idx + 3] = targetAnatomicalAlpha;
      }
    }
  }

  cutCtx.putImageData(cutImgData, 0, 0);
  origCanvas.width = 0;
  origCanvas.height = 0;

  // Step 2: Check if the original photo is a tightly-cropped passport scan that cuts off right below the chin!
  // We guarantee at least 0.55 * fullHeadHeight of body/chest (الجسم والكتفين) below faceBottomY.
  const existingBodyBelowChin = Math.max(0, cutH - faceBottomY);
  const desiredBodyBelowChin = fullHeadHeight * 0.55;

  let finalCanvas = cutCanvas;

  if (existingBodyBelowChin < desiredBodyBelowChin * 0.92) {
    // Tightly-cropped passport scan detected (like 20.A18115760)!
    // Extend the canvas downward and smoothly continue the person's shoulders & collar/chest
    const extraHeight = Math.round(desiredBodyBelowChin - existingBodyBelowChin);
    const extendedH = cutH + extraHeight;

    const extCanvas = document.createElement('canvas');
    extCanvas.width = cutW;
    extCanvas.height = extendedH;
    const extCtx = extCanvas.getContext('2d', { willReadFrequently: true });

    extCtx.drawImage(cutCanvas, 0, 0);
    const extImgData = extCtx.getImageData(0, 0, cutW, extendedH);
    const extData = extImgData.data;

    // Sample strip near the bottom of cutCanvas (avoiding the bottom 2% edge artifact)
    const sampleY = Math.max(
      Math.round(faceBottomY),
      cutH - Math.max(4, Math.round(cutH * 0.03))
    );
    const bottomShoulderHalfW = faceW * 1.72;

    for (let y = cutH; y < extendedH; y++) {
      const extProgress = (y - cutH) / Math.max(1, extraHeight);
      const rowSpread = 1 + extProgress * 0.14;
      const rowHalfW = bottomShoulderHalfW * rowSpread;
      const shadeFactor = 1 - extProgress * 0.05;

      for (let x = 0; x < cutW; x++) {
        const distFromCenter = Math.abs(x - faceCenterX);
        if (distFromCenter > rowHalfW) continue;

        const mappedX = Math.min(
          cutW - 1,
          Math.max(0, Math.round(faceCenterX + (x - faceCenterX) / rowSpread))
        );

        let sumR = 0,
          sumG = 0,
          sumB = 0,
          sumA = 0,
          count = 0;
        for (let dx = -2; dx <= 2; dx++) {
          const sx = Math.min(cutW - 1, Math.max(0, mappedX + dx));
          const sIdx = (sampleY * cutW + sx) * 4;
          sumR += extData[sIdx];
          sumG += extData[sIdx + 1];
          sumB += extData[sIdx + 2];
          sumA += extData[sIdx + 3];
          count++;
        }

        const distFromEdge = rowHalfW - distFromCenter;
        let edgeAlpha = Math.round(sumA / count);
        if (distFromEdge < featherWidthPx) {
          edgeAlpha = Math.min(edgeAlpha, Math.round((distFromEdge / featherWidthPx) * 255));
        }

        const dstIdx = (y * cutW + x) * 4;
        extData[dstIdx] = Math.round((sumR / count) * shadeFactor);
        extData[dstIdx + 1] = Math.round((sumG / count) * shadeFactor);
        extData[dstIdx + 2] = Math.round((sumB / count) * shadeFactor);
        extData[dstIdx + 3] = edgeAlpha;
      }
    }

    extCtx.putImageData(extImgData, 0, 0);
    cutCanvas.width = 0;
    cutCanvas.height = 0;
    finalCanvas = extCanvas;
  }

  const reconstructedBlob = await canvasToPngBlob(finalCanvas);
  finalCanvas.width = 0;
  finalCanvas.height = 0;

  const reconstructedImg = await loadImageFromBlob(reconstructedBlob);

  return {
    blob: reconstructedBlob,
    image: reconstructedImg,
    faceBoxInCutout: {
      originX: faceCenterX - faceW / 2,
      originY: faceTopY,
      width: faceW,
      height: faceH,
    },
  };
}

/**
 * Applies a 3x3 sharpening convolution filter to ImageData for fixing soft/blurry WhatsApp photos.
 */
function applySharpnessFilter(imageData, sharpnessPercent) {
  if (!sharpnessPercent || sharpnessPercent <= 0) return imageData;

  const amount = (sharpnessPercent / 100) * 0.45;
  const w = imageData.width;
  const h = imageData.height;
  const src = imageData.data;
  const dst = new Uint8ClampedArray(src);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
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

  const passes = edgeSmoothingPx >= 2.5 ? 2 : 1;
  const currentAlpha = new Uint8Array(alphaCopy);
  const nextAlpha = new Uint8Array(w * h);

  for (let pass = 0; pass < passes; pass++) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        const centerA = currentAlpha[p];
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
 * if an extremely uniform image compresses below the KSA Ministry 15 KB minimum limit.
 */
async function ensureMinimumJpegSize(jpegBlob, minSizeKB) {
  const minBytes = Math.round((minSizeKB + 2) * 1024);
  if (jpegBlob.size >= minSizeKB * 1024) {
    return jpegBlob;
  }

  const buffer = await jpegBlob.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return jpegBlob;
  }

  const neededPadding = Math.min(48000, Math.max(1024, minBytes - bytes.length));
  const payloadLength = neededPadding;
  const segmentLength = payloadLength + 2;
  const comSegment = new Uint8Array(4 + payloadLength);
  comSegment[0] = 0xff;
  comSegment[1] = 0xfe;
  comSegment[2] = (segmentLength >> 8) & 0xff;
  comSegment[3] = segmentLength & 0xff;

  for (let i = 0; i < payloadLength; i++) {
    comSegment[4 + i] = 0x4b + (i % 26);
  }

  const output = new Uint8Array(bytes.length + comSegment.length);
  output.set(bytes.subarray(0, 2), 0);
  output.set(comSegment, 2);
  output.set(bytes.subarray(2), 2 + comSegment.length);

  return new Blob([output], { type: 'image/jpeg' });
}

/**
 * Smart JPEG Compression Loop using Iterative Binary Search.
 */
export async function compressCanvasToTargetBounds(canvas, minSizeKB = 15, maxSizeKB = 200) {
  const minBytes = minSizeKB * 1024;
  const maxBytes = maxSizeKB * 1024;

  let bestBlob = await canvasToJpegBlob(canvas, 0.95);
  let bestQuality = 0.95;

  if (bestBlob.size <= maxBytes && bestBlob.size >= minBytes) {
    return {
      blob: bestBlob,
      quality: bestQuality,
      sizeKB: Number((bestBlob.size / 1024).toFixed(1)),
    };
  }

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
      low = mid;
    } else {
      high = mid;
    }
  }

  if (!candidateBlob) {
    candidateBlob = await canvasToJpegBlob(canvas, 0.35);
    candidateQuality = 0.35;
  }

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
 * Renders the reconstructed transparent cutout (with full shoulders & body)
 * onto an HTML5 <canvas> with target passport dimensions, pure white #FFFFFF background,
 * and Smart JPEG Compression Loop.
 */
export async function renderPassportPhoto(cutoutSource, cropBox, settings) {
  const targetW = Math.max(100, Math.round(Number(settings.width) || 600));
  const targetH = Math.max(100, Math.round(Number(settings.height) || 600));
  const brightness = Number(settings.brightness ?? 100);
  const contrast = Number(settings.contrast ?? 100);
  const sharpness = Number(settings.sharpness ?? 15);
  const edgeSmoothing = Number(settings.edgeSmoothing ?? 1.5);
  const rotationDeg = Number(settings.rotation ?? 0);
  const minSizeKB = Math.max(1, Number(settings.minSizeKB ?? 15));
  const maxSizeKB = Math.max(minSizeKB + 10, Number(settings.maxSizeKB ?? 200));

  const srcW = cutoutSource.naturalWidth || cutoutSource.width;
  const srcH = cutoutSource.naturalHeight || cutoutSource.height;

  const subjectCanvas = document.createElement('canvas');
  subjectCanvas.width = targetW;
  subjectCanvas.height = targetH;
  const subjectCtx = subjectCanvas.getContext('2d', { willReadFrequently: true });

  subjectCtx.imageSmoothingEnabled = true;
  subjectCtx.imageSmoothingQuality = 'high';

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

  const destX = -cropBox.x * scaleX;
  const destY = -cropBox.y * scaleY;
  const destW = srcW * scaleX;
  const destH = srcH * scaleY;

  subjectCtx.drawImage(cutoutSource, destX, destY, destW, destH);
  subjectCtx.restore();
  subjectCtx.filter = 'none';

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

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetW;
  finalCanvas.height = targetH;
  const finalCtx = finalCanvas.getContext('2d');

  finalCtx.fillStyle = '#FFFFFF';
  finalCtx.fillRect(0, 0, targetW, targetH);
  finalCtx.imageSmoothingEnabled = true;
  finalCtx.imageSmoothingQuality = 'high';
  finalCtx.drawImage(subjectCanvas, 0, 0);

  subjectCanvas.width = 0;
  subjectCanvas.height = 0;

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
