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
 * Assigns tracking codes to parcel records ("ส่ง" and "รับ") if missing, ordered chronologically
 * so every transaction in the system has a consistent, trackable tracking code.
 */
export function assignTrackingCodesToParcels(records: ParcelDeliveryRecord[]): ParcelDeliveryRecord[] {
  if (!records || records.length === 0) return [];

  // Group records by dateTag to assign sequence numbers if missing
  const dateSeqMap = new Map<string, number>();

  // First pass: find existing max sequence per date across all records with tracking codes
  records.forEach((r) => {
    if (r.trackingCode) {
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

  // Sort by sequence or timestamp
  const sortedBySeq = [...records].sort((a, b) => (a.seq || 0) - (b.seq || 0));

  const codeAssignmentMap = new Map<string, string>();
  // Map of known send items by normalized title/sender to match with receive items
  const sendItemMap = new Map<string, string>();

  sortedBySeq.forEach((r) => {
    if (r.actionType === 'ส่ง') {
      let code = r.trackingCode;
      if (!code) {
        const { dateTag } = extractParcelDateTag(r.timestamp || r.dateStr);
        const currentSeq = (dateSeqMap.get(dateTag) || 0) + 1;
        dateSeqMap.set(dateTag, currentSeq);
        code = `LKB2 - ${dateTag}${String(currentSeq).padStart(2, '0')}`;
      }
      codeAssignmentMap.set(r.id, code);

      // Index for matching with 'รับ'
      if (r.itemTitle) {
        const key = `${r.itemTitle.trim().toLowerCase()}_${(r.senderName || '').trim().toLowerCase()}`;
        sendItemMap.set(key, code);
      }
    }
  });

  // Assign for 'รับ' records
  sortedBySeq.forEach((r) => {
    if (r.actionType === 'รับ') {
      if (r.trackingCode) {
        codeAssignmentMap.set(r.id, r.trackingCode);
      } else {
        // Try to match with send item
        let matchedCode: string | undefined;
        if (r.itemTitle) {
          const key = `${r.itemTitle.trim().toLowerCase()}_${(r.senderName || '').trim().toLowerCase()}`;
          matchedCode = sendItemMap.get(key);
        }

        if (matchedCode) {
          codeAssignmentMap.set(r.id, matchedCode);
        } else {
          // Generate tracking code for this received record
          const { dateTag } = extractParcelDateTag(r.timestamp || r.dateStr);
          const currentSeq = (dateSeqMap.get(dateTag) || 0) + 1;
          dateSeqMap.set(dateTag, currentSeq);
          const generatedCode = `LKB2 - ${dateTag}${String(currentSeq).padStart(2, '0')}`;
          codeAssignmentMap.set(r.id, generatedCode);
        }
      }
    }
  });

  return records.map((r) => {
    const assigned = codeAssignmentMap.get(r.id);
    if (assigned && r.trackingCode !== assigned) {
      return { ...r, trackingCode: assigned };
    }
    return r;
  });
}

/**
 * Checks if a parcel record represents a received document/parcel ("รับ")
 */
export function isParcelReceived(actionType?: string): boolean {
  return (actionType || '').trim() === 'รับ';
}

/**
 * Normalizes tracking code for comparison by stripping whitespace, hyphens, and lowercase/uppercase
 */
export function normalizeParcelTrackingCode(code?: string): string {
  if (!code) return '';
  return code.replace(/[\s\-_]/g, '').toUpperCase();
}

/**
 * Gets a set of tracking codes and item keys that have been confirmed received ("รับแล้ว")
 */
export function getReceivedTrackingCodesSet(records: ParcelDeliveryRecord[]): Set<string> {
  const receivedCodes = new Set<string>();

  // 1. From records in memory
  if (Array.isArray(records)) {
    records.forEach((r) => {
      if (r.actionType === 'รับ') {
        if (r.trackingCode) {
          const norm = normalizeParcelTrackingCode(r.trackingCode);
          if (norm) receivedCodes.add(norm);
        }
        if (r.itemTitle) {
          receivedCodes.add(`title:${r.itemTitle.trim().toLowerCase()}`);
        }
      } else if (r.actionType === 'ส่ง') {
        const isStatusReceived =
          (r.status || '').includes('รับแล้ว') ||
          (r.note || '').includes('รับแล้ว');
        if (isStatusReceived && r.trackingCode) {
          const norm = normalizeParcelTrackingCode(r.trackingCode);
          if (norm) receivedCodes.add(norm);
        }
      }
    });
  }

  // 2. From localStorage cache of received tracking codes
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('proworkflow_received_tracking_codes_v1');
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) {
          arr.forEach((c) => {
            if (typeof c === 'string') {
              receivedCodes.add(normalizeParcelTrackingCode(c));
            }
          });
        }
      }
    } catch {}
  }

  return receivedCodes;
}

