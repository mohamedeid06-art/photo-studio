import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

let faceDetectorInstance = null;
let detectorInitPromise = null;

/**
 * Lazily initializes the MediaPipe FaceDetector instance via WASM CDN.
 */
async function getFaceDetector() {
  if (faceDetectorInstance) return faceDetectorInstance;
  if (detectorInitPromise) return detectorInitPromise;

  detectorInitPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      faceDetectorInstance = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
        },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.38,
      });
      return faceDetectorInstance;
    } catch (err) {
      console.warn('MediaPipe FaceDetector initialization fallback:', err);
      detectorInitPromise = null;
      return null;
    }
  })();

  return detectorInitPromise;
}

/**
 * Selects the primary (largest & most centered) face when multiple faces appear.
 */
function selectPrimaryFace(detections, imgWidth) {
  if (!detections || detections.length === 0) return null;
  if (detections.length === 1) return detections[0];

  const imgCenterX = imgWidth / 2;
  let bestDetection = detections[0];
  let bestScore = -Infinity;

  for (const det of detections) {
    const box = det.boundingBox;
    if (!box) continue;
    const area = box.width * box.height;
    const faceCenterX = box.originX + box.width / 2;
    const distFromCenterNormalized = Math.abs(faceCenterX - imgCenterX) / (imgWidth * 0.5);
    const centralityMultiplier = Math.max(0.3, 1.15 - distFromCenterNormalized * 0.6);
    const score = area * centralityMultiplier;
    if (score > bestScore) {
      bestScore = score;
      bestDetection = det;
    }
  }

  return bestDetection;
}

/**
 * Detects the primary face boundingBox on an HTMLImageElement (preferably the raw original image).
 */
export async function detectPrimaryFaceBox(imageElement) {
  try {
    const detector = await getFaceDetector();
    if (!detector) return null;
    const imgW = imageElement.naturalWidth || imageElement.width;
    const result = detector.detect(imageElement);
    const chosen = selectPrimaryFace(result?.detections, imgW);
    return chosen?.boundingBox || null;
  } catch (err) {
    console.warn('detectPrimaryFaceBox fallback:', err);
    return null;
  }
}

/**
 * Scans the alpha channel of the cutout image to locate the foreground bounding box
 * and exact top of hair/hijab/ghutra.
 */
export function analyzeForegroundMask(cutoutImage) {
  const sampleMax = 400;
  const origW = cutoutImage.naturalWidth || cutoutImage.width;
  const origH = cutoutImage.naturalHeight || cutoutImage.height;
  const scale = Math.min(1, sampleMax / Math.max(origW, origH));
  const w = Math.max(1, Math.round(origW * scale));
  const h = Math.max(1, Math.round(origH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(cutoutImage, 0, 0, w, h);

  const { data } = ctx.getImageData(0, 0, w, h);
  canvas.width = 0;
  canvas.height = 0;

  let minX = w;
  let maxX = 0;
  let minY = h;
  let maxY = 0;
  let foundPixels = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 45) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        foundPixels++;
      }
    }
  }

  if (foundPixels < 20) {
    return {
      valid: false,
      topY: 0,
      bottomY: origH,
      leftX: 0,
      rightX: origW,
      centerX: origW / 2,
      width: origW,
      height: origH,
    };
  }

  const headRegionBottom = Math.min(maxY, Math.round(minY + (maxY - minY) * 0.38));
  let headSumX = 0;
  let headCount = 0;
  for (let y = minY; y <= headRegionBottom; y++) {
    for (let x = minX; x <= maxX; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 80) {
        headSumX += x;
        headCount++;
      }
    }
  }

  const headCenterX = headCount > 0 ? headSumX / headCount : (minX + maxX) / 2;

  return {
    valid: true,
    topY: minY / scale,
    bottomY: maxY / scale,
    leftX: minX / scale,
    rightX: maxX / scale,
    centerX: headCenterX / scale,
    width: (maxX - minX) / scale,
    height: (maxY - minY) / scale,
  };
}

