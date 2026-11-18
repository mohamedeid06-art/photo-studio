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
        minDetectionConfidence: 0.45,
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
 * Scans the alpha channel of the background-removed cutout image to locate
 * the exact top of the head/hijab/ghutra and foreground bounding box.
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

  // Threshold alpha > 45 to ignore faint background noise
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

  // Also compute the horizontal center of the upper 35% of the subject (the head region)
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
 * Selects the primary (largest & most centered) face when multiple faces appear.
 */
function selectPrimaryFace(detections, imgWidth, imgHeight) {
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
    // Favor larger face area and proximity to horizontal center
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
 * Computes the optimal passport crop box combining MediaPipe Face Detection
 * AND the Foreground Alpha Mask (to preserve Hijab, Ghutra/Shemagh, and hair tops).
 *
 * @param {HTMLImageElement} cutoutImage - Transparent foreground image
 * @param {Object} options - { targetWidth, targetHeight, headRatioPercent, topMarginPercent }
 * @returns {Promise<Object>} Crop specification: { cropBox: { x, y, width, height }, detectedFace: boolean, faceMetrics }
 */
export async function computeSmartPassportCrop(cutoutImage, options = {}) {
  const imgW = cutoutImage.naturalWidth || cutoutImage.width;
  const imgH = cutoutImage.naturalHeight || cutoutImage.height;

  const targetW = options.targetWidth || 600;
  const targetH = options.targetHeight || 600;
  const targetAspect = targetW / targetH;

  // headRatioPercent default is 68 (representing ~68% head & upper-neck presence)
  const headRatio = Math.min(0.85, Math.max(0.45, (options.headRatioPercent || 68) / 100));
  const topMarginRatio = Math.min(0.2, Math.max(0.04, (options.topMarginPercent || 9) / 100));

  // Step 1: Analyze foreground mask for exact crown / hijab / ghutra top
  const maskBox = analyzeForegroundMask(cutoutImage);

  // Step 2: Detect face using MediaPipe
  let primaryFaceBox = null;
  try {
    const detector = await getFaceDetector();
    if (detector) {
      const result = detector.detect(cutoutImage);
      const chosen = selectPrimaryFace(result?.detections, imgW, imgH);
      if (chosen?.boundingBox) {
        primaryFaceBox = chosen.boundingBox;
      }
    }
  } catch (err) {
    console.warn('Face detection execution fallback to alpha mask:', err);
  }

  let cropWidth;
  let cropHeight;
  let cropCenterX;
  let cropTopY;

  if (primaryFaceBox) {
    // MediaPipe face box generally runs from eyebrows/forehead to chin
    const faceTopY = primaryFaceBox.originY;
    const faceBottomY = primaryFaceBox.originY + primaryFaceBox.height;
    const faceH = primaryFaceBox.height;
    const faceCenterX = primaryFaceBox.originX + primaryFaceBox.width / 2;

    // Estimate crown without headwear (~28% above MediaPipe's upper face box)
    const estimatedCrownY = Math.max(0, faceTopY - faceH * 0.28);

    // Fuse with actual foreground mask top (protects Hijab, Ghutra/Igal, puffy hair)
    // Only trust maskBox.topY if it lies within a plausible range above the face
    let actualHeadTopY = estimatedCrownY;
    if (
      maskBox.valid &&
      maskBox.topY < estimatedCrownY &&
      maskBox.topY >= faceTopY - faceH * 0.95
    ) {
      actualHeadTopY = maskBox.topY;
    } else if (maskBox.valid && maskBox.topY > estimatedCrownY && maskBox.topY < faceTopY) {
      actualHeadTopY = maskBox.topY;
    }

    // Full physical head height from top of hijab/ghutra/hair down to chin
    const fullHeadHeight = Math.max(faceH * 1.15, faceBottomY - actualHeadTopY);

    // Biometric proportion: fullHeadHeight + upper neck anchor occupies headRatio of frame
    // Converting head-to-chin height into total frame height:
    const effectiveCrownToChinFraction = headRatio * 0.81;
    cropHeight = fullHeadHeight / effectiveCrownToChinFraction;
    cropWidth = cropHeight * targetAspect;

    // Blend face center X with upper-mask center X (90% face center, 10% mask symmetry)
    cropCenterX = maskBox.valid
      ? faceCenterX * 0.88 + maskBox.centerX * 0.12
      : faceCenterX;

    // Position top of crop so actualHeadTopY has exact topMarginRatio headroom
    cropTopY = actualHeadTopY - cropHeight * topMarginRatio;
  } else {
    // Fallback: Smart Alpha-Mask Portrait Framing when face detector misses
    const subjectTop = maskBox.valid ? maskBox.topY : imgH * 0.08;
    const subjectHeight = maskBox.valid ? maskBox.height : imgH * 0.85;
    const subjectWidth = maskBox.valid ? maskBox.width : imgW * 0.75;

    // Estimate head height from subject silhouette aspect
    const estimatedHeadH = Math.min(subjectHeight * 0.52, subjectWidth * 0.72);
    const effectiveCrownToChinFraction = headRatio * 0.81;

    cropHeight = Math.max(
      estimatedHeadH / effectiveCrownToChinFraction,
      subjectWidth * 0.92 / targetAspect
    );
    cropWidth = cropHeight * targetAspect;
    cropCenterX = maskBox.valid ? maskBox.centerX : imgW / 2;
    cropTopY = subjectTop - cropHeight * topMarginRatio;
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