/**
 * Checks if a parcel record represents a received document/parcel, OR
 * if an outgoing ("ส่ง") document/parcel has been received ("รับแล้ว").
 */
export function isParcelConfirmedReceived(
  record: ParcelDeliveryRecord,
  allRecords?: ParcelDeliveryRecord[],
  receivedCodesSet?: Set<string>
): boolean {
  if (!record) return false;

  // 1. Incoming ("รับ") is always received
  if (record.actionType === 'รับ') return true;

  // 2. Explicit status or note indicating "รับแล้ว"
  if (
    (record.status || '').includes('รับแล้ว') ||
    (record.note || '').includes('รับแล้ว')
  ) {
    return true;
  }

  const normCode = normalizeParcelTrackingCode(record.trackingCode);
  const titleKey = record.itemTitle ? `title:${record.itemTitle.trim().toLowerCase()}` : '';

  // 3. Check against pre-computed or on-the-fly received set
  const set = receivedCodesSet || (allRecords ? getReceivedTrackingCodesSet(allRecords) : null);
  if (set) {
    if (normCode && set.has(normCode)) return true;
    if (titleKey && set.has(titleKey)) return true;
  }

  // 4. Fallback check directly against allRecords if set was not provided
  if (allRecords && allRecords.length > 0) {
    const isMatchedInRecords = allRecords.some((r) => {
      if (r.actionType !== 'รับ') return false;
      if (normCode && r.trackingCode && normalizeParcelTrackingCode(r.trackingCode) === normCode) {
        return true;
      }
      if (
        record.itemTitle &&
        r.itemTitle &&
        record.itemTitle.trim().toLowerCase() === r.itemTitle.trim().toLowerCase()
      ) {
        return true;
      }
      return false;
    });
    if (isMatchedInRecords) return true;
  }

  // 5. Check localStorage directly
  if (normCode && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('proworkflow_received_tracking_codes_v1');
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.some((c) => normalizeParcelTrackingCode(c) === normCode)) {
          return true;
        }
      }
    } catch {}
  }

  return false;
}

/**
 * Saves a tracking code or item title to local received cache
 */
export function markTrackingCodeAsReceivedLocally(trackingCode?: string, itemTitle?: string) {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem('proworkflow_received_tracking_codes_v1');
    let arr: string[] = [];
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) arr = parsed;
      } catch {}
    }

    if (trackingCode) {
      const norm = normalizeParcelTrackingCode(trackingCode);
      if (norm && !arr.includes(norm)) arr.push(norm);
    }
    if (itemTitle) {
      const titleKey = `title:${itemTitle.trim().toLowerCase()}`;
      if (!arr.includes(titleKey)) arr.push(titleKey);
    }

    localStorage.setItem('proworkflow_received_tracking_codes_v1', JSON.stringify(arr));
    // Trigger storage event for live reactive updates across components
    window.dispatchEvent(new Event('parcel_received_updated'));
  } catch {}
}

/**
 * Formats display text for received parcels, e.g. "LKB2 - 26091201 รับแล้ว"
 */
export function formatReceivedTrackingBadge(trackingCode?: string): {
  code: string;
  suffix: string;
  fullText: string;
} {
  const clean = (trackingCode || '').trim();
  const baseCode = clean.replace(/รับแล้ว$/g, '').trim();
  return {
    code: baseCode,
    suffix: 'รับแล้ว',
    fullText: baseCode ? `${baseCode} รับแล้ว` : 'รับแล้ว',
  };
}

export interface CheckAlreadyReceivedResult {
  isAlreadyReceived: boolean;
  reason?: 'tracking_code_received' | 'outgoing_confirmed' | 'duplicate_item_match' | 'local_cache';
  matchedRecord?: ParcelDeliveryRecord;
  message?: string;
  duplicateDetails?: {
    timestamp?: string;
    itemTitle?: string;
    senderName?: string;
    recipientName?: string;
    recipientDepartment?: string;
    operatorName?: string;
    trackingCode?: string;
  };
}

/**
 * Checks if a parcel or tracking code has already been received, preventing duplicate transactions.
 * (ตั้งค่าเลขรหัส หรือ ข้อมูลที่ถูกรับไปแล้ว ไม่สามารถทำรายการซ้ำได้)
 */
