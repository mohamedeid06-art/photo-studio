import React from 'react';
import {
  Home,
  Layers,
  ScanEye,
  Sliders,
  FolderDown,
  Camera,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { APP_PAGES, PHOTO_PRESETS } from '../constants/presets';

export default function SidebarNav({
  activePage,
  onNavigate,
  totalCount,
  readyCount,
  pendingCount,
  config,
  isModelLoaded,
}) {
  const activePreset = PHOTO_PRESETS[config.presetId] || PHOTO_PRESETS.ksa_mofa;

  const navItems = [
    {
      id: APP_PAGES.HOME,
      label: 'الرئيسية وبوابة البدء',
      subLabel: 'نظرة عامة واختيار سريع',
      icon: Home,
      badge: null,
    },
    {
      id: APP_PAGES.PRESETS,
      label: 'قوالب المقاسات والمواصفات',
      subLabel: activePreset.shortName,
      icon: Sliders,
      badge: activePreset.flag,
      badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    },
    {
      id: APP_PAGES.STUDIO,
      label: 'استوديو الرفع والمعالجة',
      subLabel: 'رفع بالجملة ومعالجة AI',
      icon: Layers,
      badge: totalCount > 0 ? totalCount : null,
      badgeClass:
        pendingCount > 0
          ? 'bg-amber-500 text-white'
          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200',
    },
    {
      id: APP_PAGES.REVIEW,
      label: 'صالة المراجعة والتدقيق',
      subLabel: 'فحص الجودة والتعديل اليدوي',
      icon: ScanEye,
      badge: readyCount > 0 ? readyCount : null,
      badgeClass: 'bg-emerald-600 text-white',
    },
    {
      id: APP_PAGES.EXPORT,
      label: 'مركز التصدير والطباعة',
      subLabel: 'ملف ZIP وقالب طباعة 4×6',
      icon: FolderDown,
      badge: readyCount > 0 ? 'جاهز' : null,
      badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
    },
  ];

  return (
    <>
      {/* Desktop Right-Hand RTL Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 xl:w-80 shrink-0 bg-white dark:bg-slate-900 border-l border-slate-200/80 dark:border-slate-800/90 min-h-screen sticky top-0 select-none z-30 shadow-[0_0_40px_rgba(0,0,0,0.02)]">
        {/* Top Brand Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/80">
          <div
            onClick={() => onNavigate(APP_PAGES.HOME)}
            className="flex items-center gap-3.5 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 flex items-center justify-center text-white shadow-lg shadow-emerald-700/25 group-hover:scale-105 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  استوديو التأشيرات
                </h1>
                <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  PRO
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                منصة معالجة صور الخارجية والجوازات
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="p-4 flex-1 space-y-1.5 overflow-y-auto">
          <div className="px-3 py-1.5 text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            صفحات المنصة
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`w-full text-right px-3.5 py-3 rounded-2xl transition-all duration-200 flex items-center justify-between gap-3 group relative ${
                  isActive
                    ? 'bg-gradient-to-l from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/60 group-hover:text-emerald-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div
                      className={`text-xs font-extrabold truncate ${
                        isActive ? 'text-white' : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {item.label}
                    </div>
                    <div
                      className={`text-[10px] truncate mt-0.5 ${
                        isActive
                          ? 'text-emerald-100'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {item.subLabel}
                    </div>
                  </div>
                </div>

                {item.badge !== null && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold shrink-0 ${
                      isActive
                        ? 'bg-white text-emerald-800'
                        : item.badgeClass || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Active Spec Summary Card inside Sidebar */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/40 dark:from-slate-800/70 dark:to-emerald-950/20 border border-slate-200/80 dark:border-slate-700/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  المعيار النشط حالياً
                </span>
                <span className="text-sm">{activePreset.flag}</span>
              </div>

              <div>
                <div className="text-xs font-black text-slate-900 dark:text-white">
                  {activePreset.shortName}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {config.width} × {config.height} بكسل • خلفية #FFFFFF
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
                <div className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  الحجم: {config.minSizeKB}–{config.maxSizeKB} KB
                </div>
                <div className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  نسبة الرأس: {config.headRatioPercent}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom AI Engine & Privacy Card */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isModelLoaded
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
              }`}
            >
              {isModelLoaded ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Cpu className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <span>محرك الذكاء الاصطناعي</span>
                <Sparkles className="w-3 h-3 text-amber-500" />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {isModelLoaded
                  ? 'النموذج عالي الدقة محمّل في الذاكرة'
                  : 'يعمل 100% محلياً عبر WebAssembly'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-2.5 rounded-xl text-[10px] font-bold transition-all ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/50'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="truncate max-w-[68px]">{item.label.split(' ')[0]}</span>
              {item.badge !== null && typeof item.badge === 'number' && (
                <span className="absolute -top-0.5 right-1 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-600 text-white">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
