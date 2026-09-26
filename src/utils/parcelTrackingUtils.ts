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
 * Checks if a parcel record was sent or created within the current day (วันปัจจุบัน).
 * Supports Western calendar, Thai Buddhist calendar, and Asia/Bangkok timezone.
 */
export function isParcelRecordToday(
  record?: { dateStr?: string; timestamp?: string; sentDateStr?: string; sentTimestamp?: string } | null
): boolean {
  if (!record) return false;
  const target = record.sentDateStr || record.sentTimestamp || record.dateStr || record.timestamp;
  if (!target) return false;

  const today = new Date();
  const d = today.getDate();
  const m = today.getMonth() + 1;
  const y = today.getFullYear();

  let bkkD = d;
  let bkkM = m;
  let bkkY = y;
  try {
    const bkkParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok' }).format(today).split('/');
    bkkD = parseInt(bkkParts[0], 10);
    bkkM = parseInt(bkkParts[1], 10);
    bkkY = parseInt(bkkParts[2], 10);
  } catch {}

  const clean = String(target).trim().replace(/^["']+|["']+$/g, '').split(/[T\s,]+/)[0];
  const parts = clean.split(/[-/.]/);
  if (parts.length === 3) {
    let pd = parseInt(parts[0], 10);
    let pm = parseInt(parts[1], 10);
    let py = parseInt(parts[2], 10);
    if (pd > 1000) {
      py = pd;
      pd = parseInt(parts[2], 10);
    }
    if (py > 2400) py -= 543;
    if (py < 100) py += 2000;

    return (pd === d && pm === m && py === y) || (pd === bkkD && pm === bkkM && py === bkkY);
  }
  return false;
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

  const inspectRecord = (rec: { trackingCode?: string; actionType?: string }) => {
    if (!rec.trackingCode) return;
    // Only 'ส่ง' (Send) records establish the consecutive outgoing tracking code sequence
    if (rec.actionType && rec.actionType !== 'ส่ง') return;

    const normalized = rec.trackingCode.replace(/[\s\-_]/g, '').toUpperCase();
    if (normalized.startsWith(targetTag)) {
      const seqStr = normalized.slice(targetTag.length);
      const parsed = parseInt(seqStr, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  };

  // 1. Check passed-in existing records (Google Sheet & local state)
  if (existingRecords && existingRecords.length > 0) {
    for (const rec of existingRecords) {
      inspectRecord(rec);
    }
  }

  // 2. Also check local storage records to ensure continuous sequence across reloads
  try {
    const localRecords = getLocalParcelRecords();
    for (const rec of localRecords) {
      inspectRecord(rec);
    }
  } catch {
    // ignore
  }

  // Running number increments strictly by 1 (เป็นทีละเลข)
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
 * Parses timestamp string into unix millisecond number for comparison
 */
export function parseParcelTimestamp(ts?: string): number {
  if (!ts) return 0;
  try {
    const parts = ts.split(/[\s,]+/);
    const datePart = parts[0];
    const timePart = parts[1] || '00:00:00';
    const dSub = datePart.split(/[\/\-]/);
    if (dSub.length === 3) {
      let d = parseInt(dSub[0], 10);
      let m = parseInt(dSub[1], 10);
      let y = parseInt(dSub[2], 10);
      if (dSub[0].length === 4) {
        y = parseInt(dSub[0], 10);
        m = parseInt(dSub[1], 10);
        d = parseInt(dSub[2], 10);
      }
      if (y < 100) y += 2000;
      if (y > 2400) y -= 543;
      const tSub = timePart.split(':');
      const hh = parseInt(tSub[0] || '0', 10);
      const mm = parseInt(tSub[1] || '0', 10);
      const ss = parseInt(tSub[2] || '0', 10);
      return new Date(y, m - 1, d, hh, mm, ss).getTime();
    }
  } catch (e) {}
  return 0;
}

/**
 * Consolidates and unifies parcel records following the Laundry & Drying workflow:
 * "เมื่อรายการส่งถูกขึ้นรับเอกสารแล้วให้แสดงเป็นข้อมูลล่าสุดเฉพาะข้อมูลรับแล้ว เหมือน ข้อมูลการซักผ้า - อบผ้า"
 *
 * RULES:
 * 1. An outgoing item ("ส่ง") that has been received ("รับแล้ว") with a matching tracking code
 *    transitions to display as the LATEST record showing specifically the received data ("เฉพาะข้อมูลรับแล้ว"):
 *    - actionType: 'รับ'
 *    - status: 'รับแล้ว'
 *    - timestamp / dateStr / timeStr: reflects the latest receive timestamp
 *    - sentTimestamp / sentRecord: preserves the dispatch record for history
 *    - The older outgoing "ส่ง" record is consolidated and not shown as a redundant separate row
 * 2. An outgoing item ("ส่ง") that has NOT yet been received remains displayed as 'ส่ง' (status: 'รอรับ').
 * 3. An incoming item ("รับ") created directly remains displayed as 'รับ' (status: 'รับแล้ว').
 */
export function consolidateParcelRecords(records: ParcelDeliveryRecord[]): ParcelDeliveryRecord[] {
  if (!records || !Array.isArray(records) || records.length === 0) return [];

  const receivedByCode = new Map<string, ParcelDeliveryRecord>();
  const receiveRecordsWithoutCode: ParcelDeliveryRecord[] = [];
  const sendRecords: ParcelDeliveryRecord[] = [];

  for (const item of records) {
    if (!item) continue;
    const rec: ParcelDeliveryRecord = { ...item };
    const normCode = normalizeParcelTrackingCode(rec.trackingCode);

    if (rec.actionType === 'รับ' || rec.status === 'รับแล้ว') {
      rec.actionType = 'รับ';
      rec.status = 'รับแล้ว';
      if (normCode) {
        const existing = receivedByCode.get(normCode);
        if (!existing) {
          receivedByCode.set(normCode, rec);
        } else {
          const tNew = parseParcelTimestamp(rec.timestamp) || rec.seq || 0;
          const tOld = parseParcelTimestamp(existing.timestamp) || existing.seq || 0;
          if (tNew >= tOld) {
            receivedByCode.set(normCode, rec);
          }
        }
      } else {
        receiveRecordsWithoutCode.push(rec);
      }
    } else {
      sendRecords.push(rec);
    }
  }

  // Also check local storage for newly submitted records that haven't synced to sheet yet
  let localSubs: ParcelDeliveryRecord[] = [];
  try {
    localSubs = getLocalParcelRecords();
  } catch {}

  for (const localRec of localSubs) {
    if (!localRec || !localRec.trackingCode) continue;
    const norm = normalizeParcelTrackingCode(localRec.trackingCode);
    if (!norm) continue;

    if (localRec.actionType === 'รับ' || localRec.status === 'รับแล้ว') {
      if (!receivedByCode.has(norm)) {
        receivedByCode.set(norm, { ...localRec, actionType: 'รับ', status: 'รับแล้ว' });
      }
    } else if (localRec.actionType === 'ส่ง') {
      if (!receivedByCode.has(norm) && !sendRecords.some(r => normalizeParcelTrackingCode(r.trackingCode) === norm)) {
        sendRecords.push({ ...localRec, actionType: 'ส่ง', status: 'รอรับ' });
      }
    }
  }

  // Also check cached received tracking codes
  const cachedReceivedSet = getReceivedTrackingCodesSet(records);

  // Sort send records so newest appears first
  sendRecords.sort((a, b) => {
    const valA = parseParcelTimestamp(a.timestamp);
    const valB = parseParcelTimestamp(b.timestamp);
    if (valB !== valA && valB > 0 && valA > 0) return valB - valA;
    return (b.seq || 0) - (a.seq || 0);
  });

  const unreceivedSends: ParcelDeliveryRecord[] = [];
  const seenSendCodes = new Set<string>();

  for (const sendRec of sendRecords) {
    const normCode = normalizeParcelTrackingCode(sendRec.trackingCode);

    if (normCode && receivedByCode.has(normCode)) {
      // Match found! Outgoing item has been received.
      // Display as the LATEST record showing specifically the received data ("เฉพาะข้อมูลรับแล้ว"):
      const recvRec = receivedByCode.get(normCode)!;
      recvRec.actionType = 'รับ';
      recvRec.status = 'รับแล้ว';
      if (!recvRec.sentTimestamp && sendRec.timestamp) {
        recvRec.sentTimestamp = sendRec.timestamp;
      }
      if (!recvRec.sentDateStr && sendRec.dateStr) {
        recvRec.sentDateStr = sendRec.dateStr;
      }
      if (!recvRec.sentTimeStr && sendRec.timeStr) {
        recvRec.sentTimeStr = sendRec.timeStr;
      }
      if (!recvRec.sentRecord) {
        recvRec.sentRecord = sendRec;
      }
      if (!recvRec.senderName || recvRec.senderName === '-') {
        recvRec.senderName = sendRec.senderName;
      }
      if (!recvRec.senderDepartment || recvRec.senderDepartment === '-') {
        recvRec.senderDepartment = sendRec.senderDepartment;
      }
      if (!recvRec.recipientName || recvRec.recipientName === '-') {
        recvRec.recipientName = sendRec.recipientName;
      }
      if (!recvRec.recipientDepartment || recvRec.recipientDepartment === '-') {
        recvRec.recipientDepartment = sendRec.recipientDepartment;
      }
      if (!recvRec.operatorName || recvRec.operatorName === '-') {
        recvRec.operatorName = sendRec.operatorName;
      }
      if (!recvRec.operatorDepartment || recvRec.operatorDepartment === '-') {
        recvRec.operatorDepartment = sendRec.operatorDepartment;
      }
      if (!recvRec.itemTitle || recvRec.itemTitle === 'ไม่ระบุชื่อเอกสาร/พัสดุ') {
        recvRec.itemTitle = sendRec.itemTitle;
      }
      // Outgoing record is consolidated into the latest received record (NOT added to unreceivedSends)
    } else if (normCode && cachedReceivedSet.has(normCode)) {
      // It was marked received locally or in cache, but no full 'รับ' record in Sheet rows yet
      const localMatch = localSubs.find(
        (r) => (r.actionType === 'รับ' || r.status === 'รับแล้ว') && normalizeParcelTrackingCode(r.trackingCode) === normCode
      );
      if (localMatch) {
        const convertedRec: ParcelDeliveryRecord = {
          ...localMatch,
          actionType: 'รับ',
          status: 'รับแล้ว',
          sentTimestamp: sendRec.timestamp,
          sentDateStr: sendRec.dateStr,
          sentTimeStr: sendRec.timeStr,
          sentRecord: { ...sendRec },
        };
        if (!convertedRec.senderName || convertedRec.senderName === '-') {
          convertedRec.senderName = sendRec.senderName;
        }
        if (!convertedRec.senderDepartment || convertedRec.senderDepartment === '-') {
          convertedRec.senderDepartment = sendRec.senderDepartment;
        }
        receivedByCode.set(normCode, convertedRec);
      } else {
        const convertedRec: ParcelDeliveryRecord = {
          ...sendRec,
          id: `rec-converted-${sendRec.id}`,
          actionType: 'รับ',
          status: 'รับแล้ว',
          sentTimestamp: sendRec.timestamp,
          sentDateStr: sendRec.dateStr,
          sentTimeStr: sendRec.timeStr,
          sentRecord: { ...sendRec },
        };
        receivedByCode.set(normCode, convertedRec);
      }
    } else {
      // Unreceived send item
      if (normCode) {
        if (!seenSendCodes.has(normCode)) {
          seenSendCodes.add(normCode);
          sendRec.status = 'รอรับ';
          unreceivedSends.push(sendRec);
        }
      } else {
        sendRec.status = 'รอรับ';
        unreceivedSends.push(sendRec);
      }
    }
  }

  const consolidated: ParcelDeliveryRecord[] = [
    ...Array.from(receivedByCode.values()),
    ...receiveRecordsWithoutCode,
    ...unreceivedSends,
  ];

  // Sort latest first (newest activity at top)
  consolidated.sort((a, b) => {
    const valA = parseParcelTimestamp(a.timestamp);
    const valB = parseParcelTimestamp(b.timestamp);
    if (valB !== valA && valB > 0 && valA > 0) {
      return valB - valA;
    }
    return (b.seq || 0) - (a.seq || 0);
  });

  return consolidated;
}

/**
 * Assigns tracking codes to parcel records:
 * - Keeps original authoritative tracking codes from Google Sheet / submissions.
 * - Consolidates received items following the Laundry & Drying lifecycle model.
 */
export function assignTrackingCodesToParcels(records: ParcelDeliveryRecord[]): ParcelDeliveryRecord[] {
  if (!records || records.length === 0) return [];
  return records;
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
 * Gets a set of tracking codes that have been confirmed received ("รับแล้ว")
 * STRICT RULE: Only tracking codes are collected. Never item titles.
 */
export function getReceivedTrackingCodesSet(records: ParcelDeliveryRecord[]): Set<string> {
  const receivedCodes = new Set<string>();

  // 1. From records in memory: ONLY from 'รับ' records that have an explicit tracking code
  if (Array.isArray(records)) {
    records.forEach((r) => {
      if (r.actionType === 'รับ' && r.trackingCode) {
        const norm = normalizeParcelTrackingCode(r.trackingCode);
        if (norm) receivedCodes.add(norm);
      }
    });
  }

  // 2. From localStorage cache of received tracking codes (ignoring any legacy 'title:' entries)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('proworkflow_received_tracking_codes_v1');
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) {
          arr.forEach((c) => {
            if (typeof c === 'string' && !c.startsWith('title:')) {
              const norm = normalizeParcelTrackingCode(c);
              if (norm) receivedCodes.add(norm);
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
 *
 * STRICT RULES:
 * 1. Incoming ("รับ") is always confirmed received.
 * 2. Outgoing ("ส่ง"):
 *    - Status changes to 'รับแล้ว' ONLY when its tracking code matches a received ("รับ") record's tracking code.
 *    - If item titles match but tracking codes do not, DO NOT change status to 'รับแล้ว'.
 *    - If the record has no tracking code, it CANNOT change status to 'รับแล้ว'.
 */
export function isParcelConfirmedReceived(
  record: ParcelDeliveryRecord,
  allRecords?: ParcelDeliveryRecord[],
  receivedCodesSet?: Set<string>
): boolean {
  if (!record) return false;

  // 1. Incoming ("รับ") or status 'รับแล้ว' is always received
  if (record.actionType === 'รับ' || record.status === 'รับแล้ว') return true;

  // 2. For Outgoing ("ส่ง") records:
  // Must have a valid tracking code to be confirmed received.
  const normCode = normalizeParcelTrackingCode(record.trackingCode);
  if (!normCode) {
    return false;
  }

  // Check against received tracking codes set (only contains valid tracking codes from 'รับ' records)
  const set = receivedCodesSet || (allRecords ? getReceivedTrackingCodesSet(allRecords) : null);
  if (set && set.has(normCode)) {
    return true;
  }

  // Check directly against allRecords for a "รับ" record with matching tracking code
  if (allRecords && allRecords.length > 0) {
    const isMatchedInRecords = allRecords.some((r) => {
      if (r.actionType !== 'รับ') return false;
      return r.trackingCode && normalizeParcelTrackingCode(r.trackingCode) === normCode;
    });
    if (isMatchedInRecords) return true;
  }

  // Check localStorage directly strictly by tracking code
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('proworkflow_received_tracking_codes_v1');
      if (stored) {
        const arr = JSON.parse(stored);
        if (
          Array.isArray(arr) &&
          arr.some((c) => typeof c === 'string' && !c.startsWith('title:') && normalizeParcelTrackingCode(c) === normCode)
        ) {
          return true;
        }
      }
    } catch {}
  }

  return false;
}

/**
 * Saves a tracking code to local received cache.
 * STRICT RULE: Only saves tracking code, never item title.
 */
export function markTrackingCodeAsReceivedLocally(trackingCode?: string) {
  if (typeof window === 'undefined' || !trackingCode) return;
  try {
    const norm = normalizeParcelTrackingCode(trackingCode);
    if (!norm) return;

    const stored = localStorage.getItem('proworkflow_received_tracking_codes_v1');
    let arr: string[] = [];
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Clean out any legacy 'title:' entries
          arr = parsed
            .filter((c) => typeof c === 'string' && !c.startsWith('title:'))
            .map((c) => normalizeParcelTrackingCode(c));
        }
      } catch {}
    }

    if (!arr.includes(norm)) {
      arr.push(norm);
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
  const { allRecords = [] } = options;

  const normCode = normalizeParcelTrackingCode(effectiveCode);
  if (!normCode) {
    return { isAlreadyReceived: false };
  }

  const receivedCodesSet = getReceivedTrackingCodesSet(allRecords);

  // 1. Check by Tracking Code:
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

  return { isAlreadyReceived: false };
}