export function checkParcelAlreadyReceived(options: {
  queryTrackingCode?: string;
  trackingCode?: string;
  itemTitle?: string;
  senderName?: string;
  recipientName?: string;
  actionType?: 'รับ' | 'ส่ง';
  allRecords?: ParcelDeliveryRecord[];
}): CheckAlreadyReceivedResult {
  const effectiveCode = options.queryTrackingCode || options.trackingCode;
  const { itemTitle, senderName, recipientName, actionType = 'รับ', allRecords = [] } = options;

  const normCode = normalizeParcelTrackingCode(effectiveCode);
  const receivedCodesSet = getReceivedTrackingCodesSet(allRecords);

  // 1. Check by Tracking Code
  if (normCode) {
    // Check if there is an incoming ("รับ") record with this tracking code
    const incomingMatch = allRecords.find(
      (r) => r.actionType === 'รับ' && r.trackingCode && normalizeParcelTrackingCode(r.trackingCode) === normCode
    );
    if (incomingMatch) {
      return {
        isAlreadyReceived: true,
        reason: 'tracking_code_received',
        matchedRecord: incomingMatch,
        message: `รหัสติดตาม "${effectiveCode}" ถูกบันทึกรับไปแล้วเมื่อ ${incomingMatch.timestamp || 'ก่อนหน้านี้'} โดย ${incomingMatch.recipientName || 'ผู้รับ'} (${incomingMatch.recipientDepartment || '-'}) ไม่สามารถทำรายการซ้ำได้`,
        duplicateDetails: {
          timestamp: incomingMatch.timestamp,
          itemTitle: incomingMatch.itemTitle,
          senderName: incomingMatch.senderName,
          recipientName: incomingMatch.recipientName,
          recipientDepartment: incomingMatch.recipientDepartment,
          operatorName: incomingMatch.operatorName,
          trackingCode: incomingMatch.trackingCode,
        },
      };
    }

    // Check if there is an outgoing ("ส่ง") record with this tracking code that has already been received
    const outgoingMatch = allRecords.find(
      (r) => r.actionType === 'ส่ง' && r.trackingCode && normalizeParcelTrackingCode(r.trackingCode) === normCode
    );
    if (outgoingMatch && isParcelConfirmedReceived(outgoingMatch, allRecords, receivedCodesSet)) {
      return {
        isAlreadyReceived: true,
        reason: 'outgoing_confirmed',
        matchedRecord: outgoingMatch,
        message: `รหัสติดตาม "${effectiveCode}" (${outgoingMatch.itemTitle || 'เอกสาร/พัสดุ'}) มีสถานะรับแล้ว ไม่สามารถทำรายการรับซ้ำได้`,
        duplicateDetails: {
          timestamp: outgoingMatch.timestamp,
          itemTitle: outgoingMatch.itemTitle,
          senderName: outgoingMatch.senderName,
          recipientName: outgoingMatch.recipientName,
          recipientDepartment: outgoingMatch.recipientDepartment,
          operatorName: outgoingMatch.operatorName,
          trackingCode: outgoingMatch.trackingCode,
        },
      };
    }

    // Check against local cached received codes
    if (receivedCodesSet.has(normCode)) {
      return {
        isAlreadyReceived: true,
        reason: 'local_cache',
        message: `รหัสติดตาม "${effectiveCode}" ถูกทำรายการรับไปแล้ว ไม่สามารถทำรายการซ้ำได้`,
        duplicateDetails: {
          trackingCode: effectiveCode,
        },
      };
    }
  }

  // 2. If actionType is 'รับ', check by Item Title + Sender + Recipient matching
  if (actionType === 'รับ' && itemTitle && itemTitle.trim() && senderName && senderName.trim() && recipientName && recipientName.trim()) {
    const cleanTitle = itemTitle.trim().toLowerCase();
    const cleanSender = senderName.trim().toLowerCase();
    const cleanRecipient = recipientName.trim().toLowerCase();

    const duplicateReceivedMatch = allRecords.find((r) => {
      if (r.actionType !== 'รับ') return false;
      const rTitle = (r.itemTitle || '').trim().toLowerCase();
      const rSender = (r.senderName || '').trim().toLowerCase();
      const rRecipient = (r.recipientName || '').trim().toLowerCase();
      return rTitle === cleanTitle && rSender === cleanSender && rRecipient === cleanRecipient;
    });

    if (duplicateReceivedMatch) {
      return {
        isAlreadyReceived: true,
        reason: 'duplicate_item_match',
        matchedRecord: duplicateReceivedMatch,
        message: `ข้อมูลเอกสาร/พัสดุ "${itemTitle}" (จาก ${senderName} ถึง ${recipientName}) ถูกทำรายการรับไปแล้วเมื่อ ${duplicateReceivedMatch.timestamp || 'ก่อนหน้านี้'} ไม่สามารถทำรายการซ้ำได้`,
        duplicateDetails: {
          timestamp: duplicateReceivedMatch.timestamp,
          itemTitle: duplicateReceivedMatch.itemTitle,
          senderName: duplicateReceivedMatch.senderName,
          recipientName: duplicateReceivedMatch.recipientName,
          recipientDepartment: duplicateReceivedMatch.recipientDepartment,
          operatorName: duplicateReceivedMatch.operatorName,
          trackingCode: duplicateReceivedMatch.trackingCode,
        },
      };
    }
  }

  return { isAlreadyReceived: false };
}

