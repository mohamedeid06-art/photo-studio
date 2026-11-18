import React from 'react';
import {
  Camera,
  ShieldCheck,
  Sun,
  Moon,
  Sparkles,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default function Header({
  theme,
  onToggleTheme,
  totalCount,
  readyCount,
  pendingCount,
  isModelLoaded,
}) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand Identity */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 shrink-0">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                استوديو التأشيرات والجوازات الذكي
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5" />
                معتمد لوزارة الخارجية السعودية
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              تفريغ خلفية بدقة فائقة • توسيط تلقائي للوجه والشماغ/الحجاب • ضغط ذكي (15–240 KB)
            </p>
          </div>
        </div>

        {/* Status Pills & Theme Toggle */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Queue Counters */}
          {totalCount > 0 && (
            <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-300">
                الإجمالي: <strong className="text-slate-900 dark:text-white">{totalCount}</strong>
              </span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                جاهز: <strong>{readyCount}</strong>
              </span>
              {pendingCount > 0 && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Clock className="w-3.5 h-3.5" />
                    بالانتظار: <strong>{pendingCount}</strong>
                  </span>
                </>
              )}
            </div>
          )}

          {/* Local AI Privacy Badge */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            title="تتم جميع عمليات المعالجة داخل متصفحك 100% دون رفع أي صورة لأي خادم خارجي"
          >
            <Sparkles
              className={`w-3.5 h-3.5 ${
                isModelLoaded ? 'text-emerald-500' : 'text-amber-500'
              }`}
            />
            <span>{isModelLoaded ? 'الذكاء الاصطناعي جاهز' : 'معالجة محلية 100%'}</span>
          </div>

          {/* Theme Toggle (Light Mode Default) */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm transition-all"
            title={theme === 'dark' ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">الوضع النهاري</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">الوضع الليلي</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
