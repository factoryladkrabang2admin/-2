import { ParcelDeliveryRecord } from '../types';
import { getLocalParcelRecords } from '../services/googleSheetSyncService';

/**
 * Parses date string in multiple formats (DD/MM/YYYY, YYYY-MM-DD, Thai Buddhist year 25xx, or Date object)
 * Returns { yy: '26', mm: '09', dd: '12', dateTag: '260912' }
 */
export function extractParcelDateTag(input?: string | Date): { yy: string; mm: string; dd: string; dateTag: string } {
  let yy = '26';
  let mm = '09';
  let dd = '12';

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

  // Try parsing YYYY-MM-DD
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

  // Try parsing DD/MM/YYYY or D/M/YYYY
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

  // Fallback to today
  const today = new Date();
  yy = String(today.getFullYear()).slice(-2);
  mm = String(today.getMonth() + 1).padStart(2, '0');
  dd = String(today.getDate()).padStart(2, '0');
  return { yy, mm, dd, dateTag: `${yy}${mm}${dd}` };
}

/**
 * Generates tracking code for Parcel Delivery using the EXACT same format and running sequence
 * as the Laundry Status Tracking QR Code:
 * Format: "LKB2 - YYMMDDXX" (e.g. "LKB2 - 26091201", "LKB2 - 26091202")
 */
export function generateParcelTrackingCode(
  dateOrTimestamp?: string | Date,
  existingRecords: ParcelDeliveryRecord[] = [],
  offsetIndex: number = 0
): string {
  const { dateTag } = extractParcelDateTag(dateOrTimestamp);
  const prefix = `LKB2 - ${dateTag}`;
  const targetTag = `LKB2${dateTag}`.toUpperCase();

  let maxSeq = 0;

  // 1. Check passed-in existing records
  if (existingRecords && existingRecords.length > 0) {
    for (const rec of existingRecords) {
      if (!rec.trackingCode) continue;
      const normalized = rec.trackingCode.replace(/[\s\-_]/g, '').toUpperCase();
      if (normalized.startsWith(targetTag)) {
        const seqStr = normalized.slice(targetTag.length);
        const parsed = parseInt(seqStr, 10);
        if (!isNaN(parsed) && parsed > maxSeq) {
          maxSeq = parsed;
        }
      }
    }
  }

  // 2. Also check local storage records to ensure continuous sequence across reloads
  try {
    const localRecords = getLocalParcelRecords();
    for (const rec of localRecords) {
      if (!rec.trackingCode) continue;
      const normalized = rec.trackingCode.replace(/[\s\-_]/g, '').toUpperCase();
      if (normalized.startsWith(targetTag)) {
        const seqStr = normalized.slice(targetTag.length);
        const parsed = parseInt(seqStr, 10);
        if (!isNaN(parsed) && parsed > maxSeq) {
          maxSeq = parsed;
        }
      }
    }
  } catch {
    // ignore
  }

  const nextSeq = String(maxSeq + 1 + offsetIndex).padStart(2, '0');
  return `${prefix}${nextSeq}`;
}

/**
 * Constructs the tracking URL for a parcel tracking code
 */
export function getParcelTrackingUrl(trackingCode: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${window.location.pathname}?tab=document_delivery&track=${encodeURIComponent(trackingCode)}`;
  }
  return `https://ais-pre-kcsgriqdb22tud2aea6ska-762469056329.asia-southeast1.run.app/?tab=document_delivery&track=${encodeURIComponent(trackingCode)}`;
}

/**
 * Assigns tracking codes to "ส่ง" parcel records if missing, ordered chronologically
 * so every "ส่ง" transaction in the system has a consistent, trackable QR code.
 */
export function assignTrackingCodesToParcels(records: ParcelDeliveryRecord[]): ParcelDeliveryRecord[] {
  if (!records || records.length === 0) return [];

  // Group send records by dateTag to assign sequence numbers if missing
  const dateSeqMap = new Map<string, number>();

  // First pass: find existing max sequence per date
  records.forEach((r) => {
    if (r.actionType === 'ส่ง' && r.trackingCode) {
      const { dateTag } = extractParcelDateTag(r.timestamp || r.dateStr);
      const targetTag = `LKB2${dateTag}`.toUpperCase();
      const normalized = r.trackingCode.replace(/[\s\-_]/g, '').toUpperCase();
      if (normalized.startsWith(targetTag)) {
        const parsed = parseInt(normalized.slice(targetTag.length), 10);
        if (!isNaN(parsed)) {
          const current = dateSeqMap.get(dateTag) || 0;
          if (parsed > current) {
            dateSeqMap.set(dateTag, parsed);
          }
        }
      }
    }
  });

  // Second pass: assign tracking codes for "ส่ง" records that do not have one yet
  // We process records in chronological order (by seq ascending) to give earlier rows earlier sequence
  const sortedBySeq = [...records].sort((a, b) => (a.seq || 0) - (b.seq || 0));

  const codeAssignmentMap = new Map<string, string>();
  sortedBySeq.forEach((r) => {
    if (r.actionType === 'ส่ง') {
      if (r.trackingCode) {
        codeAssignmentMap.set(r.id, r.trackingCode);
      } else {
        const { dateTag } = extractParcelDateTag(r.timestamp || r.dateStr);
        const currentSeq = (dateSeqMap.get(dateTag) || 0) + 1;
        dateSeqMap.set(dateTag, currentSeq);
        const generatedCode = `LKB2 - ${dateTag}${String(currentSeq).padStart(2, '0')}`;
        codeAssignmentMap.set(r.id, generatedCode);
      }
    }
  });

  return records.map((r) => {
    if (r.actionType === 'ส่ง') {
      const assigned = codeAssignmentMap.get(r.id);
      if (assigned && r.trackingCode !== assigned) {
        return { ...r, trackingCode: assigned };
      }
    }
    return r;
  });
}
