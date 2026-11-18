import React, { useState, useRef } from 'react';
import { UploadCloud, ImagePlus, Shield, Sparkles, FolderUp } from 'lucide-react';

export default function DropzoneUploader({ onAddFiles, hasExistingItems }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer?.files?.length) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files?.length) {
      onAddFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 ${
        isDragging
          ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 scale-[0.995]'
          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-emerald-500/80 dark:hover:border-emerald-500/70 hover:bg-emerald-50/20 dark:hover:bg-slate-800/60'
      } ${hasExistingItems ? 'p-5' : 'p-8 sm:p-10'}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {hasExistingItems ? (
        /* Compact Uploader Bar when photos are already in the queue */
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-right">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ImagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                إضافة المزيد من الصور إلى قائمة الانتظار
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                اسحب وأفلت الصور هنا أو اضغط لاختيار ملفات (JPG, PNG, WEBP) — يتم الاحتفاظ بالاسم الأصلي لكل ملف
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-2 shrink-0 transition-colors"
          >
            <FolderUp className="w-4 h-4" />
            <span>اختيار صور إضافية</span>
          </button>
        </div>
      ) : (
        /* Full Hero Dropzone when queue is empty */
        <div className="flex flex-col items-center text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100/90 dark:bg-emerald-950/90 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              رفع الصور بالجملة (اسحب وأفلت الصور هنا أو اضغط للاختيار)
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              توضع الصور في <strong className="text-slate-700 dark:text-slate-200">قائمة الانتظار أولاً</strong> مع الاحتفاظ باسم الملف الأصلي، لتتمكن من مراجعة المقاس والإعدادات قبل الضغط على <strong className="text-emerald-600 dark:text-emerald-400">«معالجة الكل»</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              JPG / PNG / WEBP
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              نموذج الذكاء الاصطناعي عالي الدقة
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              يدعم 30–50 صورة في الجلسة بدون تجميد
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
