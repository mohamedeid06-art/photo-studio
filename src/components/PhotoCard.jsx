import React, { useState } from 'react';
import {
  Crop,
  Download,
  Trash2,
  Eye,
  Play,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Pencil,
  UserCheck,
} from 'lucide-react';
import { PHOTO_STATUS, STATUS_LABELS } from '../constants/presets';
import { downloadSinglePhoto } from '../services/zipExporter';

export default function PhotoCard({
  item,
  config,
  onProcessSingle,
  onOpenManualEdit,
  onRemove,
  onRename,
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);

  const statusMeta = STATUS_LABELS[item.status] || STATUS_LABELS[PHOTO_STATUS.PENDING];
  const isReady = item.status === PHOTO_STATUS.READY;
  const isProcessing = item.status === PHOTO_STATUS.PROCESSING;
  const isFailed = item.status === PHOTO_STATUS.FAILED;

  // Check if file size is within KSA Ministry limits (e.g. 15 KB to 240 KB)
  const minKB = config?.minSizeKB || 15;
  const strictMaxKB = config?.strictLimitKB || Math.max(240, config?.maxSizeKB || 200);
  const isSizeCompliant =
    isReady && item.outputSizeKB >= minKB && item.outputSizeKB <= strictMaxKB;

  const displayImageUrl =
    isReady && !showOriginal ? item.processedUrl : item.originalUrl;

  return (
    <div className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
      {/* Top Status & Before/After Bar */}
      <div className="px-3.5 py-2.5 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2">
        {/* Status Badge */}
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusMeta.bgClass}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
          {statusMeta.text}
        </span>

        {/* Before / After Toggle Button (only when processed) */}
        {isReady && (
          <button
            type="button"
            onClick={() => setShowOriginal((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border transition-colors ${
              showOriginal
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
            title="اضغط للتبديل بين الصورة النهائية والصورة الأصلية قبل المعالجة"
          >
            <Eye className="w-3 h-3" />
            <span>{showOriginal ? 'الصورة الأصلية (قبل)' : 'معاينة الأصل (قبل/بعد)'}</span>
          </button>
        )}
      </div>

      {/* Image Preview Area */}
      <div className="relative aspect-square w-full bg-checkerboard flex items-center justify-center overflow-hidden p-3">
        <div
          className={`relative w-full h-full flex items-center justify-center rounded-xl overflow-hidden ${
            isReady && !showOriginal
              ? 'bg-white shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700'
              : ''
          }`}
        >
          {displayImageUrl && (
            <img
              src={displayImageUrl}
              alt={item.customName || item.originalName}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              loading="lazy"
            />
          )}

          {/* Processing Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-slate-900/65 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-4 text-center">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
              <span className="text-xs font-bold leading-relaxed">
                {item.progressStep || 'جاري المعالجة الذكية...'}
              </span>
            </div>
          )}

          {/* Face Detected & Manual Override Badges */}
          {isReady && !showOriginal && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
              {item.manualAdjustments ? (
                <span className="px-2 py-0.5 rounded-md bg-indigo-600/90 text-white text-[10px] font-bold backdrop-blur-sm shadow-sm">
                  معدّلة يدوياً
                </span>
              ) : item.detectedFace ? (
                <span
                  className="px-2 py-0.5 rounded-md bg-slate-900/75 text-white text-[10px] font-semibold backdrop-blur-sm flex items-center gap-1"
                  title="تم التعرف على الوجه وتوسيط الرأس والشماغ/الحجاب تلقائياً"
                >
                  <UserCheck className="w-3 h-3 text-emerald-400" />
                  توسيط ذكي
                </span>
              ) : null}
            </div>
          )}

          {/* "Original" watermark badge when toggled */}
          {isReady && showOriginal && (
            <div className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-bold shadow">
              الصورة الأصلية ({item.originalSizeKB} KB)
            </div>
          )}
        </div>
      </div>

      {/* Card Body: Filename + Dimensions & File Size */}
      <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          {/* Inline Editable Filename (Preserves original name) */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={item.customName}
                onFocus={() => setIsEditingName(true)}
                onBlur={() => setIsEditingName(false)}
                onChange={(e) => onRename(item.id, e.target.value)}
                dir="auto"
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/90 border transition-colors truncate ${
                  isEditingName
                    ? 'border-emerald-500 ring-1 ring-emerald-500/30 bg-white dark:bg-slate-900'
                    : 'border-slate-200/80 dark:border-slate-700 hover:border-slate-300'
                }`}
                title="اسم الملف عند التصدير (اضغط لتعديل الاسم مباشرة)"
              />
            </div>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 shrink-0 select-none">
              .jpg
            </span>
            <Pencil className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </div>

          {/* Dimensions & File Size Compliance Row */}
          {isReady ? (
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/70 dark:border-slate-700">
                {item.outputWidth} × {item.outputHeight} px
              </span>

              <span
                className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-lg border ${
                  isSizeCompliant
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800'
                }`}
                title={
                  isSizeCompliant
                    ? 'حجم الملف مطابق تماماً لاشتراطات موقع وزارة الخارجية السعودية (بين 15 و 240 كيلوبايت)'
                    : 'حجم الملف خارج النطاق القياسي'
                }
              >
                {isSizeCompliant ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span dir="ltr">{item.outputSizeKB} KB</span>
              </span>
            </div>
          ) : isFailed ? (
            <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900">
              {item.errorMessage || 'تعذرت المعالجة، يرجى المحاولة مرة أخرى'}
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
              <span>الحجم الأصلي: {item.originalSizeKB} KB</span>
              <span>المقاس الهدف: {config.width}×{config.height}</span>
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5">
          {isReady ? (
            <>
              {/* Manual Edit Modal Trigger */}
              <button
                type="button"
                onClick={() => onOpenManualEdit(item)}
                className="flex-1 py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                title="تعديل القص والتقريب والإضاءة يدوياً على الصورة المفرغة"
              >
                <Crop className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>تعديل يدوي</span>
              </button>

              {/* Single Download Button */}
              <button
                type="button"
                onClick={() => downloadSinglePhoto(item)}
                className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                title={`تحميل ${item.customName}.jpg`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل</span>
              </button>
            </>
          ) : (
            /* Process Single Photo Button when Pending or Failed */
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onProcessSingle(item.id, isFailed)}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/70 disabled:opacity-50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              {isFailed ? (
                <>
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>إعادة المحاولة</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>معالجة هذه الصورة</span>
                </>
              )}
            </button>
          )}

          {/* Remove Photo Button */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => onRemove(item.id)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-40 transition-colors"
            title="حذف الصورة من القائمة"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
