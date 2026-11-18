import React from 'react';
import {
  Sliders,
  Maximize2,
  SunMedium,
  Contrast,
  Sparkles,
  RotateCcw,
  RefreshCw,
  Check,
  UserCheck,
  Feather,
  FileCheck2,
} from 'lucide-react';
import { PHOTO_PRESETS, DEFAULT_PROCESSING_CONFIG } from '../constants/presets';

export default function SettingsPanel({
  config,
  onChangeConfig,
  onResetEnhancements,
  onApplyToProcessed,
  readyCount,
  isReRenderingAll,
}) {
  const handlePresetSelect = (presetId) => {
    const preset = PHOTO_PRESETS[presetId];
    if (!preset) return;

    const updated = {
      ...config,
      presetId: preset.id,
      width: preset.width,
      height: preset.height,
      minSizeKB: preset.minSizeKB,
      maxSizeKB: preset.maxSizeKB,
      strictLimitKB: preset.strictLimitKB,
      headRatioPercent: preset.headRatioPercent,
      topMarginPercent: preset.topMarginPercent,
    };
    onChangeConfig(updated, true);
  };

  const handleFieldChange = (field, value, triggerInstantReRender = false) => {
    const updated = {
      ...config,
      [field]: value,
    };
    onChangeConfig(updated, triggerInstantReRender);
  };

  return (
    <aside className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Section Header */}
      <div className="px-5 py-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-100/80 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              إعدادات مقاس وحجم الصورة
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              تُطبق تلقائياً على جميع الصور
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* 1. Preset Selector Cards */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5 text-emerald-600" />
            قالب المقاس المعتمد
          </label>

          <div className="space-y-2">
            {Object.values(PHOTO_PRESETS).map((preset) => {
              const isSelected = config.presetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetSelect(preset.id)}
                  className={`w-full text-right p-3 rounded-xl border transition-all flex items-start justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 ring-1 ring-emerald-500/40 shadow-sm'
                      : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {preset.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {preset.description}
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'border border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Dimensions & File Size Bounds (Editable in Custom or expandable) */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
              الأبعاد وحدود الحجم (KB)
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-slate-600">
              خلفية بيضاء #FFFFFF
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                العرض (px)
              </label>
              <input
                type="number"
                min={200}
                max={2400}
                disabled={config.presetId !== 'custom'}
                value={config.width}
                onChange={(e) =>
                  handleFieldChange('width', Math.max(200, Number(e.target.value) || 600), true)
                }
                className="w-full px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                الارتفاع (px)
              </label>
              <input
                type="number"
                min={200}
                max={2400}
                disabled={config.presetId !== 'custom'}
                value={config.height}
                onChange={(e) =>
                  handleFieldChange('height', Math.max(200, Number(e.target.value) || 600), true)
                }
                className="w-full px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                الحد الأدنى (KB)
              </label>
              <input
                type="number"
                min={5}
                max={100}
                value={config.minSizeKB}
                onChange={(e) =>
                  handleFieldChange('minSizeKB', Math.max(5, Number(e.target.value) || 15), true)
                }
                className="w-full px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                الحد الأقصى (KB)
              </label>
              <input
                type="number"
                min={30}
                max={500}
                value={config.maxSizeKB}
                onChange={(e) =>
                  handleFieldChange('maxSizeKB', Math.max(30, Number(e.target.value) || 200), true)
                }
                className="w-full px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium leading-tight">
            ✓ خوارزمية الضغط الثنائي تضمن بقاء حجم كل صورة بين {config.minSizeKB} KB و{' '}
            {config.maxSizeKB} KB (أقل من سقف الوزارة 240 KB).
          </p>
        </div>

        {/* 3. Smart Framing & Edge Feathering */}
        <div className="space-y-4 pt-2 border-t border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              القص الذكي وتنعيم الحواف
            </span>
          </div>

          {/* Head & Shoulders Ratio Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                نسبة تقريب الرأس والكتفين
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {config.headRatioPercent}%
              </span>
            </div>
            <input
              type="range"
              min={54}
              max={78}
              step={1}
              value={config.headRatioPercent}
              onChange={(e) => handleFieldChange('headRatioPercent', Number(e.target.value), false)}
              onMouseUp={() => readyCount > 0 && onApplyToProcessed()}
              onTouchEnd={() => readyCount > 0 && onApplyToProcessed()}
              className="w-full bg-slate-200 dark:bg-slate-700 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>إظهار الكتفين أكثر (54%)</span>
              <span>قياسي (68%)</span>
              <span>تقريب الوجه (78%)</span>
            </div>
          </div>

          {/* Edge Smoothing Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Feather className="w-3.5 h-3.5 text-slate-400" />
                تنعيم الحواف مع الخلفية البيضاء
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {config.edgeSmoothing} px
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={4}
              step={0.5}
              value={config.edgeSmoothing}
              onChange={(e) => handleFieldChange('edgeSmoothing', Number(e.target.value), false)}
              onMouseUp={() => readyCount > 0 && onApplyToProcessed()}
              onTouchEnd={() => readyCount > 0 && onApplyToProcessed()}
              className="w-full bg-slate-200 dark:bg-slate-700 rounded-lg"
            />
          </div>
        </div>

        {/* 4. Image Enhancement Sliders (Brightness, Contrast, Sharpness) */}
        <div className="space-y-4 pt-2 border-t border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              تحسين صور الواتساب والمسح الضوئي
            </span>
            <button
              type="button"
              onClick={onResetEnhancements}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
              title="إعادة ضبط الإضاءة والتباين والحدة للقيم الافتراضية"
            >
              <RotateCcw className="w-3 h-3" />
              إعادة ضبط
            </button>
          </div>

          {/* Brightness */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <SunMedium className="w-3.5 h-3.5 text-amber-500" />
                الإضاءة (Brightness)
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {config.brightness}%
              </span>
            </div>
            <input
              type="range"
              min={70}
              max={140}
              step={1}
              value={config.brightness}
              onChange={(e) => handleFieldChange('brightness', Number(e.target.value), false)}
              onMouseUp={() => readyCount > 0 && onApplyToProcessed()}
              onTouchEnd={() => readyCount > 0 && onApplyToProcessed()}
              className="w-full bg-slate-200 dark:bg-slate-700 rounded-lg"
            />
          </div>

          {/* Contrast */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Contrast className="w-3.5 h-3.5 text-indigo-500" />
                التباين (Contrast)
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {config.contrast}%
              </span>
            </div>
            <input
              type="range"
              min={75}
              max={140}
              step={1}
              value={config.contrast}
              onChange={(e) => handleFieldChange('contrast', Number(e.target.value), false)}
              onMouseUp={() => readyCount > 0 && onApplyToProcessed()}
              onTouchEnd={() => readyCount > 0 && onApplyToProcessed()}
              className="w-full bg-slate-200 dark:bg-slate-700 rounded-lg"
            />
          </div>

          {/* Sharpness */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                الحدة وتوضيح الملامح (Sharpness)
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {config.sharpness}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={80}
              step={5}
              value={config.sharpness}
              onChange={(e) => handleFieldChange('sharpness', Number(e.target.value), false)}
              onMouseUp={() => readyCount > 0 && onApplyToProcessed()}
              onTouchEnd={() => readyCount > 0 && onApplyToProcessed()}
              className="w-full bg-slate-200 dark:bg-slate-700 rounded-lg"
            />
          </div>

          {/* Instant Re-render notice / button for already processed photos */}
          {readyCount > 0 && (
            <button
              type="button"
              disabled={isReRenderingAll}
              onClick={() => onApplyToProcessed()}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReRenderingAll ? 'animate-spin' : ''}`} />
              <span>
                {isReRenderingAll
                  ? 'جاري تحديث الصور الجاهزة فوراً...'
                  : `تحديث الصور الجاهزة فوراً (${readyCount}) بدون إعادة التفريغ`}
              </span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
