/**
 * Color Helper utility for distinct Department and Garment Type styling
 * Provides high-contrast, accessible, and elegant Tailwind and Hex color palettes.
 */

export interface ColorBadgeStyle {
  bg: string;
  text: string;
  border: string;
  dot: string;
  hex: string;
  icon: string;
  pill: string;
  lightHex: string;
  accentBg: string;
}

// Preset color map for known departments
const DEPARTMENT_PRESETS: Record<string, ColorBadgeStyle> = {
  '2/1': {
    bg: 'bg-sky-50',
    text: 'text-sky-900',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
    hex: '#0284c7',
    icon: 'text-sky-600',
    pill: 'bg-sky-50 text-sky-900 border-sky-200',
    lightHex: '#e0f2fe',
    accentBg: 'bg-sky-100/80',
  },
  '2/2': {
    bg: 'bg-blue-50',
    text: 'text-blue-900',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    hex: '#2563eb',
    icon: 'text-blue-600',
    pill: 'bg-blue-50 text-blue-900 border-blue-200',
    lightHex: '#dbeafe',
    accentBg: 'bg-blue-100/80',
  },
  '2/3': {
    bg: 'bg-indigo-50',
    text: 'text-indigo-900',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500',
    hex: '#4f46e5',
    icon: 'text-indigo-600',
    pill: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    lightHex: '#e0e7ff',
    accentBg: 'bg-indigo-100/80',
  },
  '3/1': {
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    hex: '#d97706',
    icon: 'text-amber-600',
    pill: 'bg-amber-50 text-amber-900 border-amber-200',
    lightHex: '#fef3c7',
    accentBg: 'bg-amber-100/80',
  },
  '3/2': {
    bg: 'bg-orange-50',
    text: 'text-orange-900',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    hex: '#ea580c',
    icon: 'text-orange-600',
    pill: 'bg-orange-50 text-orange-900 border-orange-200',
    lightHex: '#ffedd5',
    accentBg: 'bg-orange-100/80',
  },
  '3/3': {
    bg: 'bg-purple-50',
    text: 'text-purple-900',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    hex: '#9333ea',
    icon: 'text-purple-600',
    pill: 'bg-purple-50 text-purple-900 border-purple-200',
    lightHex: '#f3e8ff',
    accentBg: 'bg-purple-100/80',
  },
  '3/4': {
    bg: 'bg-pink-50',
    text: 'text-pink-900',
    border: 'border-pink-200',
    dot: 'bg-pink-500',
    hex: '#db2777',
    icon: 'text-pink-600',
    pill: 'bg-pink-50 text-pink-900 border-pink-200',
    lightHex: '#fce7f3',
    accentBg: 'bg-pink-100/80',
  },
  '3/5': {
    bg: 'bg-rose-50',
    text: 'text-rose-900',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    hex: '#e11d48',
    icon: 'text-rose-600',
    pill: 'bg-rose-50 text-rose-900 border-rose-200',
    lightHex: '#ffe4e6',
    accentBg: 'bg-rose-100/80',
  },
  'A/2': {
    bg: 'bg-teal-50',
    text: 'text-teal-900',
    border: 'border-teal-200',
    dot: 'bg-teal-500',
    hex: '#0d9488',
    icon: 'text-teal-600',
    pill: 'bg-teal-50 text-teal-900 border-teal-200',
    lightHex: '#ccfbf1',
    accentBg: 'bg-teal-100/80',
  },
  'A/3': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-900',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    hex: '#059669',
    icon: 'text-emerald-600',
    pill: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    lightHex: '#d1fae5',
    accentBg: 'bg-emerald-100/80',
  },
  'B/1': {
    bg: 'bg-violet-50',
    text: 'text-violet-900',
    border: 'border-violet-200',
    dot: 'bg-violet-500',
    hex: '#7c3aed',
    icon: 'text-violet-600',
    pill: 'bg-violet-50 text-violet-900 border-violet-200',
    lightHex: '#ede9fe',
    accentBg: 'bg-violet-100/80',
  },
  'ธุรการ': {
    bg: 'bg-slate-100',
    text: 'text-slate-900',
    border: 'border-slate-300',
    dot: 'bg-slate-500',
    hex: '#475569',
    icon: 'text-slate-600',
    pill: 'bg-slate-100 text-slate-900 border-slate-300',
    lightHex: '#f1f5f9',
    accentBg: 'bg-slate-200/80',
  },
};

