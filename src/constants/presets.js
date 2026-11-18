export const PHOTO_PRESETS = {
  ksa_mofa: {
    id: 'ksa_mofa',
    name: 'تأشيرة السعودية / موقع الخارجية (افتراضي)',
    shortName: 'تأشيرة السعودية (600×600)',
    badge: 'معتمد لوزارة الخارجية / إنجاز',
    width: 600,
    height: 600,
    minSizeKB: 15,
    maxSizeKB: 200,
    strictLimitKB: 240,
    dpi: 300,
    aspectRatio: '1:1',
    headRatioPercent: 68,
    topMarginPercent: 9,
    bgColor: '#FFFFFF',
    description:
      'مقاس 600×600 بكسل (2×2 بوصة مربع)، خلفية بيضاء ناصعة #FFFFFF، بصيغة JPEG وحجم مضمون بين 15 KB و 240 KB.',
  },
  standard_passport: {
    id: 'standard_passport',
    name: 'مقاس جواز سفر قياسي (4×6 سم)',
    shortName: 'جواز سفر قياسي (4×6 سم)',
    badge: '300 DPI قياسي',
    width: 472,
    height: 709,
    minSizeKB: 15,
    maxSizeKB: 220,
    strictLimitKB: 240,
    dpi: 300,
    aspectRatio: '2:3',
    headRatioPercent: 66,
    topMarginPercent: 10,
    bgColor: '#FFFFFF',
    description:
      'مقاس 472×709 بكسل (4×6 سم بدقة 300 نقطة في البوصة)، خلفية بيضاء ناصعة #FFFFFF.',
  },
  custom: {
    id: 'custom',
    name: 'مقاس مخصص (Custom)',
    shortName: 'مقاس مخصص',
    badge: 'تخصيص حر',
    width: 600,
    height: 600,
    minSizeKB: 15,
    maxSizeKB: 200,
    strictLimitKB: 240,
    dpi: 300,
    aspectRatio: 'مخصص',
    headRatioPercent: 68,
    topMarginPercent: 9,
    bgColor: '#FFFFFF',
    description: 'حدد العرض والارتفاع بالبكسل والحد الأقصى والأدنى لحجم الملف بالكيلوبايت يدوياً.',
  },
};

export const DEFAULT_PROCESSING_CONFIG = {
  presetId: 'ksa_mofa',
  width: 600,
  height: 600,
  minSizeKB: 15,
  maxSizeKB: 200,
  strictLimitKB: 240,
  headRatioPercent: 68, // 65-70% head height ratio
  topMarginPercent: 9,  // Top headroom margin above actual top of head/hijab/ghutra
  brightness: 100,      // 50 to 150 (%)
  contrast: 100,        // 50 to 150 (%)
  sharpness: 15,        // 0 to 100 (%) - subtle default sharpness for crisp facial features
  edgeSmoothing: 1.5,   // 0 to 5 (px feathering for natural transition onto white background)
  concurrency: 2,       // Process 2 images at a time so browser stays responsive
};

export const PHOTO_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
};

export const STATUS_LABELS = {
  [PHOTO_STATUS.PENDING]: {
    text: 'في الانتظار',
    bgClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    dotClass: 'bg-amber-500',
  },
  [PHOTO_STATUS.PROCESSING]: {
    text: 'جاري المعالجة...',
    bgClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    dotClass: 'bg-blue-500 animate-ping',
  },
  [PHOTO_STATUS.READY]: {
    text: 'جاهز للتحميل',
    bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    dotClass: 'bg-emerald-500',
  },
  [PHOTO_STATUS.FAILED]: {
    text: 'فشل المعالجة',
    bgClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    dotClass: 'bg-rose-500',
  },
};
