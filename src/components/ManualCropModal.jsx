import React, { useState, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import {
  X,
  Check,
  RotateCcw,
  ZoomIn,
  RotateCw,
  SunMedium,
  Contrast,
  Sparkles,
  Feather,
  Grid,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { loadImageFromBlob, renderPassportPhoto } from '../services/imageProcessor';

export default function ManualCropModal({ item, config, onClose, onSave }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(item?.manualAdjustments?.rotation ?? 0);
  const [brightness, setBrightness] = useState(
    item?.manualAdjustments?.brightness ?? config.brightness
  );
  const [contrast, setContrast] = useState(
    item?.manualAdjustments?.contrast ?? config.contrast
  );
  const [sharpness, setSharpness] = useState(
    item?.manualAdjustments?.sharpness ?? config.sharpness
  );
  const [edgeSmoothing, setEdgeSmoothing] = useState(
    item?.manualAdjustments?.edgeSmoothing ?? config.edgeSmoothing
  );
  const [showBiometricGuide, setShowBiometricGuide] = useState(true);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(item?.activeCropBox || null);

  // Live output preview state
  const [livePreview, setLivePreview] = useState({
    url: item?.processedUrl || null,
    sizeKB: item?.outputSizeKB || 0,
    isComputing: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const targetAspect = (config.width || 600) / (config.height || 600);

  const onCropComplete = useCallback((_croppedArea, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // Debounced live JPEG size & output preview calculation
  useEffect(() => {
    if (!item?.cutoutBlob || !croppedAreaPixels) return;

    let cancelled = false;
    setLivePreview((prev) => ({ ...prev, isComputing: true }));

    const timer = setTimeout(async () => {
      try {
        const cutoutImg = await loadImageFromBlob(item.cutoutBlob);
        if (cancelled) return;

        const rendered = await renderPassportPhoto(cutoutImg, croppedAreaPixels, {
          width: config.width,
          height: config.height,
          minSizeKB: config.minSizeKB,
          maxSizeKB: config.maxSizeKB,
          brightness,
          contrast,
          sharpness,
          edgeSmoothing,
          rotation,
        });

        if (cancelled) return;
        const previewUrl = URL.createObjectURL(rendered.blob);

        setLivePreview((prev) => {
          if (prev.url && prev.url !== item.processedUrl) {
            URL.revokeObjectURL(prev.url);
          }
          return {
            url: previewUrl,
            sizeKB: rendered.sizeKB,
            isComputing: false,
          };
        });
      } catch (err) {
        console.warn('Live preview render error:', err);
        if (!cancelled) {
          setLivePreview((prev) => ({ ...prev, isComputing: false }));
        }
      }
    }, 240);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    item,
    croppedAreaPixels,
    rotation,
    brightness,
    contrast,
    sharpness,
    edgeSmoothing,
    config.width,
    config.height,
    config.minSizeKB,
    config.maxSizeKB,
  ]);

  // Cleanup temporary live preview URL on modal close
  useEffect(() => {
    return () => {
      if (livePreview.url && livePreview.url !== item?.processedUrl) {
        URL.revokeObjectURL(livePreview.url);
      }
    };
  }, [livePreview.url, item?.processedUrl]);

  if (!item) return null;

  const handleResetToAutoCrop = async () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setBrightness(config.brightness);
    setContrast(config.contrast);
    setSharpness(config.sharpness);
    setEdgeSmoothing(config.edgeSmoothing);
    setCroppedAreaPixels(item.autoCropBox);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave(item.id, {
        cropBox: croppedAreaPixels || item.autoCropBox,
        rotation,
        brightness,
        contrast,
        sharpness,
        edgeSmoothing,
        isReset: false,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const minKB = config?.minSizeKB || 15;
  const strictMaxKB = config?.strictLimitKB || 240;
  const isSizeCompliant =
    livePreview.sizeKB >= minKB && livePreview.sizeKB <= strictMaxKB;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              تعديل يدوي للصورة: {item.customName}.jpg
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              حرك الصورة أو قرّبها بحرية فوق الخلفية البيضاء مع الاستعانة بالشبكة الإرشادية للوجه والكتفين
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Main Column: Interactive Cropper with Biometric Passport Overlay */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                منطقة القص والتوسيط التفاعلي ({config.width}×{config.height} px)
              </span>

              <button
                type="button"
                onClick={() => setShowBiometricGuide((prev) => !prev)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                  showBiometricGuide
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>{showBiometricGuide ? 'إخفاء الشبكة الإرشادية' : 'إظهار الشبكة الإرشادية'}</span>
              </button>
            </div>

            {/* Cropper Stage */}
            <div className="relative w-full h-[360px] sm:h-[420px] rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-white shadow-inner">
              <Cropper
                image={item.cutoutUrl || item.originalUrl}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={targetAspect}
                restrictPosition={false}
                minZoom={0.4}
                maxZoom={3}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
                style={{
                  containerStyle: {
                    backgroundColor: '#FFFFFF',
                  },
                  mediaStyle: {
                    filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                  },
                  cropAreaStyle: {
                    border: '2px solid #059669',
                    boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)',
                  },
                }}
              />

              {/* Biometric Passport Head & Shoulders Guide Overlay */}
              {showBiometricGuide && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <svg
                    viewBox="0 0 200 200"
                    className="w-64 h-64 sm:w-72 sm:h-72 opacity-75"
                    fill="none"
                  >
                    {/* Vertical Center Alignment Line */}
                    <line
                      x1="100"
                      y1="0"
                      x2="100"
                      y2="200"
                      stroke="#10b981"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    {/* Top Headroom Limit Line (9% from top) */}
                    <line
                      x1="35"
                      y1="18"
                      x2="165"
                      y2="18"
                      stroke="#10b981"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    />
                    <text x="100" y="13" textAnchor="middle" fill="#059669" fontSize="7" fontWeight="bold">
                      حد أعلى الرأس / الشماغ / الحجاب
                    </text>

                    {/* Biometric Head Oval */}
                    <ellipse
                      cx="100"
                      cy="76"
                      rx="38"
                      ry="52"
                      stroke="#10b981"
                      strokeWidth="1.5"
                      strokeDasharray="5 3"
                    />

                    {/* Eye Level Guide Band */}
                    <line
                      x1="55"
                      y1="68"
                      x2="145"
                      y2="68"
                      stroke="#059669"
                      strokeWidth="1"
                      strokeDasharray="2 3"
                    />

                    {/* Shoulders Silhouette Curve */}
                    <path
                      d="M 25 195 C 30 148, 65 136, 100 136 C 135 136, 170 148, 175 195"
                      stroke="#10b981"
                      strokeWidth="1.5"
                      strokeDasharray="5 3"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Quick Zoom & Rotation Controls under Cropper */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <ZoomIn className="w-3.5 h-3.5 text-emerald-600" />
                    التقريب (Zoom)
                  </span>
                  <span className="font-bold text-emerald-600">{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.4}
                  max={2.6}
                  step={0.02}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full bg-slate-200 dark:bg-slate-700 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <RotateCw className="w-3.5 h-3.5 text-emerald-600" />
                    تدوير الصورة (Rotation)
                  </span>
                  <span className="font-bold text-emerald-600" dir="ltr">
                    {rotation}°
                  </span>
                </div>
                <input
                  type="range"
                  min={-20}
                  max={20}
                  step={0.5}
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="w-full bg-slate-200 dark:bg-slate-700 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Live Output Preview & Individual Image Sliders */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-5">
            {/* Live Preview Box */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  معاينة النتيجة النهائية وحجم الملف الحي
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                    isSizeCompliant
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {livePreview.isComputing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span dir="ltr">{livePreview.sizeKB} KB</span>
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-28 h-28 rounded-xl bg-white border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                  {livePreview.url && (
                    <img
                      src={livePreview.url}
                      alt="Live Preview"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    الأبعاد النهائية: {config.width} × {config.height} بكسل
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    الخلفية: أبيض ناصع قياسي <code className="font-bold">#FFFFFF</code>
                  </div>
                  <div className="text-emerald-700 dark:text-emerald-400 font-semibold">
                    ✓ مطابقة لاشتراطات موقع وزارة الخارجية السعودية
                  </div>
                </div>
              </div>
            </div>

            {/* Individual Image Enhancement Sliders */}
            <div className="space-y-3.5 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  تعديلات خاصة بهذه الصورة فقط
                </span>
                <button
                  type="button"
                  onClick={handleResetToAutoCrop}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>استعادة القص التلقائي</span>
                </button>
              </div>

              {/* Brightness */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <SunMedium className="w-3.5 h-3.5 text-amber-500" />
                    الإضاءة
                  </span>
                  <span className="font-bold">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min={70}
                  max={140}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full bg-slate-200 dark:bg-slate-700 rounded-lg"
                />
              </div>

              {/* Contrast */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Contrast className="w-3.5 h-3.5 text-indigo-500" />
                    التباين
                  </span>
                  <span className="font-bold">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min={75}
                  max={140}
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full bg-slate-200 dark:bg-slate-700 rounded-lg"
                />
              </div>

              {/* Sharpness */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    الحدة وتوضيح الملامح
                  </span>
                  <span className="font-bold">{sharpness}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={sharpness}
                  onChange={(e) => setSharpness(Number(e.target.value))}
                  className="w-full bg-slate-200 dark:bg-slate-700 rounded-lg"
                />
              </div>

              {/* Edge Smoothing */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Feather className="w-3.5 h-3.5 text-slate-500" />
                    تنعيم الحواف مع الخلفية البيضاء
                  </span>
                  <span className="font-bold">{edgeSmoothing} px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={4}
                  step={0.5}
                  value={edgeSmoothing}
                  onChange={(e) => setEdgeSmoothing(Number(e.target.value))}
                  className="w-full bg-slate-200 dark:bg-slate-700 rounded-lg"
                />
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>حفظ التعديلات على الصورة</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
