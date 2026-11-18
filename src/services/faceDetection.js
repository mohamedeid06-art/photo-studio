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
 * Computes the optimal passport crop box on the reconstructed cutout (which already includes
 * the restored & extended shoulders/chest), ensuring:
 * - Balanced top headroom above hair/hijab/ghutra
 * - Full shoulders & upper chest (الجسم والكتفين) visible in the lower ~36-42% of the frame
 * - Strict bottom anchoring so cropTopY + cropHeight never exceeds the body bottom (zero floating heads!)
 */
export async function computeSmartPassportCrop(cutoutImage, options = {}) {
  const imgW = cutoutImage.naturalWidth || cutoutImage.width;
  const imgH = cutoutImage.naturalHeight || cutoutImage.height;

  const targetW = options.targetWidth || 600;
  const targetH = options.targetHeight || 600;
  const targetAspect = targetW / targetH;

  // Map user slider (54..78, default 64) to head crown-to-chin fraction (~0.48..0.56)
  // leaving ~9% top margin and ~36-42% below the chin for neck, collar, and shoulders/chest!
  const rawSlider = Number(options.headRatioPercent || 64);
  const crownToChinFraction = Math.min(0.58, Math.max(0.42, (rawSlider / 100) * 0.76));
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

    const fullHeadHeight = Math.max(faceH * 1.22, faceBottomY - actualHeadTopY);

    cropHeight = fullHeadHeight / crownToChinFraction;
    cropTopY = actualHeadTopY - cropHeight * topMarginRatio;

    // Never allow cropTopY + cropHeight to extend below imgH (the bottom of the body/shoulders)!
    // This guarantees the person's chest/shoulders always touch the very bottom edge of the photo.
    const bodyBottomY = maskBox.valid ? Math.min(imgH, maskBox.bottomY) : imgH;
    if (cropTopY + cropHeight > bodyBottomY) {
      cropHeight = Math.max(fullHeadHeight * 1.35, bodyBottomY - Math.max(0, cropTopY));
      if (cropTopY + cropHeight > bodyBottomY) {
        cropTopY = Math.max(0, bodyBottomY - cropHeight);
      }
    }

    cropWidth = cropHeight * targetAspect;
    cropCenterX = faceCenterX;
  } else {
    const subjectTop = maskBox.valid ? maskBox.topY : imgH * 0.05;
    const subjectBottom = maskBox.valid ? maskBox.bottomY : imgH;
    const headroomPx = (subjectBottom - subjectTop) * 0.09;
    cropTopY = Math.max(0, subjectTop - headroomPx);
    cropHeight = subjectBottom - cropTopY;
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
