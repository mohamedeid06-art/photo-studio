import React from 'react';
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Layers,
  ScanEye,
  FolderDown,
  CheckCircle2,
  Cpu,
  FileCheck2,
  Sliders,
  UploadCloud,
} from 'lucide-react';
import { APP_PAGES, PHOTO_PRESETS } from '../constants/presets';

export default function HomePage({
  config,
  onSelectPresetAndGo,
  onNavigate,
  totalCount,
  readyCount,
  pendingCount,
}) {
  const activePreset = PHOTO_PRESETS[config.presetId] || PHOTO_PRESETS.ksa_mofa;

  const workflowSteps = [
    {
      num: '01',
      title: 'اختيار قالب السفارة أو الوزارة',
      desc: 'قوالب جاهزة ومعتمدة لموقع وزارة الخارجية السعودية (600×600)، منصة نسك للعمرة، الجوازات (4×6)، وتأشيرة شنغن.',
      page: APP_PAGES.PRESETS,
      actionText: 'ضبط القالب والمواصفات',
      icon: Sliders,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      num: '02',
      title: 'رفع الصور بالجملة والمعالجة الذكية',
      desc: 'إسقاط عشرات الصور دفعة واحدة، تفريغ الخلفية بالذكاء الاصطناعي عالي الدقة، وتوسيط الوجه والشماغ/الحجاب تلقائياً.',
      page: APP_PAGES.STUDIO,
      actionText: 'فتح استوديو المعالجة',
      icon: Layers,
      color: 'from-blue-500 to-indigo-600',
    },
    {
      num: '03',
      title: 'المراجعة البيومترية والتعديل اليدوي',
      desc: 'فحص مطابقة كل صورة لاشتراطات الوزارة، مقارنة (قبل/بعد)، وتعديل الإضاءة أو القص اليدوي مع الشبكة الإرشادية.',
      page: APP_PAGES.REVIEW,
      actionText: 'فتح صالة المراجعة',
      icon: ScanEye,
      color: 'from-amber-500 to-orange-600',
    },
    {
      num: '04',
      title: 'التصدير الجماعي ZIP وكروت الطباعة',
      desc: 'تحميل كافة الصور دفعة واحدة بأسمائها الأصلية داخل ملف ZIP أو توليد كارت طباعة استوديو (4×6 بوصة) جاهز للطباعة.',
      page: APP_PAGES.EXPORT,
      actionText: 'فتح مركز التصدير',
      icon: FolderDown,
      color: 'from-purple-500 to-pink-600',
    },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Luxury Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-emerald-900 via-emerald-800 to-slate-900 text-white shadow-xl border border-emerald-700/40">
        {/* Decorative Background Glows */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/4 w-80 h-80 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative p-7 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Right Content in RTL */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-extrabold text-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>الإصدار الاحترافي لمكاتب التأشيرات والعمرة والاستوديوهات</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black leading-tight tracking-tight">
              جهّز صور تأشيرات وزارة الخارجية والجوازات بالجملة{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-emerald-300 to-amber-200">
                في ثوانٍ وبضغطة زر
              </span>
            </h1>

            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl">
              يعمل النظام بالكامل داخل متصفحك بخصوصية 100%: يزيل الخلفية بدقة فائقة، يحمي أطراف الشماغ والحجاب من القص، يوسط الوجه بيومترياً على خلفية بيضاء ناصعة <code className="text-white font-bold">#FFFFFF</code>، ويضغط حجم الملف تلقائياً بين <strong className="text-white">15 KB و 240 KB</strong> لقبول فوري في موقع الوزارة.
            </p>

            {/* Primary CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <button
                type="button"
                onClick={() => onNavigate(APP_PAGES.STUDIO)}
                className="px-6 py-3.5 rounded-2xl bg-white text-emerald-950 hover:bg-emerald-50 text-sm font-black shadow-lg shadow-black/20 flex items-center gap-2.5 transition-all hover:scale-[1.01]"
              >
                <UploadCloud className="w-5 h-5 text-emerald-700" />
                <span>
                  {totalCount > 0
                    ? `متابعة العمل في الاستوديو (${totalCount} صورة)`
                    : 'ابدأ رفع ومعالجة الصور الآن'}
                </span>
                <ArrowLeft className="w-4 h-4 text-emerald-700" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate(APP_PAGES.PRESETS)}
                className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-sm font-bold flex items-center gap-2 transition-all"
              >
                <Sliders className="w-4 h-4 text-emerald-300" />
                <span>تغيير قالب المقاس ({activePreset.shortName})</span>
              </button>
            </div>
          </div>

          {/* Left Visual Biometric Card Showcase in RTL */}
          <div className="lg:col-span-5">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-5 border border-white/15 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{activePreset.flag}</span>
                  <div>
                    <div className="text-xs font-extrabold text-white">
                      معاينة الفحص البيومتري التلقائي
                    </div>
                    <div className="text-[11px] text-emerald-200">
                      {activePreset.name}
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                  مطابق 100%
                </span>
              </div>

              {/* Visual Biometric Frame Illustration */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="aspect-square rounded-2xl bg-white p-3 relative overflow-hidden flex flex-col items-center justify-center shadow-inner">
                  {/* Simulated Biometric Head & Shoulders SVG */}
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    <rect width="200" height="200" fill="#FFFFFF" />
                    {/* Grid lines */}
                    <line x1="100" y1="0" x2="100" y2="200" stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="20" y1="20" x2="180" y2="20" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="20" y1="140" x2="180" y2="140" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" />
                    {/* Silhouette */}
                    <path d="M 35 200 C 40 152, 70 142, 100 142 C 130 142, 160 152, 165 200 Z" fill="#0f172a" />
                    <ellipse cx="100" cy="82" rx="34" ry="46" fill="#334155" />
                    {/* Dimension indicator */}
                    <rect x="6" y="6" width="188" height="188" rx="12" fill="none" stroke="#059669" strokeWidth="2" strokeDasharray="6 4" />
                  </svg>
                  <span className="absolute bottom-2 inset-x-2 text-center py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-extrabold">
                    {config.width} × {config.height} px
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/10">
                    <div className="text-[10px] text-emerald-200">الخلفية المعتمدة</div>
                    <div className="font-extrabold text-white flex items-center gap-1.5 mt-0.5">
                      <span className="w-3 h-3 rounded-full bg-white border border-slate-300 inline-block" />
                      أبيض ناصع #FFFFFF
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/10">
                    <div className="text-[10px] text-emerald-200">نطاق حجم الملف المضمون</div>
                    <div className="font-extrabold text-white mt-0.5" dir="ltr">
                      {config.minSizeKB} KB – {config.maxSizeKB} KB
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/10">
                    <div className="text-[10px] text-emerald-200">حماية الشماغ والحجاب</div>
                    <div className="font-extrabold text-emerald-300 mt-0.5">
                      ✓ مفعّل عبر القناع المفرغ
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Session Stats Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
              إجمالي الصور بالجلسة
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {totalCount} <span className="text-xs font-semibold text-slate-400">صورة</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
              صور جاهزة ومطابقة
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {readyCount} <span className="text-xs font-semibold text-slate-400">جاهزة</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
              شرط حجم وزارة الخارجية
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white mt-1" dir="ltr">
              {config.minSizeKB} – {config.strictLimitKB} KB
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
              معالجة محلية آمنة
            </div>
            <div className="text-sm font-black text-slate-900 dark:text-white mt-1">
              100% داخل المتصفح
            </div>
          </div>
        </div>
      </section>

      {/* 4-Page Multi-Stage Workflow Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              أقسام المنصة ومسار العمل الاحترافي
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              تنقّل بحرية بين صفحات المنصة المخصصة لكل مرحلة من مراحل تجهيز الصور
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {workflowSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                onClick={() => onNavigate(step.page)}
                className="group cursor-pointer bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${step.color} text-white flex items-center justify-center shadow-md`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-2xl font-black text-slate-200 dark:text-slate-800 group-hover:text-emerald-500/30 transition-colors">
                      {step.num}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {step.title}
                  </h4>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                  <span>{step.actionText}</span>
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Preset Launchpad */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              اختيار سريع لقالب التأشيرة أو الجواز
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              اختر القالب المطلوب للانتقال مباشرة إلى استوديو رفع الصور بالمقاسات المضبوطة مسبقاً
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate(APP_PAGES.PRESETS)}
            className="text-xs font-extrabold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
          >
            <span>كل الإعدادات المتقدمة</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(PHOTO_PRESETS).map((preset) => {
            const isSelected = config.presetId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => onSelectPresetAndGo(preset.id, APP_PAGES.STUDIO)}
                className={`cursor-pointer rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 ${
                  isSelected
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/30 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-emerald-400'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xl">{preset.flag}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {isSelected ? '✓ القالب النشط' : preset.badge}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {preset.name}
                    </h4>
                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {preset.authority}
                    </p>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {preset.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                      {preset.width}×{preset.height} px
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800" dir="ltr">
                      {preset.minSizeKB}–{preset.maxSizeKB} KB
                    </span>
                  </div>

                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span>استخدام</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