// Fallback palette loop for any department not in presets
const DEPARTMENT_PALETTE_LIST: ColorBadgeStyle[] = [
  {
    bg: 'bg-sky-50',
    text: 'text-sky-900',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
    hex: '#0284c7',
    icon: 'text-sky-600',
    pill: 'bg-sky-50 text-sky-900 border-sky-200',
    lightHex: '#e0f2fe',
    accentBg: 'bg-sky-100/80',
  },
  {
    bg: 'bg-indigo-50',
    text: 'text-indigo-900',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500',
    hex: '#4f46e5',
    icon: 'text-indigo-600',
    pill: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    lightHex: '#e0e7ff',
    accentBg: 'bg-indigo-100/80',
  },
  {
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    hex: '#d97706',
    icon: 'text-amber-600',
    pill: 'bg-amber-50 text-amber-900 border-amber-200',
    lightHex: '#fef3c7',
    accentBg: 'bg-amber-100/80',
  },
  {
    bg: 'bg-purple-50',
    text: 'text-purple-900',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    hex: '#9333ea',
    icon: 'text-purple-600',
    pill: 'bg-purple-50 text-purple-900 border-purple-200',
    lightHex: '#f3e8ff',
    accentBg: 'bg-purple-100/80',
  },
  {
    bg: 'bg-teal-50',
    text: 'text-teal-900',
    border: 'border-teal-200',
    dot: 'bg-teal-500',
    hex: '#0d9488',
    icon: 'text-teal-600',
    pill: 'bg-teal-50 text-teal-900 border-teal-200',
    lightHex: '#ccfbf1',
    accentBg: 'bg-teal-100/80',
  },
  {
    bg: 'bg-rose-50',
    text: 'text-rose-900',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    hex: '#e11d48',
    icon: 'text-rose-600',
    pill: 'bg-rose-50 text-rose-900 border-rose-200',
    lightHex: '#ffe4e6',
    accentBg: 'bg-rose-100/80',
  },
  {
    bg: 'bg-blue-50',
    text: 'text-blue-900',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    hex: '#2563eb',
    icon: 'text-blue-600',
    pill: 'bg-blue-50 text-blue-900 border-blue-200',
    lightHex: '#dbeafe',
    accentBg: 'bg-blue-100/80',
  },
  {
    bg: 'bg-orange-50',
    text: 'text-orange-900',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    hex: '#ea580c',
    icon: 'text-orange-600',
    pill: 'bg-orange-50 text-orange-900 border-orange-200',
    lightHex: '#ffedd5',
    accentBg: 'bg-orange-100/80',
  },
  {
    bg: 'bg-cyan-50',
    text: 'text-cyan-900',
    border: 'border-cyan-200',
    dot: 'bg-cyan-500',
    hex: '#0891b2',
    icon: 'text-cyan-600',
    pill: 'bg-cyan-50 text-cyan-900 border-cyan-200',
    lightHex: '#cffafe',
    accentBg: 'bg-cyan-100/80',
  },
  {
    bg: 'bg-fuchsia-50',
    text: 'text-fuchsia-900',
    border: 'border-fuchsia-200',
    dot: 'bg-fuchsia-500',
    hex: '#c026d3',
    icon: 'text-fuchsia-600',
    pill: 'bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200',
    lightHex: '#fae8ff',
    accentBg: 'bg-fuchsia-100/80',
  },
  {
    bg: 'bg-lime-50',
    text: 'text-lime-900',
    border: 'border-lime-200',
    dot: 'bg-lime-600',
    hex: '#65a30d',
    icon: 'text-lime-600',
    pill: 'bg-lime-50 text-lime-900 border-lime-200',
    lightHex: '#ecfccb',
    accentBg: 'bg-lime-100/80',
  },
  {
    bg: 'bg-slate-100',
    text: 'text-slate-900',
    border: 'border-slate-300',
    dot: 'bg-slate-500',
    hex: '#475569',
    icon: 'text-slate-600',
    pill: 'bg-slate-100 text-slate-900 border-slate-300',
    lightHex: '#f1f5f9',
    accentBg: 'bg-slate-200/80',
  },
];

