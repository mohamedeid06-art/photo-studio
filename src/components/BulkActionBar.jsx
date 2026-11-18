import React, { useState } from 'react';
import {
  Play,
  Square,
  Archive,
  Trash2,
  Cpu,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { PHOTO_STATUS } from '../constants/presets';
import { downloadBatchAsZip } from '../services/zipExporter';

export default function BulkActionBar({
  items,
  isBatchRunning,
  modelDownloadState,
  onProcessAll,
  onStopBatch,
  onClearAll,
}) {
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  if (!items || items.length === 0) return null;

  const totalCount = items.length;
  const readyItems = items.filter((i) => i.status === PHOTO_STATUS.READY);
  const readyCount = readyItems.length;
  const pendingOrFailedCount = items.filter(
    (i) => i.status === PHOTO_STATUS.PENDING || i.status === PHOTO_STATUS.FAILED
  ).length;
  const processingCount = items.filter((i) => i.status === PHOTO_STATUS.PROCESSING).length;

  const overallPercent =
    totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;

  const handleDownloadZip = async () => {
    if (readyItems.length === 0 || isZipping) return;
    setIsZipping(true);
    setZipProgress(0);
    try {
      await downloadBatchAsZip(readyItems, (pct) => setZipProgress(pct));
    } finally {
      setIsZipping(false);
      setZipProgress(0);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-4">
      {/* First-Time AI Model Download Banner */}
      {modelDownloadState?.isDownloading && (
        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0">
              <Cpu className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-blue-900 dark:text-blue-200">
                جاري تحميل نموذج الذكاء الاصطناعي عالي الدقة لأول مرة...
              </h4>
              <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                يتم حفظ النموذج في ذاكرة المتصفح المؤقتة (Cache) لتعمل جميع الصور التالية بسرعة فائقة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:w-48 shrink-0">
            <div className="w-full h-2 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(8, modelDownloadState.percent || 15)}%` }}
              />
            </div>
            <span className="text-xs font-extrabold text-blue-800 dark:text-blue-200 w-10 text-left">
              {modelDownloadState.percent || 0}%
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Process All / Pause Button */}
          {isBatchRunning ? (
            <button
              type="button"
              onClick={onStopBatch}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-sm flex items-center gap-2 transition-all"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>إيقاف المعالجة مؤقتاً ({processingCount} قيد التنفيذ)</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={pendingOrFailedCount === 0}
              onClick={onProcessAll}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white text-xs sm:text-sm font-bold shadow-sm shadow-emerald-600/20 flex items-center gap-2 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                معالجة الكل ({pendingOrFailedCount > 0 ? `${pendingOrFailedCount} صورة` : 'مكتمل'})
              </span>
            </button>
          )}

          {/* Download All as ZIP Button */}
          <button
            type="button"
            disabled={readyCount === 0 || isZipping}
            onClick={handleDownloadZip}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-700 dark:hover:bg-emerald-600 disabled:bg-slate-100 dark:disabled:bg-slate-800/60 disabled:text-slate-400 dark:disabled:text-slate-600 text-white text-xs sm:text-sm font-bold shadow-sm flex items-center gap-2 transition-all"
          >
            {isZipping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري ضغط ملف الـ ZIP ({zipProgress}%)...</span>
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                <span>تحميل الكل كملف مضغوط ZIP ({readyCount})</span>
              </>
            )}
          </button>
        </div>

        {/* Clear Queue Button */}
        <button
          type="button"
          onClick={onClearAll}
          className="px-3.5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/70 bg-rose-50/70 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>مسح القائمة</span>
        </button>
      </div>

      {/* Global Batch Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300">
            {isBatchRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                <span>جاري معالجة الصور بالتوازي (صورتان في نفس الوقت لمنع تجميد المتصفح)...</span>
              </>
            ) : readyCount === totalCount && totalCount > 0 ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                  اكتملت معالجة جميع الصور بنجاح! جاهزة للتحميل المباشر أو كملف ZIP.
                </span>
              </>
            ) : (
              <span>
                جاهز للمعالجة: اضغط «معالجة الكل» للبدء بعد التأكد من إعدادات المقاس
              </span>
            )}
          </div>
          <span className="font-extrabold text-slate-800 dark:text-slate-200">
            {readyCount} / {totalCount} ({overallPercent}%)
          </span>
        </div>

        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/60 dark:border-slate-700">
          <div
            className="h-full bg-gradient-to-l from-emerald-500 to-emerald-600 transition-all duration-300 rounded-full"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
