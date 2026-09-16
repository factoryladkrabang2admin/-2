/**
 * Service for submitting laundry records to Google Form and Google Sheet
 * Google Form: https://docs.google.com/forms/d/e/1FAIpQLSfD1D5CgGbhL94VP2kePtM7fw5jxI7Nk8YA6_oDqsdxzkSZFQ/viewform?usp=pp_url
 * Google Sheet: https://docs.google.com/spreadsheets/d/1V2QAI3dRg8n5DXUGGBOGjpgsriSVUCZtySmLUQcqfpI/edit?gid=1327805432#gid=1327805432
 */

export const GOOGLE_LAUNDRY_FORM_ID = '1FAIpQLSfD1D5CgGbhL94VP2kePtM7fw5jxI7Nk8YA6_oDqsdxzkSZFQ';
export const GOOGLE_LAUNDRY_FORM_PREFILL_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfD1D5CgGbhL94VP2kePtM7fw5jxI7Nk8YA6_oDqsdxzkSZFQ/viewform?usp=pp_url';
export const GOOGLE_LAUNDRY_FORM_VIEW_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfD1D5CgGbhL94VP2kePtM7fw5jxI7Nk8YA6_oDqsdxzkSZFQ/viewform';
export const GOOGLE_LAUNDRY_FORM_RESPONSE_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfD1D5CgGbhL94VP2kePtM7fw5jxI7Nk8YA6_oDqsdxzkSZFQ/formResponse';
export const GOOGLE_LAUNDRY_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1V2QAI3dRg8n5DXUGGBOGjpgsriSVUCZtySmLUQcqfpI/edit?gid=1327805432#gid=1327805432';

export const LAUNDRY_FORM_ENTRIES = {
  actionType: 'entry.250169946', // เลือกข้อมูล: อยู่ระหว่างการซัก / ซักเสร็จแล้ว
  date: 'entry.507087445', // กรุณาระบุวันที่ (YYYY-MM-DD)
  dateYear: 'entry.507087445_year', // กรุณาระบุวันที่
  dateMonth: 'entry.507087445_month',
  dateDay: 'entry.507087445_day',
  operatorName: 'entry.409924680', // ชื่อผู้ดำเนินการ
  department: 'entry.2031428945', // แผนก
  garmentType: 'entry.1296199940', // ประเภทผ้า
  quantity: 'entry.1567032658', // จำนวน (ตัว/ชิ้น/ผืน)
  deliveryTime: 'entry.1719198625', // เวลาที่จัดส่ง
  trackingCode: 'entry.1367173718', // รหัสติดตาม
};

export const LAUNDRY_FORM_OPTIONS = {
  actionTypes: ['อยู่ระหว่างการซัก', 'ซักเสร็จแล้ว'] as const,
  departments: [
    'A/2', 'A/3', 'A/4', 'A/6', 'B/1', 'B/5',
    '2/1', '2/2', '2/3', '3/1', '3/2', '3/3', '3/4', '3/5',
    'ธุรการลาดกระบัง 1', 'ธุรการลาดกระบัง 2', 'สรรหาลาดกระบัง 1',
    'การตลาด (ขาย 1)', 'การตลาด (ขาย 2)', 'สต๊อก 2'
  ],
  garmentTypes: [
    'เสื้อกาวน์สีเขียว',
    'เสื้อกาวน์สีกรมท่า',
    'ผ้ากรองแอร์',
    'ผ้าปูเตียงพยาบาล',
    'ผ้าปูโต๊ะ',
    'ผ้ารองปูโต๊ะ',
    'ชุด Visitor',
    'ผ้าคลุมไส้',
    'เอี๊ยม/หมวก',
    'เสื้อแขนยาวสีขาว'
  ],
  deliveryTimes: [
    '10.35',
    '12.35',
    '14.35',
    '16.35',
    'วันถัดไป 08.10',
    'วันถัดไป 10.35',
    'วันถัดไป 12.35'
  ]
};

export interface LaundryFormSchema {
  departments: string[];
  garmentTypes: string[];
  deliveryTimes: string[];
  actionTypes: string[];
  updatedAt?: string;
  source?: 'google_form' | 'cached' | 'fallback';
}

const LAUNDRY_SCHEMA_STORAGE_KEY = 'lkb2_laundry_form_schema_v1';

export function getCachedLaundryFormOptions(): LaundryFormSchema {
  try {
    const raw = localStorage.getItem(LAUNDRY_SCHEMA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.departments) && parsed.departments.length > 0) {
        return {
          ...parsed,
          source: 'cached',
        };
      }
    }
  } catch (e) {
    // Ignore localStorage parse error
  }
  return {
    departments: [...LAUNDRY_FORM_OPTIONS.departments],
    garmentTypes: [...LAUNDRY_FORM_OPTIONS.garmentTypes],
    deliveryTimes: [...LAUNDRY_FORM_OPTIONS.deliveryTimes],
    actionTypes: [...LAUNDRY_FORM_OPTIONS.actionTypes],
    source: 'fallback',
  };
}

