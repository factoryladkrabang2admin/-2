/**
 * Utility functions for parsing and formatting Equipment Requisition dates
 */

export const TH_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const TH_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Robustly parses various date formats found in Google Sheets for Equipment:
 * - DD/MM/YYYY or D/M/YYYY (e.g. "17/4/2026", "27/3/2026")
 * - DD/MM/2569 or Buddhist Era years (e.g. "20/3/2569" or "20/3/0069")
 * - YYYY-MM-DD (e.g. "2026-04-17")
 * - Timestamps (e.g. "27/02/2026, 15:30:00")
 */
export function parseEquipmentDate(raw?: string): Date | null {
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw.trim();
  if (!clean || clean.startsWith('ไม่ระบุ')) return null;

  // Extract first date part before comma, whitespace, or 'T'
  const datePart = clean.split(/[\s,T]+/)[0];

  // Pattern 1: YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(datePart)) {
    const [y, m, d] = datePart.split('-').map(Number);
    const yr = y > 2400 ? y - 543 : y;
    if (!isNaN(yr) && !isNaN(m) && !isNaN(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return new Date(yr, m - 1, d);
    }
  }

  // Pattern 2: DD/MM/YYYY or DD-MM-YYYY
  const parts = datePart.split(/[\/\-]/);
  if (parts.length === 3) {
    let d = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    let y = parseInt(parts[2], 10);

    // If first part is 4-digit year (YYYY/MM/DD)
    if (parts[0].length === 4) {
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10);
      d = parseInt(parts[2], 10);
    }

    // Handle 2-digit years and Buddhist Era (2569 -> 2026)
    if (y < 100) {
      y = y > 50 ? 2500 + y - 543 : 2000 + y;
    } else if (y > 2400) {
      y -= 543;
    }

    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return new Date(y, m - 1, d);
    }
  }

  // Fallback to standard Date parse
  const parsed = new Date(clean);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Extracts a 6-digit date tag (YYMMDD) for Gown Requisition tracking code
 */
export function extractGownDateTag(input?: string | Date): { yy: string; mm: string; dd: string; dateTag: string } {
  let yy = '26';
  let mm = '09';
  let dd = '26';

  if (!input) {
    const today = new Date();
    yy = String(today.getFullYear()).slice(-2);
    mm = String(today.getMonth() + 1).padStart(2, '0');
    dd = String(today.getDate()).padStart(2, '0');
    return { yy, mm, dd, dateTag: `${yy}${mm}${dd}` };
  }

  if (input instanceof Date) {
    let year = input.getFullYear();
    if (year > 2400) year -= 543;
    yy = String(year).slice(-2);
    mm = String(input.getMonth() + 1).padStart(2, '0');
    dd = String(input.getDate()).padStart(2, '0');
    return { yy, mm, dd, dateTag: `${yy}${mm}${dd}` };
  }

  const str = String(input).trim();
  const cleanDate = str.split(/[\s,]+/)[0];

  if (cleanDate.includes('-')) {
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      let year = parseInt(parts[0], 10);
      if (year > 2400) year -= 543;
      yy = String(year).slice(-2);
      mm = parts[1].padStart(2, '0');
      dd = parts[2].padStart(2, '0');
      return { yy, mm, dd, dateTag: `${yy}${mm}${dd}` };
    }
  }

  if (cleanDate.includes('/')) {
    const parts = cleanDate.split('/');
    if (parts.length === 3) {
      let year = parseInt(parts[2], 10);
      if (year > 2400) year -= 543;
      if (year < 100) year += 2000;
      yy = String(year).slice(-2);
      mm = parts[1].padStart(2, '0');
      dd = parts[0].padStart(2, '0');
      return { yy, mm, dd, dateTag: `${yy}${mm}${dd}` };
    }
  }

  const today = new Date();
  yy = String(today.getFullYear()).slice(-2);
  mm = String(today.getMonth() + 1).padStart(2, '0');
  dd = String(today.getDate()).padStart(2, '0');
  return { yy, mm, dd, dateTag: `${yy}${mm}${dd}` };
}

/**
 * Generates tracking code for Gown Requisition (เฉพาะเบิกเสื้อกาวน์)
 * Format: "LKB2 - YYMMDDXX" (e.g. "LKB2 - 26092601", "LKB2 - 26092602")
 */
export function generateGownTrackingCode(
  dateOrTimestamp?: string | Date,
  existingRecords: Array<{ trackingCode?: string; subCategory?: string; actionType?: string }> = [],
  offsetIndex: number = 0
): string {
  const { dateTag } = extractGownDateTag(dateOrTimestamp);
  const prefix = `LKB2 - ${dateTag}`;
  const targetTag = `LKB2${dateTag}`.toUpperCase();
  const altTag = `GWN${dateTag}`.toUpperCase();

  let maxSeq = 0;

  const inspectRecord = (rec: { trackingCode?: string; subCategory?: string; actionType?: string }) => {
    if (!rec || !rec.trackingCode) return;
    if (rec.subCategory && rec.subCategory !== 'gown') return;

    const normalized = rec.trackingCode.replace(/[\s\-_]/g, '').toUpperCase();
    if (normalized.startsWith(targetTag)) {
      const seqStr = normalized.slice(targetTag.length);
      const parsed = parseInt(seqStr, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    } else if (normalized.startsWith(altTag)) {
      const seqStr = normalized.slice(altTag.length);
      const parsed = parseInt(seqStr, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    } else if (normalized.includes(dateTag)) {
      const idx = normalized.indexOf(dateTag);
      const seqStr = normalized.slice(idx + dateTag.length);
      const parsed = parseInt(seqStr, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  };

  // 1. Check existing records passed in
  if (existingRecords && existingRecords.length > 0) {
    for (const rec of existingRecords) {
      inspectRecord(rec);
    }
  }

  // 2. Also check local storage cached records
  try {
    if (typeof window !== 'undefined') {
      const cacheKey = 'proworkflow_equipment_cache_gown';
      const cachedStr = localStorage.getItem(cacheKey);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (Array.isArray(cached)) {
          for (const rec of cached) {
            inspectRecord(rec);
          }
        }
      }
    }
  } catch {
    // ignore
  }

  const nextSeq = String(maxSeq + 1 + offsetIndex).padStart(2, '0');
  return `${prefix}${nextSeq}`;
}
