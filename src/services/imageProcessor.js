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
 * Studio-Grade Foreground Reconstruction & Shoulder Contour Finishing:
 * 1. Protects the inner facial ellipse (so passport holographic stamps across the forehead/cheek
 *    never cause the AI to punch holes into the face or eyes).
 * 2. Samples BOTH top-corner paper color AND mid-height background paper color (where AI alpha == 0)
 *    so shaded scanner paper near the neck is never mistaken for clothing (eliminating grey shelves).
 * 3. Preserves the central neck/collar core and lower dark/colored clothing from over-erasure.
 * 4. If a narrow 3:4 portrait scan has shoulders cut off vertically at the left/right edges,
 *    naturally curves & slopes the shoulders outward and downward so the subject sits gracefully
 *    inside a 1:1 (600x600) frame without razor-sharp vertical sticker edges or barcode stretching.
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
  let faceW = cutW * 0.60;
  let faceH = cutH * 0.55;

  if (faceBox) {
    faceW = faceBox.width * scaleX;
    faceH = faceBox.height * scaleY;
    faceCenterX = (faceBox.originX + faceBox.width / 2) * scaleX;
    faceTopY = faceBox.originY * scaleY;
    faceBottomY = (faceBox.originY + faceBox.height) * scaleY;
  }

  // Step 1: Sample clean paper color from brightest 35% of top corners
  const cornerH = Math.max(10, Math.round(faceTopY * 0.8));
  const cornerW = Math.max(10, Math.round(cutW * 0.22));
  const cornerSamples = [];

  for (let y = 0; y < cornerH; y += 2) {
    for (let x = 0; x < cutW; x += 2) {
      if (x < cornerW || x >= cutW - cornerW) {
        const idx = (y * cutW + x) * 4;
        const r = origData[idx];
        const g = origData[idx + 1];
        const b = origData[idx + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        cornerSamples.push({ r, g, b, luma });
      }
    }
  }

  let topPaperLuma = 235;
  if (cornerSamples.length > 0) {
    cornerSamples.sort((a, b) => b.luma - a.luma);
    const take = Math.max(1, Math.round(cornerSamples.length * 0.35));
    let sumL = 0;
    for (let i = 0; i < take; i++) sumL += cornerSamples[i].luma;
    topPaperLuma = sumL / take;
  }

  // Also sample local side background color where AI cutout has alpha < 15 at mid-face height
  let sidePaperR = 225,
    sidePaperG = 225,
    sidePaperB = 225,
    sideCount = 0;
  const midYStart = Math.max(0, Math.round(faceTopY));
  const midYEnd = Math.min(cutH - 1, Math.round(faceBottomY));
  for (let y = midYStart; y <= midYEnd; y += 2) {
    for (let x = 0; x < cutW; x += 2) {
      const idx = (y * cutW + x) * 4;
      if (cutData[idx + 3] < 15) {
        sidePaperR += origData[idx];
        sidePaperG += origData[idx + 1];
        sidePaperB += origData[idx + 2];
        sideCount++;
      }
    }
  }
  if (sideCount > 0) {
    sidePaperR = Math.round(sidePaperR / sideCount);
    sidePaperG = Math.round(sidePaperG / sideCount);
    sidePaperB = Math.round(sidePaperB / sideCount);
  }
  const sidePaperLuma = 0.299 * sidePaperR + 0.587 * sidePaperG + 0.114 * sidePaperB;
  const refPaperLuma = Math.min(topPaperLuma, sidePaperLuma);

  // Step 2: Inner Face & Hairline Ellipse Protection (stops holograms punching holes in face/eyes)
  const faceEllipseCenterY = faceTopY + faceH * 0.44;
  const faceEllipseRx = faceW * 0.49;
  const faceEllipseRy = faceH * 0.58;

  const yEllStart = Math.max(0, Math.floor(faceEllipseCenterY - faceEllipseRy));
  const yEllEnd = Math.min(cutH - 1, Math.ceil(faceEllipseCenterY + faceEllipseRy));
  const xEllStart = Math.max(0, Math.floor(faceCenterX - faceEllipseRx));
  const xEllEnd = Math.min(cutW - 1, Math.ceil(faceCenterX + faceEllipseRx));

  for (let y = yEllStart; y <= yEllEnd; y++) {
    const normY = (y - faceEllipseCenterY) / faceEllipseRy;
    for (let x = xEllStart; x <= xEllEnd; x++) {
      const normX = (x - faceCenterX) / faceEllipseRx;
      const d2 = normX * normX + normY * normY;
      if (d2 <= 1.0) {
        const idx = (y * cutW + x) * 4;
        const currA = cutData[idx + 3];
        const targetA = d2 <= 0.85 ? 255 : Math.round(((1.0 - d2) / 0.15) * 255);
        if (targetA > currA) {
          cutData[idx] = origData[idx];
          cutData[idx + 1] = origData[idx + 1];
          cutData[idx + 2] = origData[idx + 2];
          cutData[idx + 3] = targetA;
        }
      }
    }
  }

  // Step 3: Clean Neck, Collar & Lower Clothing Protection (NO grey shoulder-top shelf!)
  const neckStartY = Math.max(0, Math.round(faceBottomY - faceH * 0.02));
  const shoulderSlopesStartY = Math.min(cutH - 1, Math.round(faceBottomY + faceH * 0.14));
  const featherPx = Math.max(5, faceW * 0.05);

  for (let y = neckStartY; y < cutH; y++) {
    const dyFromChin = y - neckStartY;
    const totalTorsoSpan = Math.max(1, cutH - neckStartY);
    const torsoProgress = Math.min(1, dyFromChin / totalTorsoSpan);

    // Narrow central neck/collar core where white shirts or light ties sit
    const centralCollarHalfW = faceW * (0.42 + 0.36 * torsoProgress);
    // Wider shoulder zone ONLY activates below shoulderSlopesStartY
    const allowWideShoulders = y >= shoulderSlopesStartY;
    const wideSlopeProgress = allowWideShoulders
      ? Math.min(1, (y - shoulderSlopesStartY) / Math.max(1, cutH - shoulderSlopesStartY))
      : 0;
    const maxAllowedHalfW = allowWideShoulders
      ? faceW * (0.65 + 1.05 * Math.sin(wideSlopeProgress * (Math.PI / 2)))
      : centralCollarHalfW;

    for (let x = 0; x < cutW; x++) {
      const idx = (y * cutW + x) * 4;
      const currentAlpha = cutData[idx + 3];
      if (currentAlpha >= 245) continue;

      const distFromCenter = Math.abs(x - faceCenterX);
      if (distFromCenter > maxAllowedHalfW) continue;

      const r = origData[idx];
      const g = origData[idx + 1];
      const b = origData[idx + 2];
      const pixelLuma = 0.299 * r + 0.587 * g + 0.114 * b;
      const diffFromSidePaper =
        Math.abs(r - sidePaperR) + Math.abs(g - sidePaperG) + Math.abs(b - sidePaperB);

      const isInsideCentralCollar = distFromCenter <= centralCollarHalfW;
      const isStrongClothing =
        diffFromSidePaper > 52 || pixelLuma < refPaperLuma - 28;

      if (!isInsideCentralCollar && !isStrongClothing) {
        continue;
      }

      const distFromEdge = maxAllowedHalfW - distFromCenter;
      let targetAlpha = 255;
      if (distFromEdge < featherPx) {
        targetAlpha = Math.round((distFromEdge / featherPx) * 255);
      }

      if (targetAlpha > currentAlpha) {
        cutData[idx] = r;
        cutData[idx + 1] = g;
        cutData[idx + 2] = b;
        cutData[idx + 3] = targetAlpha;
      }
    }
  }

  // Step 4: Clean up faint grey paper fringe around upper head
  const upperHeadLimitY = Math.round(faceBottomY - faceH * 0.06);
  for (let y = 0; y < upperHeadLimitY; y++) {
    for (let x = 0; x < cutW; x++) {
      const idx = (y * cutW + x) * 4;
      const a = cutData[idx + 3];
      if (a > 0 && a < 185) {
        const diffFromSide =
          Math.abs(cutData[idx] - sidePaperR) +
          Math.abs(cutData[idx + 1] - sidePaperG) +
          Math.abs(cutData[idx + 2] - sidePaperB);
        if (diffFromSide < 34) {
          cutData[idx + 3] = Math.round(a * 0.30);
        }
      }
    }
  }

  cutCtx.putImageData(cutImgData, 0, 0);
  origCanvas.width = 0;
  origCanvas.height = 0;

  // Step 5: Natural Anatomical Shoulder Contour Extension on Left & Right Edges
  // Check if foreground shoulders touch the left (x <= 3) or right (x >= cutW - 4) border below chin
  const shoulderCheckStartY = Math.max(0, Math.round(faceBottomY + faceH * 0.05));
  let leftTouches = false;
  let rightTouches = false;

  for (let y = shoulderCheckStartY; y < cutH; y += 2) {
    if (cutData[(y * cutW + 3) * 4 + 3] > 150) leftTouches = true;
    if (cutData[(y * cutW + (cutW - 4)) * 4 + 3] > 150) rightTouches = true;
    if (leftTouches && rightTouches) break;
  }

  let finalCanvas = cutCanvas;
  let padLeft = 0;

  if (leftTouches || rightTouches) {
    const extSide = Math.round(cutW * 0.15);
    padLeft = leftTouches ? extSide : 0;
    const padRight = rightTouches ? extSide : 0;
    const newW = cutW + padLeft + padRight;

    const shoulderCanvas = document.createElement('canvas');
    shoulderCanvas.width = newW;
    shoulderCanvas.height = cutH;
    const sCtx = shoulderCanvas.getContext('2d', { willReadFrequently: true });
    sCtx.drawImage(cutCanvas, padLeft, 0);

    const sImgData = sCtx.getImageData(0, 0, newW, cutH);
    const sData = sImgData.data;

    // Helper to sample smoothed edge color from inside the subject border
    const sampleSmoothedShoulderPixel = (innerStartX, innerEndX, sy) => {
      if (sy < shoulderCheckStartY || sy >= cutH) return null;
      let sR = 0,
        sG = 0,
        sB = 0,
        sA = 0,
        cnt = 0;
      const yMin = Math.max(0, sy - 1);
      const yMax = Math.min(cutH - 1, sy + 1);
      for (let yy = yMin; yy <= yMax; yy++) {
        for (let xx = innerStartX; xx <= innerEndX; xx++) {
          const idx = (yy * cutW + xx) * 4;
          const a = cutData[idx + 3];
          if (a > 120) {
            sR += cutData[idx];
            sG += cutData[idx + 1];
            sB += cutData[idx + 2];
            sA += a;
            cnt++;
          }
        }
      }
      if (cnt === 0) return null;
      return {
        r: sR / cnt,
        g: sG / cnt,
        b: sB / cnt,
        a: sA / cnt,
      };
    };

    // Extend LEFT shoulder with natural downward shoulder curve (bridging 3px inside seam to avoid faint line)
    if (leftTouches) {
      for (let y = shoulderCheckStartY; y < cutH; y++) {
        for (let d = -3; d <= padLeft; d++) {
          const srcY = Math.round(y - Math.max(0, d) * 0.72);
          const baseInnerX = Math.min(cutW - 12, 4 + Math.round(Math.max(0, d) * 0.22));
          const sampled = sampleSmoothedShoulderPixel(baseInnerX, baseInnerX + 6, srcY);
          if (!sampled || sampled.a < 140) continue;

          const edgeFade = d > padLeft - 10 ? (padLeft - d) / 10 : 1.0;
          const depthShade = 1 - (Math.max(0, d) / padLeft) * 0.05;
          const targetX = padLeft - d;
          if (targetX < 0 || targetX >= newW) continue;
          const dstIdx = (y * newW + targetX) * 4;
          const newAlpha = Math.round(sampled.a * Math.max(0, Math.min(1, edgeFade)));

          if (d > 0 || newAlpha > sData[dstIdx + 3]) {
            sData[dstIdx] = Math.round(sampled.r * depthShade);
            sData[dstIdx + 1] = Math.round(sampled.g * depthShade);
            sData[dstIdx + 2] = Math.round(sampled.b * depthShade);
            sData[dstIdx + 3] = newAlpha;
          }
        }
      }
    }

    // Extend RIGHT shoulder with natural downward shoulder curve (bridging 3px inside seam to avoid faint line)
    if (rightTouches) {
      for (let y = shoulderCheckStartY; y < cutH; y++) {
        for (let d = -3; d <= padRight; d++) {
          const srcY = Math.round(y - Math.max(0, d) * 0.72);
          const baseInnerX = Math.max(11, cutW - 5 - Math.round(Math.max(0, d) * 0.22));
          const sampled = sampleSmoothedShoulderPixel(baseInnerX - 6, baseInnerX, srcY);
          if (!sampled || sampled.a < 140) continue;

          const edgeFade = d > padRight - 10 ? (padRight - d) / 10 : 1.0;
          const depthShade = 1 - (Math.max(0, d) / padRight) * 0.05;
          const targetX = padLeft + cutW - 1 + d;
          if (targetX < 0 || targetX >= newW) continue;
          const dstIdx = (y * newW + targetX) * 4;
          const newAlpha = Math.round(sampled.a * Math.max(0, Math.min(1, edgeFade)));

          if (d > 0 || newAlpha > sData[dstIdx + 3]) {
            sData[dstIdx] = Math.round(sampled.r * depthShade);
            sData[dstIdx + 1] = Math.round(sampled.g * depthShade);
            sData[dstIdx + 2] = Math.round(sampled.b * depthShade);
            sData[dstIdx + 3] = newAlpha;
          }
        }
      }
    }

    sCtx.putImageData(sImgData, 0, 0);
    cutCanvas.width = 0;
    cutCanvas.height = 0;
    finalCanvas = shoulderCanvas;
  }

  const reconstructedBlob = await canvasToPngBlob(finalCanvas);
  finalCanvas.width = 0;
  finalCanvas.height = 0;

  const reconstructedImg = await loadImageFromBlob(reconstructedBlob);

  return {
    blob: reconstructedBlob,
    image: reconstructedImg,
    faceBoxInCutout: {
      originX: faceCenterX + padLeft - faceW / 2,
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
    if (a < 32) {
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