export async function fetchLaundryFormOptions(forceRefresh: boolean = false): Promise<LaundryFormSchema> {
  try {
    const url = `/api/laundry-form-schema${forceRefresh ? '?refresh=true' : ''}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.departments) && data.departments.length > 0) {
        const schema: LaundryFormSchema = {
          departments: data.departments,
          garmentTypes: data.garmentTypes || LAUNDRY_FORM_OPTIONS.garmentTypes,
          deliveryTimes: data.deliveryTimes || LAUNDRY_FORM_OPTIONS.deliveryTimes,
          actionTypes: data.actionTypes || LAUNDRY_FORM_OPTIONS.actionTypes,
          updatedAt: data.updatedAt || new Date().toISOString(),
          source: data.source || 'google_form',
        };
        try {
          localStorage.setItem(LAUNDRY_SCHEMA_STORAGE_KEY, JSON.stringify(schema));
        } catch (_) {}
        return schema;
      }
    }
  } catch (err) {
    console.warn('[Laundry] Failed to fetch form schema from server, using cached/fallback:', err);
  }

  return getCachedLaundryFormOptions();
}

export interface LaundryLineItem {
  garmentType: string;
  quantity: number;
  careNote?: string;
}

export interface LaundrySubmitPayload {
  actionType: 'อยู่ระหว่างการซัก' | 'ซักเสร็จแล้ว';
  date: string; // YYYY-MM-DD
  operatorName: string;
  department: string;
  deliveryTime: string;
  trackingCode: string;
  garmentType?: string;
  quantity?: number;
  items?: LaundryLineItem[];
}

export interface LaundrySubmitResponse {
  success: boolean;
  googleSheetSynced: boolean;
  message: string;
  countSubmitted?: number;
  error?: string;
}

/**
 * Generate a prefilled Google Form URL with specific values
 */
export function buildPrefilledGoogleFormUrl(payload: Partial<LaundrySubmitPayload>): string {
  const url = new URL(GOOGLE_LAUNDRY_FORM_VIEW_URL);
  url.searchParams.set('usp', 'pp_url');

  if (payload.actionType) {
    url.searchParams.set(LAUNDRY_FORM_ENTRIES.actionType, payload.actionType);
  }

  if (payload.date) {
    url.searchParams.set(LAUNDRY_FORM_ENTRIES.date, payload.date);
    const parts = payload.date.split('-');
    if (parts.length === 3) {
      url.searchParams.set(LAUNDRY_FORM_ENTRIES.dateYear, parts[0]);
      url.searchParams.set(LAUNDRY_FORM_ENTRIES.dateMonth, String(parseInt(parts[1], 10)));
      url.searchParams.set(LAUNDRY_FORM_ENTRIES.dateDay, String(parseInt(parts[2], 10)));
    }
  }

  if (payload.operatorName) {
    url.searchParams.set(LAUNDRY_FORM_ENTRIES.operatorName, payload.operatorName);
  }

  if (payload.department) {
    url.searchParams.set(LAUNDRY_FORM_ENTRIES.department, payload.department);
  }

  if (payload.garmentType) {
    url.searchParams.set(LAUNDRY_FORM_ENTRIES.garmentType, payload.garmentType);
  }

  if (payload.quantity) {
    url.searchParams.set(LAUNDRY_FORM_ENTRIES.quantity, String(payload.quantity));
  }

  if (payload.deliveryTime) {
    url.searchParams.set(LAUNDRY_FORM_ENTRIES.deliveryTime, payload.deliveryTime);
  }

  if (payload.trackingCode) {
    url.searchParams.set(LAUNDRY_FORM_ENTRIES.trackingCode, payload.trackingCode);
  }

  return url.toString();
}

/**
 * Submit laundry order directly to Google Form and Google Sheet via backend API
 */
export async function submitLaundryOrder(payload: LaundrySubmitPayload): Promise<LaundrySubmitResponse> {
  try {
    const response = await fetch('/api/laundry-submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error ${response.status}`);
    }

    const result: LaundrySubmitResponse = await response.json();
    return result;
  } catch (err: any) {
    console.error('Failed to submit laundry order via backend API:', err);
    return {
      success: false,
      googleSheetSynced: false,
      message: err.message || 'บันทึกข้อมูลไม่สำเร็จ',
      error: err.message || 'Network error',
    };
  }
}
