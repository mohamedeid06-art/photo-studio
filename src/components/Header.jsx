import React from 'react';
import {
  Sun,
  Moon,
  Upload,
  FolderDown,
  ChevronLeft,
  Sliders,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { APP_PAGES, PHOTO_PRESETS } from '../constants/presets';

const PAGE_TITLES = {
  [APP_PAGES.HOME]: {
    title: 'الرئيسية وبوابة الاستوديو',
    subtitle: 'منصة متكاملة لمعالجة وتجهيز صور التأشيرات والجوازات بالجملة وفق معايير وزارة الخارجية',
  },
  [APP_PAGES.PRESETS]: {
    title: 'قوالب المقاسات الرسمية وإعدادات الجودة',
    subtitle: 'اختر القالب الرسمي المعتمد للسفارة أو خصص الأبعاد وحدود حجم الملف بالكيلوبايت',
  },
  [APP_PAGES.STUDIO]: {
    title: 'استوديو الرفع والمعالجة بالذكاء الاصطناعي',
    subtitle: 'رفع الصور بالجملة، تفريغ الخلفية بدقة فائقة، وتوسيط الوجه والشماغ/الحجاب تلقائياً',
  },
  [APP_PAGES.REVIEW]: {
    title: 'صالة المراجعة والتدقيق البيومتري',
    subtitle: 'معاينة مطابقة الصور لاشتراطات الخارجية وتعديل الإضاءة أو القص اليدوي لكل صورة',
  },
  [APP_PAGES.EXPORT]: {
    title: 'مركز التصدير الجماعي وقوالب الطباعة',
    subtitle: 'تحميل جميع الصور في ملف مضغوط ZIP بأسمائها الأصلية أو تجهيز كارت طباعة حرارية 4×6',
  },
};

export default function Header({
  activePage,
  onNavigate,
  theme,
  onToggleTheme,
  totalCount,
  readyCount,
  pendingCount,
  config,
}) {
  const pageMeta = PAGE_TITLES[activePage] || PAGE_TITLES[APP_PAGES.HOME];
  const activePreset = PHOTO_PRESETS[config.presetId] || PHOTO_PRESETS.ksa_mofa;

  return (
    <header className="sticky top-0 z-20 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8 py-4">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Page Title & Breadcrumb */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
            <span>استوديو التأشيرات الذكي</span>
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{pageMeta.title}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {pageMeta.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block mt-0.5">
            {pageMeta.subtitle}
          </p>
        </div>

        {/* Right Controls: Active Preset Pill, Quick Nav Actions, Theme Toggle */}
        <div className="flex items-center gap-2.5">
          {/* Active Preset Badge Button */}
          <button
            type="button"
            onClick={() => onNavigate(APP_PAGES.PRESETS)}
            className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100/90 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
            title="اضغط لتغيير قالب المقاس أو إعدادات الحجم"
          >
            <span>{activePreset.flag}</span>
            <span>{activePreset.shortName}</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 font-extrabold">
              {config.width}×{config.height}
            </span>
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Status Counters Pill */}
          {totalCount > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/70 text-xs font-bold">
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                جاهز: {readyCount}
              </span>
              {pendingCount > 0 && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Clock className="w-3.5 h-3.5" />
                    انتظار: {pendingCount}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Contextual Primary CTA */}
          {activePage !== APP_PAGES.STUDIO && pendingCount === 0 && readyCount === 0 && (
            <button
              type="button"
              onClick={() => onNavigate(APP_PAGES.STUDIO)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>رفع الصور الآن</span>
            </button>
          )}

          {readyCount > 0 && activePage !== APP_PAGES.EXPORT && (
            <button
              type="button"
              onClick={() => onNavigate(APP_PAGES.EXPORT)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition-all"
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>مركز التصدير ({readyCount})</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm transition-all"
            title={theme === 'dark' ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
