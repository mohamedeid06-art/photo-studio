import React, { useState } from 'react';
import {
  Sliders,
  ScanEye,
  FolderDown,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  SunMedium,
  Contrast,
  Sparkles,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { PHOTO_PRESETS, APP_PAGES, PHOTO_STATUS } from '../constants/presets';
import DropzoneUploader from '../components/DropzoneUploader';
import BulkActionBar from '../components/BulkActionBar';
import PhotoGrid from '../components/PhotoGrid';

export default function StudioWorkspacePage({
  items,
  config,
  onChangeConfig,
  isBatchRunning,
  isReRenderingAll,
  modelDownloadState,
  onAddFiles,
  onProcessSingle,
  onProcessAll,
  onStopBatch,
  onClearAll,
  onOpenManualEdit,
  onRemove,
  onRename,
  onApplyToProcessed,
  onNavigate,
}) {
  const [showQuickSliders, setShowQuickSliders] = useState(false);
  const activePreset = PHOTO_PRESETS[config.presetId] || PHOTO_PRESETS.ksa_mofa;
  const readyCount = items.filter((i) => i.status === PHOTO_STATUS.READY).length;

  const handleQuickPresetChange = (presetId) => {
    const preset = PHOTO_PRESETS[presetId];
    if (!preset) return;
    onChangeConfig(
      {
        ...config,
        presetId: preset.id,
        width: preset.width,
        height: preset.height,
        minSizeKB: preset.minSizeKB,
        maxSizeKB: preset.maxSizeKB,
        strictLimitKB: preset.strictLimitKB,
        headRatioPercent: preset.headRatioPercent,
        topMarginPercent: preset.topMarginPercent,
      },
      true
    );
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Top Studio Control Strip: Active Template Selector & Quick Adjustments Drawer */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:px-5 flex flex-wrap items-center justify-between gap-3">
          {/* Quick Preset Selector Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 ml-1">
              القالب النشط:
            </span>
            {Object.values(PHOTO_PRESETS).map((preset) => {
              const isSelected = config.presetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleQuickPresetChange(preset.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/70'
                  }`}
                >
                  <span>{preset.flag}</span>
                  <span>{preset.shortName}</span>
                </button>
              );
            })}
          </div>

          {/* Toggle Quick Enhancement Drawer */}
          <button
            type="button"
            onClick={() => setShowQuickSliders((prev) => !prev)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-600" />
            <span>ضبط سريع للإضاءة والتقريب</span>
            {showQuickSliders ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Collapsible Quick Enhancement Sliders Bar */}
        {showQuickSliders && (
          <div className="px-5 py-4 bg-slate-50/90 dark:bg-slate-800/50 border-t border-slate-200/70 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  تقريب الرأس والكتفين
                </span>
                <span className="text-emerald-600">{config.headRatioPercent}%</span>
              </div>
              <input
                type="range"
                min={54}
                max={78}
                value={config.headRatioPercent}
                onChange={(e) =>
                  onChangeConfig({ ...config, headRatioPercent: Number(e.target.value) }, false)
                }
                onMouseUp={() => readyCount > 0 && onApplyToProcessed()}
                className="w-full bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  <SunMedium className="w-3.5 h-3.5 text-amber-500" />
                  الإضاءة
                </span>
                <span>{config.brightness}%</span>
              </div>
              <input
                type="range"
                min={70}
                max={140}
                value={config.brightness}
                onChange={(e) =>
                  onChangeConfig({ ...config, brightness: Number(e.target.value) }, false)
                }
                onMouseUp={() => readyCount > 0 && onApplyToProcessed()}
                className="w-full bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  <Contrast className="w-3.5 h-3.5 text-indigo-500" />
                  التباين
                </span>
                <span>{config.contrast}%</span>
              </div>
              <input
                type="range"
                min={75}
                max={140}
                value={config.contrast}
                onChange={(e) =>
                  onChangeConfig({ ...config, contrast: Number(e.target.value) }, false)
                }
                onMouseUp={() => readyCount > 0 && onApplyToProcessed()}
                className="w-full bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  الحدة وتوضيح الملامح
                </span>
                <span>{config.sharpness}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={80}
                step={5}
                value={config.sharpness}
                onChange={(e) =>
                  onChangeConfig({ ...config, sharpness: Number(e.target.value) }, false)
                }
                onMouseUp={() => readyCount > 0 && onApplyToProcessed()}
                className="w-full bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
            </div>

            {readyCount > 0 && (
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-1">
                <button
                  type="button"
                  disabled={isReRenderingAll}
                  onClick={() => onApplyToProcessed()}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isReRenderingAll ? 'animate-spin' : ''}`} />
                  <span>تحديث الصور المعالجة حالياً ({readyCount})</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drag & Drop Batch Uploader */}
      <DropzoneUploader onAddFiles={onAddFiles} hasExistingItems={items.length > 0} />

      {/* Bulk Action Bar & Progress */}
      <BulkActionBar
        items={items}
        isBatchRunning={isBatchRunning}
        modelDownloadState={modelDownloadState}
        onProcessAll={onProcessAll}
        onStopBatch={onStopBatch}
        onClearAll={onClearAll}
      />

      {/* Next Stage Navigation Banner when photos are ready */}
      {readyCount > 0 && !isBatchRunning && (
        <div className="bg-gradient-to-l from-emerald-900 to-teal-900 text-white rounded-2xl p-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          <div>
            <h4 className="text-sm font-black">
              لديك {readyCount} صورة جاهزة ومطابقة لاشتراطات {activePreset.shortName}!
            </h4>
            <p className="text-xs text-emerald-200 mt-0.5">
              يمكنك الانتقال لصالة المراجعة والتدقيق لفحص الصور عن قرب، أو التوجه لمركز التصدير لتحميل ملف الـ ZIP وكروت الطباعة.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate(APP_PAGES.REVIEW)}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold flex items-center gap-1.5 transition-colors"
            >
              <ScanEye className="w-4 h-4" />
              <span>صالة المراجعة والتدقيق</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate(APP_PAGES.EXPORT)}
              className="px-4 py-2.5 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 text-xs font-black flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <FolderDown className="w-4 h-4 text-emerald-700" />
              <span>مركز التصدير والطباعة</span>
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-700" />
            </button>
          </div>
        </div>
      )}

      {/* Interactive Cards Grid */}
      <PhotoGrid
        items={items}
        config={config}
        onProcessSingle={onProcessSingle}
        onOpenManualEdit={onOpenManualEdit}
        onRemove={onRemove}
        onRename={onRename}
      />
    </div>
  );
}