/**
 * Computes the optimal passport crop box on the reconstructed cutout so that:
 * 1. The bottom of the crop box NEVER extends below imgH (the actual bottom of the photograph),
 *    so the person's real shoulders/collar/hijab sit flush on the bottom edge (y = 600) with ZERO barcode stretching and ZERO floating head!
 * 2. The top of the head/hijab/ghutra has balanced white headroom (~8-10%).
 */
export async function computeSmartPassportCrop(cutoutImage, options = {}) {
  const imgW = cutoutImage.naturalWidth || cutoutImage.width;
  const imgH = cutoutImage.naturalHeight || cutoutImage.height;

  const targetW = options.targetWidth || 600;
  const targetH = options.targetHeight || 600;
  const targetAspect = targetW / targetH;

  const rawSlider = Number(options.headRatioPercent || 68);
  const crownToChinFraction = Math.min(0.65, Math.max(0.45, (rawSlider / 100) * 0.80));
  const topMarginRatio = Math.min(0.15, Math.max(0.05, (options.topMarginPercent || 8) / 100));

  const maskBox = analyzeForegroundMask(cutoutImage);

  let primaryFaceBox = options.precomputedFaceBox || null;
  if (!primaryFaceBox) {
    primaryFaceBox = await detectPrimaryFaceBox(cutoutImage);
  }

  let cropWidth;
  let cropHeight;
  let cropCenterX;
  let cropTopY;

  if (primaryFaceBox) {
    const faceTopY = primaryFaceBox.originY;
    const faceBottomY = primaryFaceBox.originY + primaryFaceBox.height;
    const faceH = primaryFaceBox.height;
    const faceCenterX = primaryFaceBox.originX + primaryFaceBox.width / 2;

    const estimatedCrownY = Math.max(0, faceTopY - faceH * 0.32);

    let actualHeadTopY = estimatedCrownY;
    if (
      maskBox.valid &&
      maskBox.topY < estimatedCrownY &&
      maskBox.topY >= Math.max(0, faceTopY - faceH * 0.85)
    ) {
      actualHeadTopY = maskBox.topY;
    }

    const fullHeadHeight = Math.max(faceH * 1.2, faceBottomY - actualHeadTopY);

    // Ideal crop height from slider
    const idealCropHeight = fullHeadHeight / crownToChinFraction;
    const desiredHeadroomPx = idealCropHeight * topMarginRatio;
    cropTopY = actualHeadTopY - desiredHeadroomPx;

    // Crucial rule: The bottom of the crop (cropBottomY) must NEVER exceed imgH (the actual bottom edge of the photo)!
    // If idealCropHeight extends past imgH (as in passport scanner photos), clamp cropBottomY strictly to imgH
    // so the real shoulders/collar touch the bottom border of the 600x600 canvas cleanly!
    const idealCropBottomY = cropTopY + idealCropHeight;

    if (idealCropBottomY > imgH) {
      const realSubjectSpan = imgH - actualHeadTopY;
      // Give 9% headroom above the top of hair/hijab, and end strictly at imgH!
      const balancedHeadroom = realSubjectSpan * (topMarginRatio / (1 - topMarginRatio));
      cropTopY = actualHeadTopY - balancedHeadroom;
      cropHeight = imgH - cropTopY;
    } else {
      cropHeight = idealCropHeight;
    }

    cropWidth = cropHeight * targetAspect;
    cropCenterX = faceCenterX;
  } else {
    const subjectTop = maskBox.valid ? maskBox.topY : imgH * 0.04;
    const realSubjectSpan = imgH - subjectTop;
    const headroomPx = realSubjectSpan * 0.09;
    cropTopY = subjectTop - headroomPx;
    cropHeight = imgH - cropTopY;
    cropWidth = cropHeight * targetAspect;
    cropCenterX = maskBox.valid ? maskBox.centerX : imgW / 2;
  }

  const cropX = cropCenterX - cropWidth / 2;

  return {
    detectedFace: Boolean(primaryFaceBox),
    cropBox: {
      x: cropX,
      y: cropTopY,
      width: cropWidth,
      height: cropHeight,
    },
    maskBox,
    faceBox: primaryFaceBox,
  };
}
