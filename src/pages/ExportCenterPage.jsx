import React, { useState } from 'react';
import {
  Archive,
  Download,
  Printer,
  CheckCircle2,
  Loader2,
  UploadCloud,
  FileImage,
  Scissors,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { PHOTO_STATUS, APP_PAGES } from '../constants/presets';
import { downloadBatchAsZip, downloadSinglePhoto } from '../services/zipExporter';
import { loadImageFromBlob } from '../services/imageProcessor';

export default function ExportCenterPage({
  items,
  config,
  onRename,
  onNavigate,
}) {
  const readyItems = items.filter((i) => i.status === PHOTO_STATUS.READY);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  // 4x6 Inch Printable Sheet Generator State
  const [selectedPrintItemId, setSelectedPrintItemId] = useState(
    () => readyItems[0]?.id || ''
  );
  const [copiesCount, setCopiesCount] = useState(6); // 4, 6, or 8 photos per 4x6 sheet
  const [showCutLines, setShowCutLines] = useState(true);
  const [isGeneratingSheet, setIsGeneratingSheet] = useState(false);

  if (readyItems.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-2xl mx-auto my-8 space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
          <Archive className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white">
          لا توجد صور جاهزة للتصدير حتى الآن
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          قم برفع الصور والضغط على «معالجة الكل» في استوديو الرفع أولاً، ثم يمكنك تحميلها جميعاً كملف ZIP واحد أو توليد كروت طباعة 4×6 بوصة.
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

  const totalSizeKB = readyItems
    .reduce((acc, item) => acc + (item.outputSizeKB || 0), 0)
    .toFixed(1);

  const handleDownloadAllZip = async () => {
    if (isZipping || readyItems.length === 0) return;
    setIsZipping(true);
    setZipProgress(0);
    try {
      await downloadBatchAsZip(readyItems, (pct) => setZipProgress(pct));
    } finally {
      setIsZipping(false);
      setZipProgress(0);
    }
  };

  /**
   * Generates a 300 DPI 4x6 inch (1800x1200 px landscape) printable photo sheet
   * containing 4, 6, or 8 copies of the chosen processed photo with cut guides.
   */
  const handleDownloadPrintSheet = async () => {
    const targetItem =
      readyItems.find((i) => i.id === selectedPrintItemId) || readyItems[0];
    if (!targetItem?.processedBlob || isGeneratingSheet) return;

    setIsGeneratingSheet(true);
    try {
      const img = await loadImageFromBlob(targetItem.processedBlob);
      // 6x4 inch at 300 DPI = 1800 x 1200 px
      const sheetW = 1800;
      const sheetH = 1200;
      const canvas = document.createElement('canvas');
      canvas.width = sheetW;
      canvas.height = sheetH;
      const ctx = canvas.getContext('2d');

      // White photo paper background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, sheetW, sheetH);

      const cols = copiesCount === 4 ? 2 : copiesCount === 6 ? 3 : 4;
      const rows = 2;

      const padding = 55;
      const gap = 36;
      const availW = sheetW - padding * 2 - gap * (cols - 1);
      const availH = sheetH - padding * 2 - gap * (rows - 1);

      const photoAspect = (targetItem.outputWidth || 600) / (targetItem.outputHeight || 600);
      let cellW = Math.min(availW / cols, (availH / rows) * photoAspect);
      let cellH = cellW / photoAspect;

      const totalGridW = cols * cellW + (cols - 1) * gap;
      const totalGridH = rows * cellH + (rows - 1) * gap;
      const startX = (sheetW - totalGridW) / 2;
      const startY = (sheetH - totalGridH) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = Math.round(startX + c * (cellW + gap));
          const y = Math.round(startY + r * (cellH + gap));
          ctx.drawImage(img, x, y, Math.round(cellW), Math.round(cellH));

          if (showCutLines) {
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, Math.round(cellW), Math.round(cellH));
          }
        }
      }

      canvas.toBlob(
        (blob) => {
          canvas.width = 0;
          canvas.height = 0;
          if (blob) {
            saveAs(
              blob,
              `كارت_طباعة_4x6_${targetItem.customName || 'photo'}_${copiesCount}_صور.jpg`
            );
          }
        },
        'image/jpeg',
        0.96
      );
    } finally {
      setIsGeneratingSheet(false);
    }
  };

  const activePrintItem =
    readyItems.find((i) => i.id === selectedPrintItemId) || readyItems[0];

  return (
    <div className="space-y-6 pb-16">
      {/* Section 1: Batch Digital ZIP Export Hero */}
      <div className="bg-gradient-to-bl from-emerald-900 via-emerald-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-700/40 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-extrabold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            <span>جاهز للرفع المباشر على موقع وزارة الخارجية السعودية / إنجاز</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black">
            تصدير الدفعة الكاملة ({readyItems.length} صورة جاهزة) في ملف مضغوط ZIP
          </h3>
          <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
            توضع جميع الصور مباشرة في جذر ملف الـ ZIP بدون مجلدات فرعية، مع الاحتفاظ بالاسم الأصلي لكل ملف وبحجم مضمون بين {config.minSizeKB} KB و {config.strictLimitKB} KB (إجمالي الحجم: {totalSizeKB} KB).
          </p>
        </div>

        <button
          type="button"
          disabled={isZipping}
          onClick={handleDownloadAllZip}
          className="px-7 py-4 rounded-2xl bg-white text-emerald-950 hover:bg-emerald-50 text-sm font-black shadow-xl flex items-center gap-3 shrink-0 transition-all hover:scale-[1.01]"
        >
          {isZipping ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-emerald-700" />
              <span>جاري تجهيز ملف الـ ZIP ({zipProgress}%)...</span>
            </>
          ) : (
            <>
              <Archive className="w-5 h-5 text-emerald-700" />
              <span>تحميل الكل كملف مضغوط ZIP ({readyItems.length})</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Right Column (7 cols): Batch Filename & File Size Review Table */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileImage className="w-4 h-4 text-emerald-600" />
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                جدول مراجعة وتسمية الملفات قبل التحميل ({readyItems.length})
              </h4>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">
              اضغط على أي اسم لتعديله فوراً
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[460px] overflow-y-auto">
            {readyItems.map((item, idx) => (
              <div
                key={item.id}
                className="p-3.5 px-5 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-xs font-extrabold text-slate-400 w-5">
                    {idx + 1}.
                  </span>
                  <img
                    src={item.processedUrl}
                    alt={item.customName}
                    className="w-11 h-11 rounded-xl object-contain bg-white border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <input
                      type="text"
                      value={item.customName}
                      onChange={(e) => onRename(item.id, e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                    <span className="text-xs font-bold text-slate-400 shrink-0">.jpg</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                    dir="ltr"
                  >
                    {item.outputSizeKB} KB
                  </span>

                  <button
                    type="button"
                    onClick={() => downloadSinglePhoto(item)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-600 hover:text-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                    title="تحميل هذه الصورة منفردة"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Left Column (5 cols): 4x6 Inch Studio Print Sheet Generator */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-emerald-600" />
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  تجهيز كارت طباعة فورية (4×6 بوصة)
                </h4>
                <p className="text-[11px] text-slate-500">
                  دقة 300 DPI جاهزة للطابعات الحرارية والاستوديوهات
                </p>
              </div>
            </div>
          </div>

          {/* Choose Photo for Print Sheet */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              اختر الصورة المراد تكرارها في كارت الطباعة:
            </label>
            <select
              value={activePrintItem?.id || ''}
              onChange={(e) => setSelectedPrintItemId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {readyItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.customName}.jpg ({item.outputWidth}×{item.outputHeight})
                </option>
              ))}
            </select>
          </div>

          {/* Copies Count Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              عدد الصور في الكارت الواحد (ورق 10×15 سم):
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[4, 6, 8].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCopiesCount(num)}
                  className={`py-2 rounded-xl text-xs font-extrabold border transition-all ${
                    copiesCount === num
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {num} صور في الكارت
                </button>
              ))}
            </div>
          </div>

          {/* Visual Sheet Preview */}
          {activePrintItem && (
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col items-center space-y-3">
              <div
                className={`w-full aspect-[3/2] bg-white rounded-xl p-3 shadow-inner grid gap-2 items-center justify-items-center ${
                  copiesCount === 4
                    ? 'grid-cols-2'
                    : copiesCount === 6
                    ? 'grid-cols-3'
                    : 'grid-cols-4'
                }`}
              >
                {Array.from({ length: copiesCount }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-full h-full overflow-hidden flex items-center justify-center ${
                      showCutLines ? 'border border-slate-300' : ''
                    }`}
                  >
                    <img
                      src={activePrintItem.processedUrl}
                      alt="Print copy"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ))}
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCutLines}
                  onChange={(e) => setShowCutLines(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <Scissors className="w-3.5 h-3.5 text-slate-500" />
                <span>إضافة خطوط قص إرشادية خفيفة حول كل صورة</span>
              </label>
            </div>
          )}

          <button
            type="button"
            disabled={isGeneratingSheet || !activePrintItem}
            onClick={handleDownloadPrintSheet}
            className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs sm:text-sm font-extrabold shadow-md flex items-center justify-center gap-2 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>
              تحميل كارت الطباعة الجاهز ({copiesCount} صور • 300 DPI)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