// Preset color map for known garment types
const GARMENT_PRESETS: Record<string, ColorBadgeStyle> = {
  'เสื้อกาวน์สีเขียว': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-900',
    border: 'border-emerald-300',
    dot: 'bg-emerald-500',
    hex: '#059669',
    icon: 'text-emerald-600',
    pill: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    lightHex: '#d1fae5',
    accentBg: 'bg-emerald-100/80',
  },
  'เสื้อกาวน์': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-900',
    border: 'border-emerald-300',
    dot: 'bg-emerald-500',
    hex: '#059669',
    icon: 'text-emerald-600',
    pill: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    lightHex: '#d1fae5',
    accentBg: 'bg-emerald-100/80',
  },
  'ผ้ากรองแอร์': {
    bg: 'bg-cyan-50',
    text: 'text-cyan-900',
    border: 'border-cyan-300',
    dot: 'bg-cyan-500',
    hex: '#0891b2',
    icon: 'text-cyan-600',
    pill: 'bg-cyan-50 text-cyan-900 border-cyan-300',
    lightHex: '#cffafe',
    accentBg: 'bg-cyan-100/80',
  },
  'ผ้าคลุมเตียง': {
    bg: 'bg-blue-50',
    text: 'text-blue-900',
    border: 'border-blue-300',
    dot: 'bg-blue-500',
    hex: '#2563eb',
    icon: 'text-blue-600',
    pill: 'bg-blue-50 text-blue-900 border-blue-300',
    lightHex: '#dbeafe',
    accentBg: 'bg-blue-100/80',
  },
  'ผ้าปูที่นอน': {
    bg: 'bg-sky-50',
    text: 'text-sky-900',
    border: 'border-sky-300',
    dot: 'bg-sky-500',
    hex: '#0284c7',
    icon: 'text-sky-600',
    pill: 'bg-sky-50 text-sky-900 border-sky-300',
    lightHex: '#e0f2fe',
    accentBg: 'bg-sky-100/80',
  },
  'ผ้าเช็ดมือ': {
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
    hex: '#d97706',
    icon: 'text-amber-600',
    pill: 'bg-amber-50 text-amber-900 border-amber-300',
    lightHex: '#fef3c7',
    accentBg: 'bg-amber-100/80',
  },
  'ผ้าขนหนู': {
    bg: 'bg-orange-50',
    text: 'text-orange-900',
    border: 'border-orange-300',
    dot: 'bg-orange-500',
    hex: '#ea580c',
    icon: 'text-orange-600',
    pill: 'bg-orange-50 text-orange-900 border-orange-300',
    lightHex: '#ffedd5',
    accentBg: 'bg-orange-100/80',
  },
  'ชุดหมี': {
    bg: 'bg-indigo-50',
    text: 'text-indigo-900',
    border: 'border-indigo-300',
    dot: 'bg-indigo-500',
    hex: '#4f46e5',
    icon: 'text-indigo-600',
    pill: 'bg-indigo-50 text-indigo-900 border-indigo-300',
    lightHex: '#e0e7ff',
    accentBg: 'bg-indigo-100/80',
  },
  'ชุดปฏิบัติการ': {
    bg: 'bg-violet-50',
    text: 'text-violet-900',
    border: 'border-violet-300',
    dot: 'bg-violet-500',
    hex: '#7c3aed',
    icon: 'text-violet-600',
    pill: 'bg-violet-50 text-violet-900 border-violet-300',
    lightHex: '#ede9fe',
    accentBg: 'bg-violet-100/80',
  },
  'ปลอกหมอน': {
    bg: 'bg-purple-50',
    text: 'text-purple-900',
    border: 'border-purple-300',
    dot: 'bg-purple-500',
    hex: '#9333ea',
    icon: 'text-purple-600',
    pill: 'bg-purple-50 text-purple-900 border-purple-300',
    lightHex: '#f3e8ff',
    accentBg: 'bg-purple-100/80',
  },
  'ผ้าขวางเตียง': {
    bg: 'bg-teal-50',
    text: 'text-teal-900',
    border: 'border-teal-300',
    dot: 'bg-teal-500',
    hex: '#0d9488',
    icon: 'text-teal-600',
    pill: 'bg-teal-50 text-teal-900 border-teal-200',
    lightHex: '#ccfbf1',
    accentBg: 'bg-teal-100/80',
  },
  'ผ้าเช็ดโต๊ะ': {
    bg: 'bg-stone-100',
    text: 'text-stone-900',
    border: 'border-stone-300',
    dot: 'bg-stone-500',
    hex: '#78716c',
    icon: 'text-stone-600',
    pill: 'bg-stone-100 text-stone-900 border-stone-300',
    lightHex: '#f5f5f4',
    accentBg: 'bg-stone-200/80',
  },
  'ถุงมือ': {
    bg: 'bg-fuchsia-50',
    text: 'text-fuchsia-900',
    border: 'border-fuchsia-300',
    dot: 'bg-fuchsia-500',
    hex: '#c026d3',
    icon: 'text-fuchsia-600',
    pill: 'bg-fuchsia-50 text-fuchsia-900 border-fuchsia-300',
    lightHex: '#fae8ff',
    accentBg: 'bg-fuchsia-100/80',
  },
};

