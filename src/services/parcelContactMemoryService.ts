/**
 * Service to store, learn, and suggest remembered sender & recipient names and departments
 * for the Document & Parcel Delivery (รับ-ส่ง เอกสาร / พัสดุ) module.
 */

import { ParcelDeliveryRecord } from '../types';

const STORAGE_KEY_SENDERS = 'parcel_memory_senders_v1';
const STORAGE_KEY_SENDER_DEPTS = 'parcel_memory_sender_depts_v1';
const STORAGE_KEY_RECIPIENTS = 'parcel_memory_recipients_v1';
const STORAGE_KEY_RECIPIENT_DEPTS = 'parcel_memory_recipient_depts_v1';

// Default standard departments used at Ladkrabang 2 & partner facilities
export const DEFAULT_DEPARTMENTS: string[] = [
  'ธุรการลาดกระบัง 2',
  'ธุรการลาดกระบัง 1',
  'การเงิน',
  'บัญชี',
  'ฝ่ายบุคคล (HR)',
  'จัดซื้อ',
  'คลังสินค้า',
  'ช่างซ่อมบำรุง',
  'ฝ่ายผลิต',
  'ความปลอดภัย (จป.)',
  'ประกันคุณภาพ (QA/QC)',
  'IT / สารสนเทศ',
  'ขนส่ง / โลจิสติกส์',
  'วางแผนการผลิต',
  'ธุรการสำนักงานใหญ่',
];

// Helper to safely read string array from localStorage
function readFromStorage(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0 && item !== '-');
    }
  } catch {
    // ignore
  }
  return [];
}

// Helper to safely write string array to localStorage
function writeToStorage(key: string, items: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const unique = Array.from(new Set(items.map((i) => i.trim()).filter(Boolean))).slice(0, 50);
    localStorage.setItem(key, JSON.stringify(unique));
  } catch {
    // ignore
  }
}

/**
 * Get aggregated list of remembered Sender Names
 */
export function getRememberedSenders(existingRecords: ParcelDeliveryRecord[] = []): string[] {
  const fromRecords = existingRecords
    .map((r) => r.senderName?.trim())
    .filter((name): name is string => Boolean(name && name !== '-'));

  const fromStorage = readFromStorage(STORAGE_KEY_SENDERS);
  return Array.from(new Set([...fromStorage, ...fromRecords])).filter(Boolean);
}

/**
 * Get aggregated list of remembered Sender Departments
 */
export function getRememberedSenderDepartments(existingRecords: ParcelDeliveryRecord[] = []): string[] {
  const fromRecords = existingRecords
    .map((r) => r.senderDepartment?.trim())
    .filter((dept): dept is string => Boolean(dept && dept !== '-'));

  const fromStorage = readFromStorage(STORAGE_KEY_SENDER_DEPTS);
  return Array.from(new Set([...fromStorage, ...fromRecords, ...DEFAULT_DEPARTMENTS])).filter(Boolean);
}

/**
 * Get aggregated list of remembered Recipient Names
 */
export function getRememberedRecipients(existingRecords: ParcelDeliveryRecord[] = []): string[] {
  const fromRecords = existingRecords
    .map((r) => r.recipientName?.trim())
    .filter((name): name is string => Boolean(name && name !== '-'));

  const fromStorage = readFromStorage(STORAGE_KEY_RECIPIENTS);
  return Array.from(new Set([...fromStorage, ...fromRecords])).filter(Boolean);
}

/**
 * Get aggregated list of remembered Recipient Departments
 */
export function getRememberedRecipientDepartments(existingRecords: ParcelDeliveryRecord[] = []): string[] {
  const fromRecords = existingRecords
    .map((r) => r.recipientDepartment?.trim())
    .filter((dept): dept is string => Boolean(dept && dept !== '-'));

  const fromStorage = readFromStorage(STORAGE_KEY_RECIPIENT_DEPTS);
  return Array.from(new Set([...fromStorage, ...fromRecords, ...DEFAULT_DEPARTMENTS])).filter(Boolean);
}

/**
 * Learn & remember contacts whenever a user submits or types in a valid record
 */
export function saveRememberedContacts(data: {
  senderName?: string;
  senderDepartment?: string;
  recipientName?: string;
  recipientDepartment?: string;
}): void {
  if (typeof window === 'undefined') return;

  const { senderName, senderDepartment, recipientName, recipientDepartment } = data;

  if (senderName && senderName.trim() && senderName.trim() !== '-') {
    const existing = readFromStorage(STORAGE_KEY_SENDERS);
    writeToStorage(STORAGE_KEY_SENDERS, [senderName.trim(), ...existing]);
  }

  if (senderDepartment && senderDepartment.trim() && senderDepartment.trim() !== '-') {
    const existing = readFromStorage(STORAGE_KEY_SENDER_DEPTS);
    writeToStorage(STORAGE_KEY_SENDER_DEPTS, [senderDepartment.trim(), ...existing]);
  }

  if (recipientName && recipientName.trim() && recipientName.trim() !== '-') {
    const existing = readFromStorage(STORAGE_KEY_RECIPIENTS);
    writeToStorage(STORAGE_KEY_RECIPIENTS, [recipientName.trim(), ...existing]);
  }

  if (recipientDepartment && recipientDepartment.trim() && recipientDepartment.trim() !== '-') {
    const existing = readFromStorage(STORAGE_KEY_RECIPIENT_DEPTS);
    writeToStorage(STORAGE_KEY_RECIPIENT_DEPTS, [recipientDepartment.trim(), ...existing]);
  }
}
