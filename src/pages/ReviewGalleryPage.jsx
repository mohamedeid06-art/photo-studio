import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Crop,
  Download,
  Eye,
  Columns,
  ChevronRight,
  ChevronLeft,
  UploadCloud,
  FolderDown,
  ShieldCheck,
  UserCheck,
  Play,
} from 'lucide-react';
import { PHOTO_STATUS, APP_PAGES } from '../constants/presets';
import { downloadSinglePhoto } from '../services/zipExporter';

export default function ReviewGalleryPage({
  items,
  config,
  onOpenManualEdit,
  onProcessSingle,
  onRename,
  onNavigate,
}) {
  const readyOrAllItems = useMemo(() => {
    const ready = items.filter((i) => i.status === PHOTO_STATUS.READY);
    return ready.length > 0 ? ready : items;
  }, [items]);

  const [selectedId, setSelectedId] = useState(
    () => readyOrAllItems[0]?.id || null
  );
  const [compareMode, setCompareMode] = useState('side_by_side'); // 'final' | 'side_by_side' | 'original'

  const activeItem = useMemo(() => {
    return (
      readyOrAllItems.find((i) => i.id === selectedId) ||
      readyOrAllItems[0] ||
      null
    );
  }, [readyOrAllItems, selectedId]);

  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-2xl mx-auto my-8 space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
          <UploadCloud className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white">
          لا توجد صور في صالة المراجعة حتى الآن
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          قم برفع الصور ومعالجتها في استوديو الرفع أولاً، ثم ستظهر لك هنا لفحص المطابقة البيومترية ومقارنة (قبل / بعد) بدقة عالية.
        </p>
        <button
          type="button"
          onClick={() => onNavigate(APP_PAGES.STUDIO)}
          className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold shadow-md inline-flex items-center gap-2"
        >
          <UploadCloud className="w-4 h-4" />
          <span>الذهاب إلى استوديو الرفع والمعالجة</span>
        </button>
      </div>
    );
  }

  const currentIndex = readyOrAllItems.findIndex((i) => i.id === activeItem?.id);
  const isReady = activeItem?.status === PHOTO_STATUS.READY;
  const minKB = config?.minSizeKB || 15;
  const strictMaxKB = config?.strictLimitKB || 240;
  const isSizeCompliant =
    isReady &&
    activeItem.outputSizeKB >= minKB &&
    activeItem.outputSizeKB <= strictMaxKB;

  const handlePrev = () => {
    if (currentIndex > 0) {
      setSelectedId(readyOrAllItems[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < readyOrAllItems.length - 1) {
      setSelectedId(readyOrAllItems[currentIndex + 1].id);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Main Studio Inspector Card */}
      {activeItem && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Right / Main Visual Stage (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Stage Toolbar */}
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentIndex <= 0}
                  onClick={handlePrev}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
                  title="الصورة السابقة"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                  صورة {currentIndex + 1} من {readyOrAllItems.length}
                </span>
                <button
                  type="button"
                  disabled={currentIndex >= readyOrAllItems.length - 1}
                  onClick={handleNext}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
                  title="الصورة التالية"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              {/* View Mode Switcher */}
              {isReady && (
                <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-900 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setCompareMode('side_by_side')}
                    className={`px-3 py-1 rounded-lg flex items-center gap-1 transition-all ${
                      compareMode === 'side_by_side'
                        ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>مقارنة جنباً إلى جنب</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareMode('final')}
                    className={`px-3 py-1 rounded-lg flex items-center gap-1 transition-all ${
                      compareMode === 'final'
                        ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>النتيجة فقط</span>
                  </button>
                </div>
              )}
            </div>

            {/* Visual Comparison Canvas Area */}
            <div className="p-6 bg-checkerboard min-h-[380px] flex items-center justify-center">
              {isReady && compareMode === 'side_by_side' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl items-center">
                  {/* Processed After Card */}
                  <div className="space-y-2 text-center">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-600 text-white shadow-sm">
                      بعد المعالجة ({activeItem.outputWidth}×{activeItem.outputHeight})
                    </span>
                    <div className="aspect-square rounded-2xl bg-white p-2 shadow-md ring-2 ring-emerald-500/40 flex items-center justify-center overflow-hidden">
                      <img
                        src={activeItem.processedUrl}
                        alt={activeItem.customName}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  </div>

                  {/* Original Before Card */}
                  <div className="space-y-2 text-center">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-slate-700 text-white">
                      الصورة الأصلية ({activeItem.originalSizeKB} KB)
                    </span>
                    <div className="aspect-square rounded-2xl bg-slate-900/10 dark:bg-slate-800/50 p-2 border border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                      <img
                        src={activeItem.originalUrl}
                        alt="Original"
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-md w-full flex flex-col items-center space-y-3">
                  <div className="aspect-square w-72 sm:w-80 rounded-2xl bg-white p-3 shadow-lg ring-1 ring-slate-200 dark:ring-slate-700 flex items-center justify-center overflow-hidden">
                    <img
                      src={isReady ? activeItem.processedUrl : activeItem.originalUrl}
                      alt={activeItem.customName}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  {!isReady && (
                    <button
                      type="button"
                      onClick={() => onProcessSingle(activeItem.id)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-md"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>معالجة هذه الصورة الآن</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Left Column (5 cols): Biometric Compliance Report & Actions */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" />
                  تقرير الفحص البيومتري
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                  {activeItem.customName}.jpg
                </h3>
              </div>
              {isReady && (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                  جاهز ومطابق ✓
                </span>
              )}
            </div>

            {/* Editable Filename Field */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                اسم الملف عند التصدير (يحتفظ بالاسم الأصلي ويمكنك تعديله)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={activeItem.customName}
                  onChange={(e) => onRename(activeItem.id, e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <span className="text-xs font-extrabold text-slate-400">.jpg</span>
              </div>
            </div>

            {/* 4-Point Compliance Checklist */}
            {isReady ? (
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    أبعاد الصورة النهائية
                  </span>
                  <span className="font-black text-emerald-700 dark:text-emerald-300" dir="ltr">
                    {activeItem.outputWidth} × {activeItem.outputHeight} px
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    {isSizeCompliant ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    حجم الملف المضغوط ({minKB}–{strictMaxKB} KB)
                  </span>
                  <span className="font-black text-emerald-700 dark:text-emerald-300" dir="ltr">
                    {activeItem.outputSizeKB} KB
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    لون الخلفية القياسي
                  </span>
                  <span className="font-black text-emerald-700 dark:text-emerald-300">
                    أبيض ناصع #FFFFFF
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    توسيط الرأس وحماية الشماغ/الحجاب
                  </span>
                  <span className="font-black text-emerald-700 dark:text-emerald-300">
                    {activeItem.manualAdjustments ? 'مضبوط يدوياً' : 'تلقائي ذكي ✓'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-800 dark:text-amber-300">
                هذه الصورة في وضع الانتظار ولم تتم معالجتها بعد.
              </div>
            )}

            {/* Action Buttons */}
            {isReady && (
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => onOpenManualEdit(activeItem)}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Crop className="w-4 h-4 text-emerald-400" />
                  <span>فتح محرر القص اليدوي والشبكة الإرشادية</span>
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => downloadSinglePhoto(activeItem)}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل منفرد</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate(APP_PAGES.EXPORT)}
                    className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <FolderDown className="w-4 h-4" />
                    <span>مركز التصدير والطباعة</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Filmstrip Thumbnails Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-700 dark:text-slate-300">
            شريط الصور السريع ({readyOrAllItems.length} صورة) — اضغط على أي صورة لفحصها
          </h4>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {readyOrAllItems.map((item) => {
            const isSelected = item.id === activeItem?.id;
            const thumbUrl =
              item.status === PHOTO_STATUS.READY ? item.processedUrl : item.originalUrl;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`group relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all bg-white ${
                  isSelected
                    ? 'border-emerald-600 ring-2 ring-emerald-500/30 scale-105'
                    : 'border-slate-200 dark:border-slate-700 opacity-75 hover:opacity-100'
                }`}
              >
                {thumbUrl && (
                  <img
                    src={thumbUrl}
                    alt={item.customName}
                    className="w-full h-full object-cover"
                  />
                )}
                <span className="absolute bottom-0 inset-x-0 bg-slate-900/75 text-white text-[9px] font-bold truncate px-1 py-0.5">
                  {item.customName}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