// Fallback garment palette list
const GARMENT_PALETTE_LIST: ColorBadgeStyle[] = [
  {
    bg: 'bg-emerald-50',
    text: 'text-emerald-900',
    border: 'border-emerald-300',
    dot: 'bg-emerald-500',
    hex: '#059669',
    icon: 'text-emerald-600',
    pill: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    lightHex: '#d1fae5',
    accentBg: 'bg-emerald-100/80',
  },
  {
    bg: 'bg-cyan-50',
    text: 'text-cyan-900',
    border: 'border-cyan-300',
    dot: 'bg-cyan-500',
    hex: '#0891b2',
    icon: 'text-cyan-600',
    pill: 'bg-cyan-50 text-cyan-900 border-cyan-300',
    lightHex: '#cffafe',
    accentBg: 'bg-cyan-100/80',
  },
  {
    bg: 'bg-blue-50',
    text: 'text-blue-900',
    border: 'border-blue-300',
    dot: 'bg-blue-500',
    hex: '#2563eb',
    icon: 'text-blue-600',
    pill: 'bg-blue-50 text-blue-900 border-blue-300',
    lightHex: '#dbeafe',
    accentBg: 'bg-blue-100/80',
  },
  {
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
    hex: '#d97706',
    icon: 'text-amber-600',
    pill: 'bg-amber-50 text-amber-900 border-amber-300',
    lightHex: '#fef3c7',
    accentBg: 'bg-amber-100/80',
  },
  {
    bg: 'bg-purple-50',
    text: 'text-purple-900',
    border: 'border-purple-300',
    dot: 'bg-purple-500',
    hex: '#9333ea',
    icon: 'text-purple-600',
    pill: 'bg-purple-50 text-purple-900 border-purple-300',
    lightHex: '#f3e8ff',
    accentBg: 'bg-purple-100/80',
  },
  {
    bg: 'bg-teal-50',
    text: 'text-teal-900',
    border: 'border-teal-300',
    dot: 'bg-teal-500',
    hex: '#0d9488',
    icon: 'text-teal-600',
    pill: 'bg-teal-50 text-teal-900 border-teal-300',
    lightHex: '#ccfbf1',
    accentBg: 'bg-teal-100/80',
  },
  {
    bg: 'bg-indigo-50',
    text: 'text-indigo-900',
    border: 'border-indigo-300',
    dot: 'bg-indigo-500',
    hex: '#4f46e5',
    icon: 'text-indigo-600',
    pill: 'bg-indigo-50 text-indigo-900 border-indigo-300',
    lightHex: '#e0e7ff',
    accentBg: 'bg-indigo-100/80',
  },
  {
    bg: 'bg-rose-50',
    text: 'text-rose-900',
    border: 'border-rose-300',
    dot: 'bg-rose-500',
    hex: '#e11d48',
    icon: 'text-rose-600',
    pill: 'bg-rose-50 text-rose-900 border-rose-300',
    lightHex: '#ffe4e6',
    accentBg: 'bg-rose-100/80',
  },
  {
    bg: 'bg-fuchsia-50',
    text: 'text-fuchsia-900',
    border: 'border-fuchsia-300',
    dot: 'bg-fuchsia-500',
    hex: '#c026d3',
    icon: 'text-fuchsia-600',
    pill: 'bg-fuchsia-50 text-fuchsia-900 border-fuchsia-300',
    lightHex: '#fae8ff',
    accentBg: 'bg-fuchsia-100/80',
  },
  {
    bg: 'bg-orange-50',
    text: 'text-orange-900',
    border: 'border-orange-300',
    dot: 'bg-orange-500',
    hex: '#ea580c',
    icon: 'text-orange-600',
    pill: 'bg-orange-50 text-orange-900 border-orange-300',
    lightHex: '#ffedd5',
    accentBg: 'bg-orange-100/80',
  },
  {
    bg: 'bg-lime-50',
    text: 'text-lime-900',
    border: 'border-lime-300',
    dot: 'bg-lime-600',
    hex: '#65a30d',
    icon: 'text-lime-600',
    pill: 'bg-lime-50 text-lime-900 border-lime-300',
    lightHex: '#ecfccb',
    accentBg: 'bg-lime-100/80',
  },
  {
    bg: 'bg-stone-100',
    text: 'text-stone-900',
    border: 'border-stone-300',
    dot: 'bg-stone-500',
    hex: '#78716c',
    icon: 'text-stone-600',
    pill: 'bg-stone-100 text-stone-900 border-stone-300',
    lightHex: '#f5f5f4',
    accentBg: 'bg-stone-200/80',
  },
];

