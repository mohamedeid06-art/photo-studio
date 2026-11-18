import { useState, useRef, useCallback, useEffect } from 'react';
import { PHOTO_STATUS } from '../constants/presets';
import { removePhotoBackground, getIsModelLoaded } from '../services/backgroundRemoval';
import {
  computeSmartPassportCrop,
  detectPrimaryFaceBox,
} from '../services/faceDetection';
import {
  loadImageFromBlob,
  reconstructSubjectWithBodyAndShoulders,
  renderPassportPhoto,
} from '../services/imageProcessor';
import { getBaseFileName } from '../services/zipExporter';

let nextUniqueId = 1;

export function usePhotoQueue(config) {
  const [items, setItems] = useState([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [isReRenderingAll, setIsReRenderingAll] = useState(false);
  const [modelDownloadState, setModelDownloadState] = useState({
    isDownloading: false,
    percent: 0,
    isLoaded: getIsModelLoaded(),
  });

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const configRef = useRef(config);
  configRef.current = config;

  const abortBatchRef = useRef(false);

  const revokeItemUrls = useCallback((item) => {
    if (!item) return;
    if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
    if (item.cutoutUrl) URL.revokeObjectURL(item.cutoutUrl);
    if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
  }, []);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => revokeItemUrls(item));
    };
  }, [revokeItemUrls]);

  const addFiles = useCallback((fileList) => {
    const validFiles = Array.from(fileList || []).filter(
      (file) =>
        /\.(jpe?g|png|webp)$/i.test(file.name) ||
        ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    );

    if (validFiles.length === 0) return 0;

    const newItems = validFiles.map((file) => {
      const id = `photo_${Date.now()}_${nextUniqueId++}`;
      const originalUrl = URL.createObjectURL(file);
      return {
        id,
        file,
        originalName: file.name,
        customName: getBaseFileName(file.name),
        originalSizeKB: Number((file.size / 1024).toFixed(1)),
        originalUrl,
        cutoutBlob: null,
        cutoutUrl: null,
        cutoutWidth: 0,
        cutoutHeight: 0,
        cachedFaceBox: null,
        processedBlob: null,
        processedUrl: null,
        outputSizeKB: 0,
        outputQuality: 0,
        outputWidth: 0,
        outputHeight: 0,
        status: PHOTO_STATUS.PENDING,
        progressStep: '',
        errorMessage: null,
        detectedFace: false,
        autoCropBox: null,
        activeCropBox: null,
        manualAdjustments: null,
      };
    });

    setItems((prev) => [...prev, ...newItems]);
    return newItems.length;
  }, []);

  const updateItemCustomName = useCallback((id, newName) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, customName: newName } : item))
    );
  }, []);

  /**
   * Core pipeline for a single photo item:
   * Step 1: Detect face on ORIGINAL image + Remove background via @imgly/background-removal
   * Step 2: Reconstruct & protect Anatomical Neck, Collar, Shoulders, Hijab, and extend short scanner crops
   * Step 3: Compute Smart Biometric Crop showing full Head + Shoulders/Body anchored to bottom edge
   * Step 4: Render on #FFFFFF canvas with enhancements & Smart JPEG binary search compression (15-240 KB)
   */
  const processSinglePhoto = useCallback(async (itemId, forceReSegment = false) => {
    const targetItem = itemsRef.current.find((i) => i.id === itemId);
    if (!targetItem) return false;

    const activeConfig = configRef.current;

    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              status: PHOTO_STATUS.PROCESSING,
              progressStep:
                i.cutoutBlob && !forceReSegment
                  ? 'جاري ضبط المقاس وإظهار الجسم...'
                  : 'جاري تفريغ الخلفية وحماية الجسم والكتفين...',
              errorMessage: null,
            }
          : i
      )
    );

    try {
      let cutoutBlob = targetItem.cutoutBlob;
      let cutoutUrl = targetItem.cutoutUrl;
      let cutoutImg = null;
      let faceBoxInCutout = targetItem.cachedFaceBox;

      if (!cutoutBlob || forceReSegment) {
        // Load original image & detect primary face on original pixels
        const originalImg = await loadImageFromBlob(targetItem.file);
        const rawFaceBox = await detectPrimaryFaceBox(originalImg);

        // Run AI background removal
        const rawAiCutoutBlob = await removePhotoBackground(
          targetItem.file,
          (progressInfo) => {
            if (progressInfo.phase === 'model_download' && progressInfo.isFirstLoad) {
              setModelDownloadState({
                isDownloading: true,
                percent: progressInfo.percent,
                isLoaded: false,
              });
            }
          }
        );

        setModelDownloadState({
          isDownloading: false,
          percent: 100,
          isLoaded: true,
        });

        const rawAiCutoutImg = await loadImageFromBlob(rawAiCutoutBlob);

        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? { ...i, progressStep: 'جاري استعادة الكتفين والجسم وتوسيط الوجه...' }
              : i
          )
        );

        // Reconstruct neck, collar, shoulders, hijab & extend short scanner crops
        const reconstructed = await reconstructSubjectWithBodyAndShoulders(
          originalImg,
          rawAiCutoutImg,
          rawFaceBox
        );

        cutoutBlob = reconstructed.blob;
        cutoutImg = reconstructed.image;
        faceBoxInCutout = reconstructed.faceBoxInCutout;

        if (cutoutUrl) URL.revokeObjectURL(cutoutUrl);
        cutoutUrl = URL.createObjectURL(cutoutBlob);
      } else {
        cutoutImg = await loadImageFromBlob(cutoutBlob);
      }

      const cutoutWidth = cutoutImg.naturalWidth || cutoutImg.width;
      const cutoutHeight = cutoutImg.naturalHeight || cutoutImg.height;

      // Compute Smart Crop showing head + full shoulders/upper body anchored to bottom edge
      const smartCropResult = await computeSmartPassportCrop(cutoutImg, {
        targetWidth: activeConfig.width,
        targetHeight: activeConfig.height,
        headRatioPercent: activeConfig.headRatioPercent,
        topMarginPercent: activeConfig.topMarginPercent,
        precomputedFaceBox: faceBoxInCutout,
      });

      const autoCropBox = smartCropResult.cropBox;

      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, progressStep: 'جاري تحسين الجودة وضغط الحجم...' }
            : i
        )
      );

      const itemOverrides = targetItem.manualAdjustments || {};
      const renderSettings = {
        width: activeConfig.width,
        height: activeConfig.height,
        minSizeKB: activeConfig.minSizeKB,
        maxSizeKB: activeConfig.maxSizeKB,
        brightness: itemOverrides.brightness ?? activeConfig.brightness,
        contrast: itemOverrides.contrast ?? activeConfig.contrast,
        sharpness: itemOverrides.sharpness ?? activeConfig.sharpness,
        edgeSmoothing: itemOverrides.edgeSmoothing ?? activeConfig.edgeSmoothing,
        rotation: itemOverrides.rotation ?? 0,
      };

      const rendered = await renderPassportPhoto(cutoutImg, autoCropBox, renderSettings);

      setItems((prev) =>
        prev.map((i) => {
          if (i.id !== itemId) return i;
          if (i.processedUrl) URL.revokeObjectURL(i.processedUrl);
          const newProcessedUrl = URL.createObjectURL(rendered.blob);

          return {
            ...i,
            cutoutBlob,
            cutoutUrl,
            cutoutWidth,
            cutoutHeight,
            cachedFaceBox: faceBoxInCutout,
            processedBlob: rendered.blob,
            processedUrl: newProcessedUrl,
            outputSizeKB: rendered.sizeKB,
            outputQuality: rendered.quality,
            outputWidth: rendered.width,
            outputHeight: rendered.height,
            status: PHOTO_STATUS.READY,
            progressStep: '',
            errorMessage: null,
            detectedFace: smartCropResult.detectedFace,
            autoCropBox,
            activeCropBox: autoCropBox,
          };
        })
      );

      return true;
    } catch (err) {
      console.error('Error processing photo:', err);
      setModelDownloadState((prev) => ({ ...prev, isDownloading: false }));
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? {
                ...i,
                status: PHOTO_STATUS.FAILED,
                progressStep: '',
                errorMessage: err?.message || 'حدث خطأ أثناء معالجة الصورة',
              }
            : i
        )
      );
      return false;
    }
  }, []);

  const processAllPending = useCallback(async () => {
    if (isBatchRunning) return;

    const pendingIds = itemsRef.current
      .filter((i) => i.status === PHOTO_STATUS.PENDING || i.status === PHOTO_STATUS.FAILED)
      .map((i) => i.id);

    if (pendingIds.length === 0) return;

    setIsBatchRunning(true);
    abortBatchRef.current = false;

    const concurrency = Math.max(1, configRef.current.concurrency || 2);
    let currentIndex = 0;

    async function worker() {
      while (currentIndex < pendingIds.length && !abortBatchRef.current) {
        const idx = currentIndex++;
        const targetId = pendingIds[idx];
        if (itemsRef.current.some((i) => i.id === targetId)) {
          await processSinglePhoto(targetId, false);
        }
      }
    }

    const workers = Array.from(
      { length: Math.min(concurrency, pendingIds.length) },
      () => worker()
    );

    await Promise.all(workers);
    setIsBatchRunning(false);
  }, [isBatchRunning, processSinglePhoto]);

  const stopBatchProcessing = useCallback(() => {
    abortBatchRef.current = true;
  }, []);

  const reRenderProcessedItems = useCallback(async (overrideConfig) => {
    const activeConfig = overrideConfig || configRef.current;
    const readyItems = itemsRef.current.filter(
      (i) => i.status === PHOTO_STATUS.READY && i.cutoutBlob
    );
    if (readyItems.length === 0) return;

    setIsReRenderingAll(true);

    try {
      for (const item of readyItems) {
        const cutoutImg = await loadImageFromBlob(item.cutoutBlob);
        let cropBoxToUse = item.activeCropBox;

        const hasManualCrop = Boolean(item.manualAdjustments?.cropBox);
        const currentTargetAspect = activeConfig.width / activeConfig.height;
        const prevCropAspect = cropBoxToUse ? cropBoxToUse.width / cropBoxToUse.height : 0;
        const aspectChanged = Math.abs(currentTargetAspect - prevCropAspect) > 0.02;

        if (!hasManualCrop || aspectChanged || !cropBoxToUse) {
          const smartCrop = await computeSmartPassportCrop(cutoutImg, {
            targetWidth: activeConfig.width,
            targetHeight: activeConfig.height,
            headRatioPercent: activeConfig.headRatioPercent,
            topMarginPercent: activeConfig.topMarginPercent,
            precomputedFaceBox: item.cachedFaceBox,
          });
          cropBoxToUse = smartCrop.cropBox;
        }

        const itemOverrides = item.manualAdjustments || {};
        const renderSettings = {
          width: activeConfig.width,
          height: activeConfig.height,
          minSizeKB: activeConfig.minSizeKB,
          maxSizeKB: activeConfig.maxSizeKB,
          brightness: itemOverrides.brightness ?? activeConfig.brightness,
          contrast: itemOverrides.contrast ?? activeConfig.contrast,
          sharpness: itemOverrides.sharpness ?? activeConfig.sharpness,
          edgeSmoothing: itemOverrides.edgeSmoothing ?? activeConfig.edgeSmoothing,
          rotation: itemOverrides.rotation ?? 0,
        };

        const rendered = await renderPassportPhoto(cutoutImg, cropBoxToUse, renderSettings);

        setItems((prev) =>
          prev.map((i) => {
            if (i.id !== item.id) return i;
            if (i.processedUrl) URL.revokeObjectURL(i.processedUrl);
            return {
              ...i,
              processedBlob: rendered.blob,
              processedUrl: URL.createObjectURL(rendered.blob),
              outputSizeKB: rendered.sizeKB,
              outputQuality: rendered.quality,
              outputWidth: rendered.width,
              outputHeight: rendered.height,
              activeCropBox: cropBoxToUse,
            };
          })
        );
      }
    } finally {
      setIsReRenderingAll(false);
    }
  }, []);

  const applyManualEditToItem = useCallback(async (itemId, manualData) => {
    const item = itemsRef.current.find((i) => i.id === itemId);
    if (!item || !item.cutoutBlob) return false;

    const activeConfig = configRef.current;
    const cutoutImg = await loadImageFromBlob(item.cutoutBlob);
    const cropBox = manualData.cropBox || item.autoCropBox;

    const renderSettings = {
      width: activeConfig.width,
      height: activeConfig.height,
      minSizeKB: activeConfig.minSizeKB,
      maxSizeKB: activeConfig.maxSizeKB,
      brightness: manualData.brightness ?? activeConfig.brightness,
      contrast: manualData.contrast ?? activeConfig.contrast,
      sharpness: manualData.sharpness ?? activeConfig.sharpness,
      edgeSmoothing: manualData.edgeSmoothing ?? activeConfig.edgeSmoothing,
      rotation: manualData.rotation ?? 0,
    };

    const rendered = await renderPassportPhoto(cutoutImg, cropBox, renderSettings);

    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== itemId) return i;
        if (i.processedUrl) URL.revokeObjectURL(i.processedUrl);
        return {
          ...i,
          processedBlob: rendered.blob,
          processedUrl: URL.createObjectURL(rendered.blob),
          outputSizeKB: rendered.sizeKB,
          outputQuality: rendered.quality,
          outputWidth: rendered.width,
          outputHeight: rendered.height,
          activeCropBox: cropBox,
          manualAdjustments: manualData.isReset ? null : manualData,
        };
      })
    );

    return true;
  }, []);

  const removeItem = useCallback(
    (itemId) => {
      setItems((prev) => {
        const target = prev.find((i) => i.id === itemId);
        if (target) revokeItemUrls(target);
        return prev.filter((i) => i.id !== itemId);
      });
    },
    [revokeItemUrls]
  );

  const clearAll = useCallback(() => {
    abortBatchRef.current = true;
    setIsBatchRunning(false);
    setItems((prev) => {
      prev.forEach((item) => revokeItemUrls(item));
      return [];
    });
  }, [revokeItemUrls]);

  return {
    items,
    isBatchRunning,
    isReRenderingAll,
    modelDownloadState,
    addFiles,
    updateItemCustomName,
    processSinglePhoto,
    processAllPending,
    stopBatchProcessing,
    reRenderProcessedItems,
    applyManualEditToItem,
    removeItem,
    clearAll,
  };
}
