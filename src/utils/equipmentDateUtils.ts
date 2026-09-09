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