/**
 * Hash function to stably get an index from a string
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Get distinct color styling for a Department (แผนก)
 */
export function getDepartmentColor(department: string | undefined | null): ColorBadgeStyle {
  if (!department) {
    return DEPARTMENT_PALETTE_LIST[0];
  }
  const clean = department.trim().toUpperCase();
  
  // Direct match
  if (DEPARTMENT_PRESETS[clean]) {
    return DEPARTMENT_PRESETS[clean];
  }
  // Check substring matches
  for (const [key, style] of Object.entries(DEPARTMENT_PRESETS)) {
    if (clean === key || clean.startsWith(key) || clean.includes(key)) {
      return style;
    }
  }

  // Consistent fallback by hash
  const idx = hashString(clean) % DEPARTMENT_PALETTE_LIST.length;
  return DEPARTMENT_PALETTE_LIST[idx];
}

/**
 * Get distinct color styling for a Garment Type (ประเภทของผ้า)
 */
export function getGarmentColor(garment: string | undefined | null): ColorBadgeStyle {
  if (!garment) {
    return GARMENT_PALETTE_LIST[0];
  }
  const clean = garment.trim();

  // Direct match
  if (GARMENT_PRESETS[clean]) {
    return GARMENT_PRESETS[clean];
  }
  // Check substring matches
  for (const [key, style] of Object.entries(GARMENT_PRESETS)) {
    if (clean.includes(key) || key.includes(clean)) {
      return style;
    }
  }

  // Consistent fallback by hash
  const idx = hashString(clean) % GARMENT_PALETTE_LIST.length;
  return GARMENT_PALETTE_LIST[idx];
}
