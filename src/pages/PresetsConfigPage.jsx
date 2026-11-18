import React from 'react';
import {
  Check,
  Sliders,
  SunMedium,
  Contrast,
  Sparkles,
  Feather,
  UserCheck,
  RotateCcw,
  RefreshCw,
  ArrowLeft,
  FileCheck2,
  Maximize2,
} from 'lucide-react';
import { PHOTO_PRESETS, APP_PAGES } from '../constants/presets';

export default function PresetsConfigPage({
  config,
  onChangeConfig,
  onResetEnhancements,
  onApplyToProcessed,
  readyCount,
  isReRenderingAll,
  onNavigate,
}) {
  const activePreset = PHOTO_PRESETS[config.presetId] || PHOTO_PRESETS.ksa_mofa;

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
    <div className="space-y-6 pb-16">
      {/* Top Action Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl shrink-0">
            {activePreset.flag}
          </div>
          <div>
            <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
              القالب المفعّل حالياً
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {activePreset.name} ({config.width} × {config.height} بكسل)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              حجم الملف المضمون: من {config.minSizeKB} KB إلى {config.maxSizeKB} KB • خلفية بيضاء #FFFFFF
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate(APP_PAGES.STUDIO)}
          className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 shrink-0 transition-all"
        >
          <span>حفظ والانتقال لاستوديو الرفع والمعالجة</span>
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Right Column (7 cols): Official Presets Cards Library */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  مكتبة القوالب الرسمية المعتمدة
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                {Object.keys(PHOTO_PRESETS).length} قوالب جاهزة
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {Object.values(PHOTO_PRESETS).map((preset) => {
                const isSelected = config.presetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset.id)}
                    className={`text-right p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:border-emerald-400'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{preset.flag}</span>
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-black text-slate-900 dark:text-white">
                          {preset.name}
                        </div>
                        <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                          {preset.authority}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                      <span>
                        {preset.width} × {preset.height} px
                      </span>
                      <span dir="ltr">
                        {preset.minSizeKB}–{preset.maxSizeKB} KB
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dimensions & File Size Bounds Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  تخصيص الأبعاد وحدود حجم الملف (KB)
                </h3>
              </div>
              {config.presetId !== 'custom' && (
                <button
                  type="button"
                  onClick={() => handlePresetSelect('custom')}
                  className="text-xs font-extrabold text-emerald-600 hover:underline"
                >
                  تفعيل تعديل الأبعاد الحر
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  العرض (Width px)
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
                  className="w-full px-3.5 py-2 rounded-xl text-xs font-extrabold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  الارتفاع (Height px)
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
                  className="w-full px-3.5 py-2 rounded-xl text-xs font-extrabold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  الحد الأدنى (Min KB)
                </label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={config.minSizeKB}
                  onChange={(e) =>
                    handleFieldChange('minSizeKB', Math.max(5, Number(e.target.value) || 15), true)
                  }
                  className="w-full px-3.5 py-2 rounded-xl text-xs font-extrabold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  الحد الأقصى (Max KB)
                </label>
                <input
                  type="number"
                  min={30}
                  max={500}
                  value={config.maxSizeKB}
                  onChange={(e) =>
                    handleFieldChange('maxSizeKB', Math.max(30, Number(e.target.value) || 200), true)
                  }
                  className="w-full px-3.5 py-2 rounded-xl text-xs font-extrabold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Left Column (5 cols): Framing & Image Enhancement Sliders */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  ضبط القص الذكي وتحسين جودة الصور
                </h3>
              </div>
              <button
                type="button"
                onClick={onResetEnhancements}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-600 dark:text-slate-400"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة الافتراضي</span>
              </button>
            </div>

            {/* Head & Shoulders Ratio */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  نسبة استحواذ الرأس والكتفين في الإطار
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold">
                  {config.headRatioPercent}%
                </span>
              </div>
              <input
                type="range"
                min={54}
                max={78}
                step={1}
                value={config.headRatioPercent}
                onChange={(e) =>
                  handleFieldChange('headRatioPercent', Number(e.target.value), false)
                }
                onMouseUp={() => readyCount > 0 && onApplyToProcessed()}
                onTouchEnd={() => readyCount > 0 && onApplyToProcessed()}
                className="w-full bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                <span>إظهار الكتفين أكثر (54%)</span>
                <span>قياسي للخارجية (68%)</span>
                <span>تقريب الوجه (78%)</span>
              </div>
            </div>

            {/* Edge Feathering */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Feather className="w-4 h-4 text-teal-600" />
                  تنعيم حواف القص مع الخلفية البيضاء
                </span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  {config.edgeSmoothing} px
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={4}
                step={0.5}
                value={config.edgeSmoothing}
                onChange={(e) =>
                  handleFieldChange('edgeSmoothing', Number(e.target.value), false)
                }
                onMouseUp={() => readyCount > 0 && onApplyToProcessed()}
                onTouchEnd={() => readyCount > 0 && onApplyToProcessed()}
                className="w-full bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
            </div>

            {/* Brightness */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <SunMedium className="w-4 h-4 text-amber-500" />
                  الإضاءة العامة (Brightness)
                </span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
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
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Contrast className="w-4 h-4 text-indigo-500" />
                  التباين وإبراز الملامح (Contrast)
                </span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
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
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  الحدة ومعالجة صور الواتساب (Sharpness)
                </span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
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

            {readyCount > 0 && (
              <button
                type="button"
                disabled={isReRenderingAll}
                onClick={() => onApplyToProcessed()}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isReRenderingAll ? 'animate-spin' : ''}`} />
                <span>
                  {isReRenderingAll
                    ? 'جاري تحديث الصور الجاهزة فوراً...'
                    : `تطبيق الإعدادات فوراً على الصور الجاهزة (${readyCount})`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
