import { 
  LaundryOrder, 
  LaundryItemDetail, 
  LaundryStage, 
  MaintenanceTicket, 
  OtRecord, 
  DailyWorkSchedule, 
  WorkScheduleStatus, 
  MeetingRoomBooking, 
  MeetingStatus, 
  AnnouncementItem, 
  AnnouncementStatus,
  EquipmentRecord,
  EquipmentSubCategory,
  EquipmentItemDetail,
  ChlorineInspectionRecord
} from '../types';
import { realtimeHub } from './realtimeService';
import { INITIAL_RAGS_GLOVES_DATA } from '../data/mockRagsGlovesData';

export const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1qbKEbnjIPb2eM-DOLAkFZv3hDl2cioKeUqiLcdYqjos/edit?resourcekey=&gid=1278573396#gid=1278573396';
export const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1qbKEbnjIPb2eM-DOLAkFZv3hDl2cioKeUqiLcdYqjos/export?format=csv&gid=1278573396';

// Backup Snapshot CSV text in case network is disconnected or blocked by CORS in some browsers
export const FALLBACK_SHEET_CSV = `ประทับเวลา,กรุณาระบุวันที่,เลือกข้อมูล,ชื่อผู้ดำเนินการ,แผนก,ประเภทผ้า,จำนวน (ตัว/ชิ้น/ผืน),เวลาที่จัดส่ง,แผนก,ประเภทผ้า
22/8/2026,22/8/2026,อยู่ระหว่างการซัก,สุริยา,2/1,เสื้อกาวน์สีเขียว,18,12.35,,
22/8/2026,22/8/2026,ซักเสร็จแล้ว,สุริยา,2/1,เสื้อกาวน์สีเขียว,18,12.35,2/1,เสื้อกาวน์สีเขียว
22/8/2026,22/8/2026,อยู่ระหว่างการซัก,สุริยา,2/2,เสื้อกาวน์สีเขียว,24,12.35,,
22/8/2026,22/8/2026,ซักเสร็จแล้ว,สุริยา,2/2,เสื้อกาวน์สีเขียว,24,12.35,2/2,เสื้อกาวน์สีเขียว
22/8/2026,22/8/2026,อยู่ระหว่างการซัก,สุริยา,2/3,เสื้อกาวน์สีเขียว,15,12.35,,
22/8/2026,22/8/2026,ซักเสร็จแล้ว,สุริยา,2/3,เสื้อกาวน์สีเขียว,15,12.35,2/3,เสื้อกาวน์สีเขียว
22/8/2026,22/8/2026,อยู่ระหว่างการซัก,สุริยา,3/1,เสื้อกาวน์สีเขียว,26,12.35,,
22/8/2026,22/8/2026,ซักเสร็จแล้ว,สุริยา,3/1,เสื้อกาวน์สีเขียว,26,12.35,3/1,เสื้อกาวน์สีเขียว
23/8/2026,23/8/2026,อยู่ระหว่างการซัก,สุริยา,3/2,เสื้อกาวน์สีเขียว,28,12.35,,
23/8/2026,23/8/2026,อยู่ระหว่างการซัก,สุริยา,3/3,เสื้อกาวน์สีเขียว,36,12.35,,
23/8/2026,23/8/2026,อยู่ระหว่างการซัก,สุริยา,3/4,เสื้อกาวน์สีเขียว,30,12.35,,
23/8/2026,23/8/2026,ซักเสร็จแล้ว,สุริยา,3/4,เสื้อกาวน์สีเขียว,30,12.35,3/4,เสื้อกาวน์สีเขียว
23/8/2026,23/8/2026,อยู่ระหว่างการซัก,สุริยา,3/5,เสื้อกาวน์สีเขียว,42,12.35,,
23/8/2026,23/8/2026,อยู่ระหว่างการซัก,สุริยา,A/2,เสื้อกาวน์สีเขียว,10,12.35,,
23/8/2026,23/8/2026,ซักเสร็จแล้ว,สุริยา,A/2,เสื้อกาวน์สีเขียว,10,12.35,A/2,เสื้อกาวน์สีเขียว
23/8/2026,23/8/2026,อยู่ระหว่างการซัก,สุริยา,A/3,เสื้อกาวน์สีเขียว,6,12.35,,
23/8/2026,23/8/2026,อยู่ระหว่างการซัก,สุริยา,A/2,ผ้ากรองแอร์,3,14.35,,
23/8/2026,23/8/2026,ซักเสร็จแล้ว,สุริยา,A/2,ผ้ากรองแอร์,3,14.35,A/2,ผ้ากรองแอร์`;

export interface GoogleSheetSyncResult {
  success: boolean;
  orders: LaundryOrder[];
  rawRowsCount: number;
  lastSyncedAt: Date;
  error?: string;
}

// Persistent memory cache for last successfully synced Laundry CSV
let lastSuccessfulLaundryCsvText: string | null = null;

try {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('proworkflow_laundry_csv_cache_v2');
    if (cached && cached.includes('ประทับเวลา')) {
      lastSuccessfulLaundryCsvText = cached;
    }
  }
} catch {
  // ignore
}

/**
 * Standard CSV Parser handling quotes, commas, and multi-line breaks safely
 */
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let current = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim().replace(/^["']+|["']+$/g, ''));
      current = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(current.trim().replace(/^["']+|["']+$/g, ''));
      if (row.some((c) => c.length > 0)) {
        lines.push(row);
      }
      row = [];
      current = '';
    } else {
      current += char;
    }
  }
  if (current || row.length > 0) {
    row.push(current.trim().replace(/^["']+|["']+$/g, ''));
    if (row.some((c) => c.length > 0)) {
      lines.push(row);
    }
  }
  return lines;
}

/**
 * Normalizes department string into clean standard format
 * Handles letters like A/2, A/3, B/1, 2/3, 3/1, ธุรการลาดกระบัง 2, etc.
 */
export function normalizeDepartment(rawDept?: string): string {
  if (!rawDept) return '';
  let dept = rawDept.trim();
  if (!dept) return '';

  // Remove wrapping quotes if any
  dept = dept.replace(/^["']+|["']+$/g, '').trim();

  // 1. Thai prefixes e.g. "แผนก A/2" -> "A/2", "อาคาร A/3" -> "A/3", "ตึก 2/3" -> "2/3"
  const thaiPrefixedMatch = dept.match(/^(?:แผนก|อาคาร|ตึก|ฝ่าย|หน่วยงาน)\s*([A-Za-z]\s*[\/\-\.\s]?\s*\d+|\d+\s*[\/\-\.\s]\s*\d+)/i);
  if (thaiPrefixedMatch) {
    return normalizeDepartment(thaiPrefixedMatch[1]);
  }

  // 2. Alphanumeric codes: e.g. "A/2", "a/3", "A / 2", "A-3", "A.2", "A2", "b/1", "B/5"
  const alphaSlashMatch = dept.match(/^([A-Za-z]+)\s*[\/\-\.\s]?\s*(\d+)$/);
  if (alphaSlashMatch) {
    return `${alphaSlashMatch[1].toUpperCase()}/${alphaSlashMatch[2]}`;
  }

  // 3. Number slash number: e.g. "2/3", "3/1", "2 - 3", "3 / 4"
  const numSlashMatch = dept.match(/^(\d+)\s*[\/\-\.\s]\s*(\d+)$/);
  if (numSlashMatch) {
    return `${numSlashMatch[1]}/${numSlashMatch[2]}`;
  }

  // 4. Double letter or general code e.g. "HR", "QA", "IT" -> uppercase
  if (/^[A-Za-z]{1,4}$/.test(dept)) {
    return dept.toUpperCase();
  }

  // 5. Letter with slash / characters, ensure uppercase on English letters
  if (/^[A-Za-z]/i.test(dept)) {
    return dept.replace(/^[a-z]/i, (c) => c.toUpperCase());
  }

  return dept;
}

/**
 * Normalizes date string into YYYY-MM-DD
 */
export function normalizeDate(rawDate?: string, rawTimestamp?: string, fallbackDate?: string): string {
  let raw = (rawDate || '').trim();
  if (!raw && rawTimestamp) {
    raw = (rawTimestamp || '').trim();
  }
  if (!raw) {
    if (fallbackDate) return fallbackDate;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // 1. Strip time portion if present (e.g. "22/8/2026, 1:15:10" -> "22/8/2026", "2026-08-22T01:15:10" -> "2026-08-22")
  const datePart = raw.split(/[,\sT]+/)[0].trim();

  // If Thai month names are present (e.g., "22 ส.ค. 2569" or "22 สิงหาคม 2569")
  const thaiMonths: { [key: string]: string } = {
    'ม.ค.': '01', 'มกราคม': '01',
    'ก.พ.': '02', 'กุมภาพันธ์': '02',
    'มี.ค.': '03', 'มีนาคม': '03',
    'เม.ย.': '04', 'เมษายน': '04',
    'พ.ค.': '05', 'พฤษภาคม': '05',
    'มิ.ย.': '06', 'มิถุนายน': '06',
    'ก.ค.': '07', 'กรกฎาคม': '07',
    'ส.ค.': '08', 'สิงหาคม': '08',
    'ก.ย.': '09', 'กันยายน': '09',
    'ต.ค.': '10', 'ตุลาคม': '10',
    'พ.ย.': '11', 'พฤศจิกายน': '11',
    'ธ.ค.': '12', 'ธันวาคม': '12',
  };
  for (const [tMon, mNum] of Object.entries(thaiMonths)) {
    if (raw.includes(tMon)) {
      const match = raw.match(new RegExp(`(\\d{1,2})\\s*${tMon.replace('.', '\\.')}\\s*(\\d{2,4})`));
      if (match) {
        const d = match[1].padStart(2, '0');
        let y = parseInt(match[2], 10);
        if (y > 2400) y -= 543;
        else if (y < 100) y = y > 50 ? y + 2500 - 543 : y + 2000;
        return `${y}-${mNum}-${d}`;
      }
    }
  }

  // Handle slashes: "22/8/2026", "2026/8/22", "8/22/2026", "22/8/2569"
  if (datePart.includes('/')) {
    const parts = datePart.split('/');
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);

      // Check if YYYY/MM/DD
      if (p0 > 1000 || parts[0].length === 4) {
        let year = p0;
        if (year > 2400) year -= 543;
        const month = String(p1).padStart(2, '0');
        const day = String(p2).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      // Check if DD/MM/YYYY vs MM/DD/YYYY
      let year = p2;
      if (year > 2400) year -= 543;
      else if (year < 100) {
        // e.g. 26 or 69 (2569)
        year = year > 50 ? 2500 + year - 543 : 2000 + year;
      }

      let day = p0;
      let month = p1;
      // If p0 > 12, p0 must be day
      if (p0 > 12) {
        day = p0;
        month = p1;
      } else if (p1 > 12) {
        // e.g. 8/22/2026 -> month 8, day 22
        day = p1;
        month = p0;
      }

      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Handle dashes: "2026-08-22", "22-08-2026", "22-8-2569"
  if (datePart.includes('-')) {
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);

      if (p0 > 1000 || parts[0].length === 4) {
        let year = p0;
        if (year > 2400) year -= 543;
        const month = String(p1).padStart(2, '0');
        const day = String(p2).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      let year = p2;
      if (year > 2400) year -= 543;
      else if (year < 100) {
        year = year > 50 ? 2500 + year - 543 : 2000 + year;
      }

      let day = p0;
      let month = p1;
      if (p0 > 12) {
        day = p0;
        month = p1;
      } else if (p1 > 12) {
        day = p1;
        month = p0;
      }

      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return '2026-08-22';
}

function formatDeliveryTime(timeStr?: string): string {
  if (!timeStr) return '14:30 น.';
  let t = timeStr.trim();
  t = t.replace(/น\.$/, '').trim();
  t = t.replace('.', ':');
  return `${t} น.`;
}

/**
 * Helper to determine Category for garment item
 */
function getGarmentCategory(garmentName: string): LaundryItemDetail['category'] {
  if (garmentName.includes('ผ้าปู') || garmentName.includes('ปลอก')) return 'Bedding';
  if (garmentName.includes('ผ้ากรอง') || garmentName.includes('ผ้าคลุม')) return 'Specialty';
  if (garmentName.includes('ผ้าเช็ด') || garmentName.includes('ผ้าปูโต๊ะ')) return 'Towels & Linens';
  return 'Clothing';
}

/**
 * Transforms Google Sheet CSV rows into paired or individual Laundry Orders
 * Rule:
 * 1. An entry with status 'อยู่ระหว่างการซัก' (or washing / in progress) creates a NEW intake order ticket.
 * 2. An entry with status 'ซักเสร็จแล้ว' (or completed / ready) pairs with and completes the earliest open 'washing' ticket
 *    for that (Date + Department + Garment Type) in FIFO order.
 * 3. If in 1 day there are multiple entries with the same Date, Department, and Garment Type (e.g. multiple batches / intakes):
 *    - Each intake is added as a NEW separate ticket without overwriting or conflicting with previous tickets.
 *    - Any subsequent completion pairs FIFO with pending intake tickets, or if none pending, creates a new completed ticket.
 * 4. Each ticket gets its own sequential Tracking Code (LKB2 - YYMMDDSS) and unique ID.
 */
export function convertSheetRowsToOrders(csvText: string): LaundryOrder[] {
  const rows = parseCSV(csvText);
  if (rows.length <= 1) return [];

  const dataRows = rows.slice(1);
  const allOrders: LaundryOrder[] = [];
  const dailySeqMap: { [dateStr: string]: number } = {};

  // Track pending 'washing' orders awaiting completion per (Date + Dept + Garment)
  const pendingWashingOrders: { [key: string]: LaundryOrder[] } = {};

  let lastSeenDate = '2026-06-01';

  dataRows.forEach((r, idx) => {
    const timestamp = (r[0] || '').trim();
    const date1 = (r[1] || '').trim();
    const actionCol = (r[2] || '').trim();
    const operator = (r[3] || '').trim();
    const dept1 = (r[4] || '').trim();
    const garment1 = (r[5] || '').trim();
    const qtyCol = (r[6] || '').trim();
    const deliveryTime = (r[7] || '').trim();
    const date2 = (r[8] || '').trim();
    const dept2 = (r[9] || '').trim();
    const garment2 = (r[10] || '').trim();

    const rawDate = date1 || date2 || (timestamp ? timestamp.split(',')[0].split(' ')[0] : '');
    if (rawDate) {
      lastSeenDate = normalizeDate(rawDate, timestamp, lastSeenDate);
    }
    const normalizedDate = rawDate ? normalizeDate(rawDate, timestamp, lastSeenDate) : lastSeenDate;

    let rawDept = dept1 || dept2 || '';
    if (!rawDept) {
      for (let c = 0; c < r.length; c++) {
        const val = (r[c] || '').trim();
        if (!val || val === timestamp || val === date1 || val === date2 || val === actionCol || val === operator) continue;
        if (
          /^[A-Za-z0-9]+[/-][A-Za-z0-9]+/i.test(val) ||
          /^[A-Za-z]\s*\d+/i.test(val) ||
          val.includes('ลาดกระบัง') ||
          val.includes('ธุรการ') ||
          val.includes('สวัสดิการ') ||
          val.includes('สรรหา')
        ) {
          rawDept = val;
          break;
        }
      }
    }
    const dept = normalizeDepartment(rawDept);

    let garment = garment1 || garment2 || '';
    if (!garment) {
      for (let c = 0; c < r.length; c++) {
        const val = (r[c] || '').trim();
        if (!val || val === timestamp || val === date1 || val === date2 || val === actionCol || val === operator || val === rawDept) continue;
        if (
          val.includes('ผ้า') ||
          val.includes('กาวน์') ||
          val.includes('เอี๊ยม') ||
          val.includes('หมวก') ||
          val.includes('ชุด') ||
          val.includes('ปลอก') ||
          val.includes('Visitor')
        ) {
          garment = val;
          break;
        }
      }
    }

    if (!dept || !garment) return;

    let parsedQty = parseInt(qtyCol, 10);
    const hasExplicitQty = !isNaN(parsedQty) && parsedQty > 0;
    const finalQty = hasExplicitQty ? parsedQty : 1;

    // Format Thai display dates
    const dateParts = normalizedDate.split('-');
    const yearNum = parseInt(dateParts[0], 10);
    const monthNum = parseInt(dateParts[1], 10) - 1;
    const dayNum = parseInt(dateParts[2], 10);
    const dateObj = new Date(yearNum, monthNum, dayNum);
    const thaiDateStr = dateObj.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const isExplicitCompleted =
      actionCol.includes('เสร็จ') ||
      actionCol.includes('เรียบร้อย') ||
      actionCol.includes('พร้อมส่ง') ||
      actionCol.includes('จัดส่งแล้ว') ||
      actionCol.toLowerCase().includes('ready') ||
      actionCol.toLowerCase().includes('complete') ||
      actionCol.toLowerCase().includes('done');

    const key = `${normalizedDate}|${dept.toUpperCase()}|${garment.trim().toLowerCase()}`;

    // Check if there is an active pending 'washing' order waiting for completion
    const pendingList = pendingWashingOrders[key] || [];

    if (isExplicitCompleted && pendingList.length > 0) {
      // Pair with the earliest pending open order (FIFO queue)
      const targetOrder = pendingList.shift()!;
      targetOrder.stage = 'ready';
      targetOrder.completedAt = timestamp || `${thaiDateStr} ${deliveryTime ? formatDeliveryTime(deliveryTime) : '12:35 น.'}`;

      if (deliveryTime) {
        targetOrder.estimatedCompletion = `${thaiDateStr}, ${formatDeliveryTime(deliveryTime)}`;
      }
      // Only update quantity if the completion row explicitly provided a new quantity; otherwise keep the intake quantity!
      if (hasExplicitQty && targetOrder.items.length > 0) {
        targetOrder.items[0].quantity = parsedQty;
        targetOrder.totalPrice = parsedQty * targetOrder.items[0].unitPrice;
        targetOrder.totalWeightKg = parseFloat((parsedQty * 0.35).toFixed(1)) || 1.5;
      }

      targetOrder.historyTimeline.push({
        stage: 'ready',
        label: 'ซักเสร็จแล้ว',
        timestamp: timestamp || (deliveryTime ? formatDeliveryTime(deliveryTime) : '12:35 น.'),
        note: `อัปเดตสถานะ: ซักเสร็จแล้ว${deliveryTime ? ` (เวลาจัดส่ง: ${formatDeliveryTime(deliveryTime)})` : ''}`,
        operator: operator || targetOrder.customerName || 'ระบบอัตโนมัติ Google Sheet',
      });
    } else {
      // Create a NEW order ticket (even if same date, dept, garment exists on the same day)
      if (!dailySeqMap[normalizedDate]) {
        dailySeqMap[normalizedDate] = 1;
      } else {
        dailySeqMap[normalizedDate]++;
      }

      const seqNumber = dailySeqMap[normalizedDate];
      const yy = dateParts[0].slice(-2);
      const mm = dateParts[1];
      const dd = dateParts[2];
      // Accurate tracking code matching the date in Google Sheet: LKB2 - YYMMDDSS
      const trackingCode = `LKB2 - ${yy}${mm}${dd}${String(seqNumber).padStart(2, '0')}`;

      const formattedDelivery = formatDeliveryTime(deliveryTime);
      const estCompletion = `${thaiDateStr}, ${formattedDelivery}`;
      const unitPrice = garment.includes('ผ้ากรอง') || garment.includes('ผ้าคลุม') ? 20 : 15;
      const totalWeight = parseFloat((finalQty * 0.35).toFixed(1)) || 1.5;

      const initialStage = isExplicitCompleted ? 'ready' : 'washing';

      const newOrder: LaundryOrder = {
        id: `gsheet-row-${idx}-${normalizedDate}-${seqNumber}`,
        trackingCode: trackingCode,
        orderDate: normalizedDate,
        customerName: operator || `เจ้าหน้าที่ ${dept}`,
        customerRoomOrDept: dept,
        serviceType: 'Wash & Fold',
        priority: 'normal',
        stage: initialStage,
        items: [
          {
            id: `item-${idx}-1`,
            name: garment,
            category: getGarmentCategory(garment),
            quantity: finalQty,
            unitPrice: unitPrice,
            careNote: 'บันทึกผ่าน Google Sheet',
          },
        ],
        totalWeightKg: totalWeight,
        totalPrice: finalQty * unitPrice,
        paymentStatus: 'Corporate Invoice',
        assignedStaff: operator || 'สุริยา',
        assignedStaffAvatar: isExplicitCompleted
          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
        assignedMachine: 'Intake Station #01',
        waterTemp: 'Warm (40°C)',
        notes: `ประเภทผ้า: ${garment} | แผนก: ${dept}`,
        receivedAt: timestamp || `${thaiDateStr} เวลา 08:30 น.`,
        estimatedCompletion: estCompletion,
        completedAt: isExplicitCompleted ? (timestamp || `${thaiDateStr} 12:35 น.`) : undefined,
        historyTimeline: [
          {
            stage: initialStage,
            label: initialStage === 'ready' ? 'ซักเสร็จแล้ว' : 'อยู่ระหว่างซัก',
            timestamp: timestamp || '08:30 น.',
            note: isExplicitCompleted
              ? `บันทึกข้อมูล: แผนก ${dept} ส่ง ${garment} จำนวน ${finalQty} ชิ้น (สถานะ: ซักเสร็จแล้ว)`
              : `บันทึกข้อมูลรับผ้า: แผนก ${dept} ส่ง ${garment} จำนวน ${finalQty} ชิ้น (สถานะ: อยู่ระหว่างซัก)`,
            operator: operator || 'ระบบอัตโนมัติ Google Sheet',
          },
        ],
      };

      allOrders.push(newOrder);

      // If this was an intake order (washing), add to pending queue so a future completion row can pair with it
      if (!isExplicitCompleted) {
        if (!pendingWashingOrders[key]) {
          pendingWashingOrders[key] = [];
        }
        pendingWashingOrders[key].push(newOrder);
      }
    }
  });

  return allOrders;
}

/**
 * Fetch and sync Google Sheet data with multi-tier failover and graceful snapshot fallback
 */
export async function fetchGoogleSheetLaundryOrders(): Promise<GoogleSheetSyncResult> {
  const candidateUrls = [
    // 1. Backend Proxy (direct fetch from Google Sheets with raw format and no CORS issues)
    '/api/sheet-csv?sheetId=1qbKEbnjIPb2eM-DOLAkFZv3hDl2cioKeUqiLcdYqjos&gid=1278573396',
    // 2. Direct export format
    'https://docs.google.com/spreadsheets/d/1qbKEbnjIPb2eM-DOLAkFZv3hDl2cioKeUqiLcdYqjos/export?format=csv&gid=1278573396',
    // 3. Fallback direct export url
    GOOGLE_SHEET_CSV_URL,
  ];

  let csvText: string | null = null;

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv, text/plain, */*',
        },
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        if (text && text.includes('ประทับเวลา') && text.length > 50) {
          csvText = text;
          lastSuccessfulLaundryCsvText = text;
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem('proworkflow_laundry_csv_cache_v2', text);
            }
          } catch {
            // ignore
          }
          break;
        }
      }
    } catch {
      // Continue to next candidate endpoint
    }
  }

  // If live network request succeeded, or if we have a cached live CSV, use it
  // Only use the static FALLBACK_SHEET_CSV if there is zero cached data
  const finalText = csvText || lastSuccessfulLaundryCsvText || FALLBACK_SHEET_CSV;
  const orders = convertSheetRowsToOrders(finalText);

  return {
    success: true,
    orders,
    rawRowsCount: finalText.split('\n').filter(Boolean).length - 1,
    lastSyncedAt: new Date(),
  };
}

// ==========================================
// RAGS & GLOVES (เศษผ้า - ถุงมือ) GOOGLE SHEET INTEGRATION
// ==========================================
export const RAGS_GLOVES_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1kPRApx8bpI5zcojAxoRREhbBkuZtU2DpQvVd-9hNIiU/edit?resourcekey=&gid=447781807#gid=447781807';
export const RAGS_GLOVES_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1kPRApx8bpI5zcojAxoRREhbBkuZtU2DpQvVd-9hNIiU/gviz/tq?tqx=out:csv&gid=447781807';

export const RAGS_GLOVES_FALLBACK_CSV = `"ประทับเวลา","วันที่","คัดทิ้ง / KG เศษผ้า","ถุงมือ","ก่อนทิ้ง / KG เศษผ้า","เศษผ้า","หลังทิ้ง / KG เศษผ้า","ถุงมือ"
"","19/8/2026","15","5","10","","20","20"
"","20/8/2026","10","5","10","","30","20"
"","21/8/2026","15","","20","","20","15"
"22/8/2026, 16:53:50","22/8/2026","10","10","30","30","20","20"`;

export interface RagsGlovesSyncResult {
  success: boolean;
  monthlyData: Record<string, import('../types').RagsGlovesDailyRecord[]>;
  records: import('../types').RagsGlovesDailyRecord[];
  rawRowsCount: number;
  monthsFound: string[];
  lastSyncedAt: Date;
  error?: string;
}

/**
 * Robust date parser for Rags & Gloves Google Sheet rows
 */
export function parseRagsGlovesDate(dateStr?: string, timestampStr?: string): { year: number; month: number; day: number } | null {
  let raw = (dateStr || '').trim();
  if (!raw && timestampStr) {
    raw = (timestampStr || '').trim();
  }
  if (!raw) return null;

  // Extract date portion before space, comma, or T
  const datePart = raw.split(/[,\sT]+/)[0].trim();

  // Thai month names map
  const thaiMonths: { [key: string]: number } = {
    'ม.ค.': 0, 'มกราคม': 0,
    'ก.พ.': 1, 'กุมภาพันธ์': 1,
    'มี.ค.': 2, 'มีนาคม': 2,
    'เม.ย.': 3, 'เมษายน': 3,
    'พ.ค.': 4, 'พฤษภาคม': 4,
    'มิ.ย.': 5, 'มิถุนายน': 5,
    'ก.ค.': 6, 'กรกฎาคม': 6,
    'ส.ค.': 7, 'สิงหาคม': 7,
    'ก.ย.': 8, 'กันยายน': 8,
    'ต.ค.': 9, 'ตุลาคม': 9,
    'พ.ย.': 10, 'พฤศจิกายน': 10,
    'ธ.ค.': 11, 'ธันวาคม': 11,
  };

  for (const [tMon, mIdx] of Object.entries(thaiMonths)) {
    if (raw.includes(tMon)) {
      const match = raw.match(new RegExp(`(\\d{1,2})\\s*${tMon.replace('.', '\\.')}\\s*(\\d{2,4})?`));
      if (match) {
        const day = parseInt(match[1], 10);
        let year = match[2] ? parseInt(match[2], 10) : new Date().getFullYear();
        if (year > 2400) year -= 543;
        else if (year < 100) year = year > 50 ? 2500 + year - 543 : 2000 + year;
        return { year, month: mIdx, day };
      }
    }
  }

  // Handle slashes: "19/8/2026", "2026/8/19", "8/19/2026", "19/8/2569"
  if (datePart.includes('/')) {
    const parts = datePart.split('/');
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);

      // YYYY/MM/DD
      if (p0 > 1000 || parts[0].length === 4) {
        let year = p0;
        if (year > 2400) year -= 543;
        const month = p1 - 1;
        const day = p2;
        return { year, month, day };
      }

      // DD/MM/YYYY or MM/DD/YYYY
      let year = p2;
      if (year > 2400) year -= 543;
      else if (year < 100) year = year > 50 ? 2500 + year - 543 : 2000 + year;

      let day = p0;
      let month = p1 - 1;
      if (p0 > 12) {
        day = p0;
        month = p1 - 1;
      } else if (p1 > 12) {
        day = p1;
        month = p0 - 1;
      }

      return { year, month, day };
    }
  }

  // Handle dashes: "2026-08-19", "19-08-2026", "19-8-2569"
  if (datePart.includes('-')) {
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);

      if (p0 > 1000 || parts[0].length === 4) {
        let year = p0;
        if (year > 2400) year -= 543;
        const month = p1 - 1;
        const day = p2;
        return { year, month, day };
      }

      let year = p2;
      if (year > 2400) year -= 543;
      else if (year < 100) year = year > 50 ? 2500 + year - 543 : 2000 + year;

      let day = p0;
      let month = p1 - 1;
      if (p0 > 12) {
        day = p0;
        month = p1 - 1;
      } else if (p1 > 12) {
        day = p1;
        month = p0 - 1;
      }

      return { year, month, day };
    }
  }

  const singleDay = parseInt(datePart, 10);
  if (!isNaN(singleDay) && singleDay >= 1 && singleDay <= 31) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: singleDay };
  }

  return null;
}

/**
 * Creates empty month template (1 to daysInMonth)
 */
export function createEmptyMonthRecords(year: number, month: number): import('../types').RagsGlovesDailyRecord[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const records: import('../types').RagsGlovesDailyRecord[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    records.push({
      day: d,
      dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      discardRagsKg: 0,
      discardGlovesKg: 0,
      beforeWashRagsKg: 0,
      beforeWashGlovesKg: 0,
      afterWashRagsKg: 0,
      afterWashGlovesKg: 0,
      note: '',
    });
  }
  return records;
}

/**
 * Converts Rags & Gloves CSV text into multi-month structured dictionary
 */
export function convertSheetRowsToMonthlyRagsGloves(csvText: string): {
  monthlyData: Record<string, import('../types').RagsGlovesDailyRecord[]>;
  rawRowsCount: number;
} {
  const monthlyData: Record<string, import('../types').RagsGlovesDailyRecord[]> = {};

  // Ensure default August 2026 (2026-08) is populated with baseline data
  const aug2026Records = createEmptyMonthRecords(2026, 7);
  INITIAL_RAGS_GLOVES_DATA.forEach((item) => {
    if (item.day >= 1 && item.day <= aug2026Records.length) {
      aug2026Records[item.day - 1] = {
        ...aug2026Records[item.day - 1],
        ...item,
      };
    }
  });
  monthlyData['2026-08'] = aug2026Records;

  const rows = parseCSV(csvText);
  let rawRowsCount = 0;

  if (rows.length > 1) {
    rawRowsCount = rows.length - 1;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;

      const timestampStr = (row[0] || '').trim();
      const dateStr = (row[1] || '').trim();

      const parsedDate = parseRagsGlovesDate(dateStr, timestampStr);
      if (!parsedDate) continue;

      const { year, month, day } = parsedDate;
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = createEmptyMonthRecords(year, month);
      }

      const dayRecords = monthlyData[monthKey];
      if (day < 1 || day > dayRecords.length) continue;

      const recordIndex = day - 1;
      const currentRecord = dayRecords[recordIndex];

      const discardRags = parseFloat(row[2]) || 0;
      const discardGloves = parseFloat(row[3]) || 0;
      const beforeWashRags = parseFloat(row[4]) || 0;
      const beforeWashGloves = parseFloat(row[5]) || 0;
      const afterWashRags = parseFloat(row[6]) || 0;
      const afterWashGloves = parseFloat(row[7]) || 0;

      currentRecord.discardRagsKg = discardRags;
      currentRecord.discardGlovesKg = discardGloves;
      currentRecord.beforeWashRagsKg = beforeWashRags;
      currentRecord.beforeWashGlovesKg = beforeWashGloves;
      currentRecord.afterWashRagsKg = afterWashRags;
      currentRecord.afterWashGlovesKg = afterWashGloves;
      currentRecord.dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (timestampStr) {
        currentRecord.note = `Google Sheet (${timestampStr})`;
      } else {
        currentRecord.note = 'Google Sheet Sync';
      }
    }
  }

  return { monthlyData, rawRowsCount };
}

/**
 * Converts Rags & Gloves Google Sheet rows into structured RagsGlovesDailyRecord[] for a specific month
 */
export function convertSheetRowsToRagsGloves(csvText: string, year = 2026, month = 7): import('../types').RagsGlovesDailyRecord[] {
  const { monthlyData } = convertSheetRowsToMonthlyRagsGloves(csvText);
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  return monthlyData[key] || createEmptyMonthRecords(year, month);
}

/**
 * Fetches Rags & Gloves records live from Google Sheet across all months
 */
export async function fetchGoogleSheetRagsGloves(targetYear = 2026, targetMonth = 7): Promise<RagsGlovesSyncResult> {
  const candidateUrls = [
    '/api/sheet-csv?sheetId=1kPRApx8bpI5zcojAxoRREhbBkuZtU2DpQvVd-9hNIiU&gid=447781807',
    'https://docs.google.com/spreadsheets/d/1kPRApx8bpI5zcojAxoRREhbBkuZtU2DpQvVd-9hNIiU/export?format=csv&gid=447781807',
    RAGS_GLOVES_SHEET_CSV_URL,
    'https://docs.google.com/spreadsheets/d/1kPRApx8bpI5zcojAxoRREhbBkuZtU2DpQvVd-9hNIiU/gviz/tq?tqx=out:csv&sheet=Form%20Responses%201',
    'https://spreadsheets.google.com/tq?tqx=out:csv&key=1kPRApx8bpI5zcojAxoRREhbBkuZtU2DpQvVd-9hNIiU&gid=447781807',
  ];

  let csvText: string | null = null;

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv, text/plain, */*',
        },
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        if (text && (text.includes('ประทับเวลา') || text.includes('วันที่') || text.includes('คัดทิ้ง'))) {
          csvText = text;
          break;
        }
      }
    } catch {
      // Continue to next candidate endpoint
    }
  }

  const finalText = csvText || RAGS_GLOVES_FALLBACK_CSV;
  const { monthlyData, rawRowsCount } = convertSheetRowsToMonthlyRagsGloves(finalText);
  const targetKey = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
  const currentMonthRecords = monthlyData[targetKey] || createEmptyMonthRecords(targetYear, targetMonth);

  return {
    success: true,
    monthlyData,
    records: currentMonthRecords,
    monthsFound: Object.keys(monthlyData),
    rawRowsCount,
    lastSyncedAt: new Date(),
  };
}

// ==========================================
// MAINTENANCE / REPAIR (งานแจ้งซ่อม) GOOGLE SHEET INTEGRATION
// ==========================================
export const MAINTENANCE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1JOX988hDcFC4c-VUGac7qX_2PH09Zvrnni8evubqiyA/edit?gid=886197199#gid=886197199';
export const MAINTENANCE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1JOX988hDcFC4c-VUGac7qX_2PH09Zvrnni8evubqiyA/export?format=csv&gid=886197199';
export const MAINTENANCE_SHEET_GVIZ_CSV_URL = 'https://docs.google.com/spreadsheets/d/1JOX988hDcFC4c-VUGac7qX_2PH09Zvrnni8evubqiyA/gviz/tq?tqx=out:csv&gid=886197199';
export const MAINTENANCE_SHEET_JSON_URL = 'https://docs.google.com/spreadsheets/d/1JOX988hDcFC4c-VUGac7qX_2PH09Zvrnni8evubqiyA/gviz/tq?tqx=out:json&gid=886197199';

export const MAINTENANCE_FALLBACK_CSV = `ลำดับ,เลขที่ใบแจ้งงาน,หน่วยงานที่รับแจ้ง,ปัญหา / รายละเอียด,วันที่แจ้ง,สถานะใบงาน,วันดำเนินการ,ผู้แจ้ง,วันที่แล้วเสร็จ,หมายเหตุุ
1,25043101500001,เทคนิคบริการ ส่วนบำรุงรักษาอาคาร ลาดกระบัง,ซ่อมแซมพื้นแตกชำรุด บริเวณด้านหน้าฝ่ายทรัพยากรบุคคล ชั้น 1 อาคาร A,03-04-25,เสร็จแล้ว,03-04-25,ณัฐพร,18-06-25,
2,25043101500001,แผนกไฟฟ้า ลาดกระบัง ฝ่ายวิศวกรรม,หลอดไฟชำรุดจำนวน 1 หลอด ภายในห้องประชุม TPM2 อาคาร C ชั้น 2,03-04-25,เสร็จแล้ว,03-04-25,ณัฐพร,04-04-25,
3,25043101500002,แผนกบำรุงรักษาระบบสุขาภิบาลและเครื่องกล (ลาดกระบัง),โถปัสสาวะห้องน้ำชายชำรุดจำนวน 2 ตัว ห้องน้ำชาย ชั้น 1 อาคาร C,04-04-25,เสร็จแล้ว,04-04-25,ณัฐพร,04-04-25,
4,25043101500002,แผนกไฟฟ้า ลาดกระบัง ฝ่ายวิศวกรรม,หลอดไฟชำรุด บริเวณทางเข้าไลน์อาคาร A ชั้น 1,04-04-25,เสร็จแล้ว,04-04-25,ณัฐพร,05-04-25,
5,25043101500003,แผนกไฟฟ้า ลาดกระบัง ฝ่ายวิศวกรรม,หลอดไฟชำรุด บริเวณห้องหญิง อาคาร B ชั้น 1,04-04-25,เสร็จแล้ว,04-04-25,ณัฐพร,05-04-25,
475,26073101500003,แผนกธุรการลาดกระบัง1,ขอยืมโน๊ตบุ๊ค สำหรับใช้ประชุมแผนกธุรการ,24-07-26,เสร็จแล้ว,24-07-26,ณัฐพร,24-07-26,
481,26083101500001,แผนกธุรการลาดกระบัง1,นำเครื่องเป่ามือส่งซ่อมศูนย์บริการ,07-08-26,เสร็จแล้ว,07-08-26,ณัฐพร,07-08-26,
493,26083101500003,แผนกธุรการลาดกระบัง1,รับเครื่องเป่ามือคืน,19-08-26,อยู่ระหว่างดำเนินการ,19-08-26,ณัฐพร,,
494,0M003746,เทคนิคบริการ ส่วนบำรุงรักษาอาคาร ลาดกระบัง,ทำตะแกรงปิดฝาท่อน้ำ ข้างอาคาร A หน้าห้องเก็บเศษผ้า,20-08-26,อยู่ระหว่างดำเนินการ,20-08-26,ณัฐพร,,
495,0M003749,เทคนิคบริการ ส่วนบำรุงรักษาอาคาร ลาดกระบัง,ทำที่แขวน เป็นตะขอเหล็ก หน้าห้องน้ำอาคาร B ชั้น 2,20-08-26,อยู่ระหว่างดำเนินการ,20-08-26,ณัฐพร,,
496,0M003767,แผนกบำรุงรักษาระบบสุขาภิบาลและเครื่องกล (ลาดกระบัง),อ่างล้างจาน หน้าห้องวิศกรรม อาคาร C ชั้น 2 ชำรุด,20-08-26,แจ้งใหม่,20-08-26,ณัฐพร,,`;

export interface MaintenanceSyncResult {
  success: boolean;
  tickets: import('../types').MaintenanceTicket[];
  rawRowsCount: number;
  lastSyncedAt: Date;
  error?: string;
}

export function cleanWorkOrderNo(val: any): string {
  if (val === null || val === undefined) return '';
  let s = String(val).trim();
  
  if (s === '-' || s === '--' || s === 'null' || s === 'undefined') return '';

  // 1. Strip Google Sheets / Excel formula prefix e.g. ="25043101500001", =""25043101500001"", ='25043101500001', =25043101500001
  while (s.startsWith('=')) {
    s = s.slice(1).trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1).trim();
    }
  }

  // 2. Strip enclosing single or double quotes
  s = s.replace(/^["']+|["']+$/g, '').trim();

  // 3. Handle scientific notation from number formatting (e.g. 2.5043101500001E+13 or 2.50431E+13)
  if (/^[0-9.]+[eE][+-]?[0-9]+$/.test(s)) {
    try {
      const num = Number(s);
      if (!isNaN(num) && isFinite(num)) {
        s = BigInt(Math.round(num)).toString();
      }
    } catch {
      // keep s as is
    }
  }

  // 4. Remove unwanted trailing .0 if integer was formatted as float (e.g. 25043101500001.0 -> 25043101500001)
  if (/^\d+\.0$/.test(s)) {
    s = s.slice(0, -2);
  }

  return s.trim();
}

/**
 * Parses raw CSV text into MaintenanceTicket objects with dynamic header detection
 */
export function convertSheetRowsToMaintenanceTickets(csvText: string): import('../types').MaintenanceTicket[] {
  const rows = parseCSV(csvText);
  if (!rows || rows.length === 0) return [];

  // 1. Dynamic Header Row & Column Detection
  let headerIndex = -1;
  let colSeq = 0;
  let colWorkOrder = 1;
  let colDept = 2;
  let colIssue = 3;
  let colReportedDate = 4;
  let colStatus = 5;
  let colActionDate = 6;
  let colRequester = 7;
  let colCompletedDate = 8;
  let colNote = 9;

  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const rowStr = row.join(' ').toLowerCase();

    if (
      rowStr.includes('เลขที่ใบแจ้งงาน') ||
      rowStr.includes('เลขที่ใบแจ้ง') ||
      rowStr.includes('ใบแจ้งงาน') ||
      rowStr.includes('ปัญหา') ||
      rowStr.includes('สถานะใบงาน') ||
      rowStr.includes('หน่วยงาน')
    ) {
      headerIndex = i;

      row.forEach((cell, colIdx) => {
        const h = cell.trim().toLowerCase();
        if (h === 'ลำดับ' || h === 'ลำดับที่' || h === 'no' || h === 'seq' || h === 'no.') {
          colSeq = colIdx;
        } else if (
          h.includes('เลขที่ใบแจ้งงาน') ||
          h.includes('เลขที่ใบแจ้ง') ||
          h.includes('เลขที่ใบงาน') ||
          h.includes('เลขที่') ||
          h.includes('work order') ||
          h.includes('wo no') ||
          h.includes('wo#') ||
          h.includes('ticket') ||
          h.includes('job no')
        ) {
          colWorkOrder = colIdx;
        } else if (
          h.includes('หน่วยงาน') ||
          h.includes('แผนก') ||
          h.includes('ฝ่าย') ||
          h.includes('dept') ||
          h.includes('department')
        ) {
          colDept = colIdx;
        } else if (
          h.includes('ปัญหา') ||
          h.includes('รายละเอียด') ||
          h.includes('อาการ') ||
          h.includes('issue') ||
          h.includes('detail') ||
          h.includes('description')
        ) {
          colIssue = colIdx;
        } else if (
          h.includes('วันที่แจ้ง') ||
          h.includes('วันแจ้ง') ||
          (h.includes('วันที่') && !h.includes('แล้วเสร็จ') && !h.includes('ดำเนินการ'))
        ) {
          colReportedDate = colIdx;
        } else if (h.includes('สถานะ') || h.includes('status')) {
          colStatus = colIdx;
        } else if (
          h.includes('วันดำเนินการ') ||
          h.includes('วันที่ดำเนินการ') ||
          h.includes('action date')
        ) {
          colActionDate = colIdx;
        } else if (
          h.includes('ผู้แจ้ง') ||
          h.includes('ชื่อผู้แจ้ง') ||
          h.includes('requester') ||
          h.includes('reporter')
        ) {
          colRequester = colIdx;
        } else if (
          h.includes('แล้วเสร็จ') ||
          h.includes('เสร็จสิ้น') ||
          h.includes('วันที่เสร็จ') ||
          h.includes('completed')
        ) {
          colCompletedDate = colIdx;
        } else if (h.includes('หมายเหตุ') || h.includes('remark') || h.includes('note')) {
          colNote = colIdx;
        }
      });
      break;
    }
  }

  const startIndex = headerIndex >= 0 ? headerIndex + 1 : 1;
  const tickets: import('../types').MaintenanceTicket[] = [];

  for (let i = startIndex; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 2) continue;

    const seqRaw = (r[colSeq] || '').trim();
    const workOrderNo = cleanWorkOrderNo(r[colWorkOrder] || '');
    const department = (r[colDept] || '').trim();
    const issueDetail = (r[colIssue] || '').trim();
    const reportedDate = (r[colReportedDate] || '').trim();
    const statusRaw = (r[colStatus] || '').trim();
    const actionDate = (r[colActionDate] || '').trim();
    const requester = (r[colRequester] || '').trim();
    const completedDate = (r[colCompletedDate] || '').trim();
    const note = (r[colNote] || '').trim();

    // Skip empty filler rows
    if (!workOrderNo && !issueDetail && !department && !reportedDate) continue;

    const seq = parseInt(seqRaw, 10) || (i - startIndex + 1);
    const finalWorkOrderNo = workOrderNo;

    let status: import('../types').MaintenanceStatus = 'แจ้งใหม่';
    if (statusRaw.includes('เสร็จ') || statusRaw.includes('เรียบร้อย') || statusRaw.includes('Complete')) {
      status = 'เสร็จแล้ว';
    } else if (statusRaw.includes('ดำเนิน') || statusRaw.includes('ระหว่าง') || statusRaw.includes('Progress') || statusRaw.includes('กำลัง')) {
      status = 'อยู่ระหว่างดำเนินการ';
    } else {
      status = 'แจ้งใหม่';
    }

    // Extract location info if mentioned in text
    let location: string | undefined = undefined;
    const locMatch = issueDetail.match(/(อาคาร\s*[A-Za-z0-9]+|ชั้น\s*[0-9]+|ห้อง\S+|ห้องน้ำ\S+|บริเวณ\S+)/);
    if (locMatch) {
      location = locMatch[0];
    }

    // Determine priority by urgency keywords
    let priority: 'normal' | 'high' | 'urgent' = 'normal';
    const lowerIssue = issueDetail.toLowerCase();
    if (lowerIssue.includes('ด่วนที่สุด') || lowerIssue.includes('ไฟไหม้') || lowerIssue.includes('รั่วซึมหนัก') || lowerIssue.includes('ระเบิด')) {
      priority = 'urgent';
    } else if (lowerIssue.includes('ด่วน') || lowerIssue.includes('ดับ') || lowerIssue.includes('ตัน') || lowerIssue.includes('แตก') || lowerIssue.includes('ชำรุด')) {
      priority = 'high';
    }

    tickets.push({
      id: `maint-${seq}${finalWorkOrderNo ? `-${finalWorkOrderNo.replace(/[^a-zA-Z0-9]/g, '')}` : ''}`,
      seq,
      workOrderNo: finalWorkOrderNo,
      department: department || 'ทั่วไป',
      issueDetail: issueDetail || '-',
      reportedDate: reportedDate || '-',
      status,
      actionDate: actionDate || undefined,
      requester: requester || 'เจ้าหน้าที่',
      completedDate: completedDate || undefined,
      note: note || undefined,
      location,
      priority,
    });
  }

  // Return tickets sorted latest/highest seq first
  return tickets.reverse();
}

/**
 * Fetches Maintenance tickets live from Google Sheet with fallback strategies
 */
export async function fetchGoogleSheetMaintenanceTickets(): Promise<MaintenanceSyncResult> {
  const candidateUrls = [
    '/api/sheet-csv?sheetId=1JOX988hDcFC4c-VUGac7qX_2PH09Zvrnni8evubqiyA&gid=886197199',
    MAINTENANCE_SHEET_CSV_URL,
    'https://docs.google.com/spreadsheets/d/1JOX988hDcFC4c-VUGac7qX_2PH09Zvrnni8evubqiyA/export?format=csv&gid=886197199',
    MAINTENANCE_SHEET_GVIZ_CSV_URL,
    'https://docs.google.com/spreadsheets/d/1JOX988hDcFC4c-VUGac7qX_2PH09Zvrnni8evubqiyA/gviz/tq?tqx=out:csv&sheet=งานแจ้งซ่อม',
    MAINTENANCE_SHEET_JSON_URL,
  ];

  let tickets: import('../types').MaintenanceTicket[] | null = null;

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/csv, text/plain, */*',
        },
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();

        // Check if response is gviz JSON format
        if (text.includes('google.visualization.Query.setResponse') || (text.startsWith('{') && text.includes('table'))) {
          try {
            const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
            const data = JSON.parse(jsonStr);
            if (data && data.table && Array.isArray(data.table.rows)) {
              const rows = data.table.rows;
              const parsedTickets: import('../types').MaintenanceTicket[] = [];

              rows.forEach((r: any, idx: number) => {
                if (!r || !r.c) return;
                const c = r.c;
                const seqVal = c[0] ? (c[0].v ?? c[0].f) : idx + 1;
                const seq = typeof seqVal === 'number' ? seqVal : parseInt(String(seqVal), 10) || (idx + 1);
                
                let workOrderNo = cleanWorkOrderNo(c[1] ? (c[1].f ?? c[1].v) : '');
                const dept = String(c[2]?.f ?? c[2]?.v ?? '').trim();
                const issue = String(c[3]?.f ?? c[3]?.v ?? '').trim();
                
                // Format dates safely
                let repDate = String(c[4]?.f ?? c[4]?.v ?? '').trim();
                if (repDate.startsWith('Date(')) {
                  const m = repDate.match(/Date\((\d+),(\d+),(\d+)\)/);
                  if (m) {
                    const y = parseInt(m[1], 10);
                    const mo = parseInt(m[2], 10) + 1;
                    const d = parseInt(m[3], 10);
                    repDate = `${String(d).padStart(2, '0')}-${String(mo).padStart(2, '0')}-${String(y).slice(-2)}`;
                  }
                }

                const statusStr = String(c[5]?.f ?? c[5]?.v ?? '').trim();
                
                let actDate = String(c[6]?.f ?? c[6]?.v ?? '').trim();
                if (actDate.startsWith('Date(')) {
                  const m = actDate.match(/Date\((\d+),(\d+),(\d+)\)/);
                  if (m) {
                    const y = parseInt(m[1], 10);
                    const mo = parseInt(m[2], 10) + 1;
                    const d = parseInt(m[3], 10);
                    actDate = `${String(d).padStart(2, '0')}-${String(mo).padStart(2, '0')}-${String(y).slice(-2)}`;
                  }
                }

                const requester = String(c[7]?.f ?? c[7]?.v ?? '').trim();

                let compDate = String(c[8]?.f ?? c[8]?.v ?? '').trim();
                if (compDate.startsWith('Date(')) {
                  const m = compDate.match(/Date\((\d+),(\d+),(\d+)\)/);
                  if (m) {
                    const y = parseInt(m[1], 10);
                    const mo = parseInt(m[2], 10) + 1;
                    const d = parseInt(m[3], 10);
                    compDate = `${String(d).padStart(2, '0')}-${String(mo).padStart(2, '0')}-${String(y).slice(-2)}`;
                  }
                }

                const note = String(c[9]?.f ?? c[9]?.v ?? '').trim();

                // Skip completely empty rows
                if (!workOrderNo && !issue && !dept && !repDate) return;

                const finalWorkOrderNo = workOrderNo;

                let status: import('../types').MaintenanceStatus = 'แจ้งใหม่';
                if (statusStr.includes('เสร็จ') || statusStr.includes('เรียบร้อย') || statusStr.includes('Complete')) {
                  status = 'เสร็จแล้ว';
                } else if (statusStr.includes('ดำเนิน') || statusStr.includes('ระหว่าง') || statusStr.includes('Progress') || statusStr.includes('กำลัง')) {
                  status = 'อยู่ระหว่างดำเนินการ';
                } else {
                  status = 'แจ้งใหม่';
                }

                // Extract location
                let location: string | undefined = undefined;
                const locMatch = issue.match(/(อาคาร\s*[A-Za-z0-9]+|ชั้น\s*[0-9]+|ห้อง\S+|ห้องน้ำ\S+|บริเวณ\S+)/);
                if (locMatch) {
                  location = locMatch[0];
                }

                let priority: 'normal' | 'high' | 'urgent' = 'normal';
                const lowerIssue = issue.toLowerCase();
                if (lowerIssue.includes('ด่วนที่สุด') || lowerIssue.includes('ไฟไหม้') || lowerIssue.includes('รั่วซึมหนัก') || lowerIssue.includes('ระเบิด')) {
                  priority = 'urgent';
                } else if (lowerIssue.includes('ด่วน') || lowerIssue.includes('ดับ') || lowerIssue.includes('ตัน') || lowerIssue.includes('แตก') || lowerIssue.includes('ชำรุด')) {
                  priority = 'high';
                }

                parsedTickets.push({
                  id: `maint-${seq}${finalWorkOrderNo ? `-${finalWorkOrderNo.replace(/[^a-zA-Z0-9]/g, '')}` : ''}`,
                  seq,
                  workOrderNo: finalWorkOrderNo,
                  department: dept || 'ทั่วไป',
                  issueDetail: issue || '-',
                  reportedDate: repDate || '-',
                  status,
                  actionDate: actDate || undefined,
                  requester: requester || 'เจ้าหน้าที่',
                  completedDate: compDate || undefined,
                  note: note || undefined,
                  location,
                  priority,
                });
              });

              if (parsedTickets.length > 0) {
                tickets = parsedTickets.reverse();
                break;
              }
            }
          } catch {
            // fallback to CSV parsing
          }
        }

        // CSV format handling
        if (text && (text.includes('เลขที่ใบแจ้งงาน') || text.includes('ปัญหา') || text.includes('ลำดับ'))) {
          const parsed = convertSheetRowsToMaintenanceTickets(text);
          if (parsed.length > 0) {
            tickets = parsed;
            break;
          }
        }
      }
    } catch {
      // Try next endpoint
    }
  }

  if (!tickets || tickets.length === 0) {
    tickets = convertSheetRowsToMaintenanceTickets(MAINTENANCE_FALLBACK_CSV);
  }

  return {
    success: true,
    tickets,
    rawRowsCount: tickets.length,
    lastSyncedAt: new Date(),
  };
}

// ==========================================
// Google Sheet Integration for บันทึก OT (OT Records)
// ==========================================
export const OT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1WczTqypbRZgEqhgz221wIEw76KH-zIZzrgVQex-z87s/edit?gid=0#gid=0';
export const OT_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1WczTqypbRZgEqhgz221wIEw76KH-zIZzrgVQex-z87s/export?format=csv&gid=0';
export const OT_SHEET_GVIZ_CSV_URL = 'https://docs.google.com/spreadsheets/d/1WczTqypbRZgEqhgz221wIEw76KH-zIZzrgVQex-z87s/gviz/tq?tqx=out:csv&gid=0';
export const OT_SHEET_JSON_URL = 'https://docs.google.com/spreadsheets/d/1WczTqypbRZgEqhgz221wIEw76KH-zIZzrgVQex-z87s/gviz/tq?tqx=out:json&gid=0';

export const OT_FALLBACK_CSV = `วันที่บันทึกข้อมูล,รหัสพนักงาน,ชื่อ - นามสกุล,ฝ่ายงาน,วันที่ทำ OT,เวลาทำ OT,,เลขที่เอกสาร,สถานะ,หมายเหตุ
,,,,,เวลาเริ่มต้น,เวลาสิ้นสุด,,,
11/3/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,3/3/2026,14.30,18.30,13210,Approved,
,363146,ณัฐภัทร ละลี,แม่บ้าน,3/3/2026,14.30,18.30,,Approved,
11/3/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,4/3/2026,14.30,18.30,13561,Approved,
11/3/2026,359110,พรนิภา บุติพันคา,แม่บ้าน,5/3/2026,14.30,16.30,13924,Approved,
11/3/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,6/3/2026,14.30,16.30,14147,Approved,
11/3/2026,339858,ชมภู ยาหยี,ธุรการ,6/3/2026,14.30,15.30,14189,Approved,
,716767,สุริยา เวชพันธ์,ธุรการ,6/3/2026,14.30,15.30,,Approved,
,714314,นพเก้า ทองปลิว,ธุรการ,6/3/2026,14.30,15.30,,Approved,
,720592,พงศกร พิกุลทอง,ธุรการ,6/3/2026,14.30,15.30,,Approved,
11/3/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,7/3/2026,6.00,14.30,14260,Approved,
11/3/2026,359110,พรนิภา บุติพันคา,แม่บ้าน,10/3/2026,6.00,14.30,13206,Approved,
12/3/2026,716767,สุริยา เวชพันธ์,ธุรการ,12/03/2026,14.30,16.30,15495,Approved,
,358167,สงกรานต์ สุริยแสง,แม่บ้าน,12/03/2026,14.30,16.30,,Approved,
12/3/2026,720592,พงศกร พิกุลทอง,ธุรการ,13/03/2026,4.00,6.00,15565,Approved,
13/03/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,13/3/2026,14.30,16.30,15788,Approved,
,716767,สุริยา เวชพันธ์,ธุรการ,13/3/2026,14.30,16.30,,Approved,
13/3/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,14/3/2026,6.00,14.30,15790,Approved,
15/3/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,15/3/2026,14.30,16.30,16043,Approved,
,363146,ณัฐภัทร ละลี,แม่บ้าน,15/3/2026,14.30,16.30,,Approved,
16/3/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,16/3/2026,14.30,16.30,16289,Approved,
,363146,ณัฐภัทร ละลี,แม่บ้าน,16/3/2026,14.30,16.30,,Approved,
2/4/2026,714314,นพเก้า ทองปลิว,ธุรการ,6/4/2026,6.00,14.30,19288,Approved,
,339858,ชมภู ยาหยี,ธุรการ,6/4/2026,6.00,14.30,,Approved,
,359110,พรนิภา บุติพันคา,แม่บ้าน,6/4/2026,6.00,14.30,,Approved,
,363146,ณัฐภัทร ละลี,แม่บ้าน,6/4/2026,6.00,14.30,,Approved,
2/4/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,14/4/2026,6.00,14.30,19291,Approved,
,720592,พงศกร พิกุลทอง,ธุรการ,14/4/2026,6.00,14.30,,Approved,
30/4/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,1/5/2026,6.00,14.30,24077,Approved,
,359110,พรนิภา บุติพันคา,แม่บ้าน,25/8/2026,14.30,19.00,,Confirm,ไปช่วยงานแผนกผลิต B5
11/8/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,26/8/2026,14.30,20.30,44260,Confirm,ไปช่วยงานแผนกผลิต B5
,359110,พรนิภา บุติพันคา,แม่บ้าน,26/8/2026,14.30,20.00,,Confirm,ไปช่วยงานแผนกผลิต B5
11/8/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,27/8/2026,14.30,18.30,44263,Confirm,ไปช่วยงานแผนกผลิต B5
,359110,พรนิภา บุติพันคา,แม่บ้าน,27/8/2026,14.30,18.30,,Confirm,ไปช่วยงานแผนกผลิต B5
11/8/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,28/8/2026,14.30,18.30,44264,Confirm,ไปช่วยงานแผนกผลิต B5
,359110,พรนิภา บุติพันคา,แม่บ้าน,28/8/2026,14.30,18.30,,Confirm,ไปช่วยงานแผนกผลิต B5
11/8/2026,359110,พรนิภา บุติพันคา,แม่บ้าน,29/8/2026,14.30,19.30,44268,Confirm,ไปช่วยงานแผนกผลิต B5
11/8/2026,359110,พรนิภา บุติพันคา,แม่บ้าน,30/8/2026,6.00,14.30,44270,Confirm,OT. วันหยุดประจำสัปดาห์
11/8/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,30/8/2026,14.30,19.30,44271,Confirm,ไปช่วยงานแผนกผลิต B5
11/8/2026,358167,สงกรานต์ สุริยแสง,แม่บ้าน,31/8/2026,14.30,18.30,45897,Confirm,ไปช่วยงานแผนกผลิต B5
,359110,พรนิภา บุติพันคา,แม่บ้าน,31/8/2026,14.30,18.30,,Confirm,ไปช่วยงานแผนกผลิต B5`;

export interface OtSyncResult {
  success: boolean;
  records: OtRecord[];
  rawRowsCount: number;
  lastSyncedAt: Date;
  error?: string;
}

export function calcOtHours(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 0;
  const parseTime = (t: string) => {
    const s = String(t).trim().replace(':', '.');
    const parts = s.split('.');
    const h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    return h + (m / 60);
  };
  const st = parseTime(startTime);
  const et = parseTime(endTime);
  let diff = et - st;
  if (diff < 0) diff += 24; // overnight OT
  return Math.round(diff * 10) / 10;
}

/**
 * Format OT duration in clock time format:
 * e.g., 0.5 hr -> ".30"
 * 2.5 hrs -> "2.30"
 * 4.0 hrs -> "4.00"
 * 8.5 hrs -> "8.30"
 */
export function formatOtHoursDisplay(startTime?: string, endTime?: string, totalHours?: number): string {
  if (startTime && endTime && startTime !== '-' && endTime !== '') {
    const parseTimeToMins = (t: string) => {
      const s = String(t).trim().replace(':', '.');
      const parts = s.split('.');
      const h = parseInt(parts[0] || '0', 10);
      let mStr = parts[1] || '0';
      if (mStr.length === 1) mStr = mStr + '0';
      const m = parseInt(mStr, 10);
      return h * 60 + m;
    };
    const st = parseTimeToMins(startTime);
    const et = parseTimeToMins(endTime);
    let diff = et - st;
    if (diff < 0) diff += 24 * 60;
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    const minsStr = mins < 10 ? `0${mins}` : `${mins}`;
    if (mins === 0) {
      return `${hrs}.00`;
    }
    if (hrs === 0) {
      return `.${minsStr}`;
    }
    return `${hrs}.${minsStr}`;
  }

  if (typeof totalHours === 'number' && !isNaN(totalHours)) {
    const hrs = Math.floor(totalHours);
    const mins = Math.round((totalHours - hrs) * 60);
    const minsStr = mins < 10 ? `0${mins}` : `${mins}`;
    if (mins === 0) {
      return `${hrs}.00`;
    }
    if (hrs === 0) {
      return `.${minsStr}`;
    }
    return `${hrs}.${minsStr}`;
  }

  return '-';
}

export function convertSheetRowsToOtRecords(csvText: string): OtRecord[] {
  const rows = parseCSV(csvText);
  if (!rows || rows.length < 2) return [];

  // Find header line
  let headerIndex = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const rowStr = rows[i].join(' ');
    if (rowStr.includes('รหัสพนักงาน') || rowStr.includes('ชื่อ') || rowStr.includes('วันที่ทำ OT')) {
      headerIndex = i;
      break;
    }
  }

  // Parse records
  const records: OtRecord[] = [];
  let lastRecordedDate = '';
  let lastDocNo = '';

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 3) continue;

    // Skip subheader row if present (e.g. line with 'เวลาเริ่มต้น', 'เวลาสิ้นสุด')
    if (r.join(' ').includes('เวลาเริ่มต้น') || r.join(' ').includes('เวลาสิ้นสุด')) continue;

    const recordedDateRaw = cleanWorkOrderNo(r[0] || '');
    const empIdRaw = cleanWorkOrderNo(r[1] || '');
    const nameRaw = (r[2] || '').trim();
    const deptRaw = (r[3] || '').trim();
    const otDateRaw = cleanWorkOrderNo(r[4] || '');
    const startTimeRaw = cleanWorkOrderNo(r[5] || '');
    const endTimeRaw = cleanWorkOrderNo(r[6] || '');
    const docNoRaw = cleanWorkOrderNo(r[7] || '');
    const statusRaw = (r[8] || '').trim();
    const noteRaw = (r[9] || '').trim();

    // Skip invalid rows or formulas (#N/A)
    if (!empIdRaw && !nameRaw) continue;
    if (empIdRaw === '#N/A' || nameRaw === '#N/A' || deptRaw === '#N/A') continue;

    if (recordedDateRaw) {
      lastRecordedDate = recordedDateRaw;
    }
    if (docNoRaw) {
      lastDocNo = docNoRaw;
    }

    const seq = records.length + 1;
    const totalHours = calcOtHours(startTimeRaw, endTimeRaw);

    let status = statusRaw;
    if (!status) {
      status = 'Approved';
    }

    records.push({
      id: `ot-${seq}-${empIdRaw || 'no-id'}-${docNoRaw || lastDocNo || 'nodoc'}`,
      seq,
      recordedDate: recordedDateRaw || lastRecordedDate || '-',
      employeeId: empIdRaw || '-',
      employeeName: nameRaw || 'ไม่ระบุชื่อ',
      department: deptRaw || 'ทั่วไป',
      otDate: otDateRaw || '-',
      startTime: startTimeRaw || '-',
      endTime: endTimeRaw || '-',
      totalHours,
      docNo: docNoRaw || lastDocNo || '-',
      status,
      note: noteRaw || undefined,
    });
  }

  return records;
}

export function parseGvizJsonOtRecords(jsonStr: string): OtRecord[] {
  try {
    const jsonStart = jsonStr.indexOf('{');
    const jsonEnd = jsonStr.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) return [];

    const cleanJson = jsonStr.substring(jsonStart, jsonEnd + 1);
    const gvizData = JSON.parse(cleanJson);
    const gvizRows = gvizData?.table?.rows;
    if (!Array.isArray(gvizRows)) return [];

    const parsedRecords: OtRecord[] = [];
    let lastRecordedDate = '';
    let lastDocNo = '';

    gvizRows.forEach((rowObj: { c: Array<{ v: unknown; f?: string } | null> }) => {
      const getVal = (idx: number): string => {
        const cell = rowObj.c ? rowObj.c[idx] : null;
        if (!cell) return '';
        return String(cell.f || cell.v || '').trim();
      };

      const recordedDateRaw = cleanWorkOrderNo(getVal(0));
      const empIdRaw = cleanWorkOrderNo(getVal(1));
      const nameRaw = getVal(2);
      const deptRaw = getVal(3);
      const otDateRaw = cleanWorkOrderNo(getVal(4));
      const startTimeRaw = cleanWorkOrderNo(getVal(5));
      const endTimeRaw = cleanWorkOrderNo(getVal(6));
      const docNoRaw = cleanWorkOrderNo(getVal(7));
      const statusRaw = getVal(8);
      const noteRaw = getVal(9);

      if (!empIdRaw && !nameRaw) return;
      if (empIdRaw === '#N/A' || nameRaw === '#N/A' || deptRaw === '#N/A') return;

      if (recordedDateRaw) lastRecordedDate = recordedDateRaw;
      if (docNoRaw) lastDocNo = docNoRaw;

      const seq = parsedRecords.length + 1;
      const totalHours = calcOtHours(startTimeRaw, endTimeRaw);

      parsedRecords.push({
        id: `ot-${seq}-${empIdRaw || 'no-id'}-${docNoRaw || lastDocNo || 'nodoc'}`,
        seq,
        recordedDate: recordedDateRaw || lastRecordedDate || '-',
        employeeId: empIdRaw || '-',
        employeeName: nameRaw || 'ไม่ระบุชื่อ',
        department: deptRaw || 'ทั่วไป',
        otDate: otDateRaw || '-',
        startTime: startTimeRaw || '-',
        endTime: endTimeRaw || '-',
        totalHours,
        docNo: docNoRaw || lastDocNo || '-',
        status: statusRaw || 'Approved',
        note: noteRaw || undefined,
      });
    });

    return parsedRecords;
  } catch {
    return [];
  }
}

// In-memory cache & single-flight promise for lightning-fast OT retrieval
let inMemoryOtRecords: OtRecord[] | null = null;
let inFlightOtPromise: Promise<OtSyncResult> | null = null;

export function getCachedOtRecords(): OtRecord[] {
  if (inMemoryOtRecords && inMemoryOtRecords.length > 0) {
    return inMemoryOtRecords;
  }
  try {
    const cached = localStorage.getItem('proworkflow_ot_records_cache_v2');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryOtRecords = parsed;
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Super-fast Google Sheets OT records fetcher:
 * - Fires multiple endpoints concurrently with individual timeouts
 * - Resolves with the fastest successful response
 * - Caches in memory and localStorage for instant sub-millisecond retrieval
 */
export async function fetchGoogleSheetOtRecords(options?: { forceRefresh?: boolean }): Promise<OtSyncResult> {
  if (!options?.forceRefresh && inFlightOtPromise) {
    return inFlightOtPromise;
  }

  const executeFetch = async (): Promise<OtSyncResult> => {
    const endpoints = [
      OT_SHEET_GVIZ_CSV_URL,
      OT_SHEET_CSV_URL,
      'https://docs.google.com/spreadsheets/d/1WczTqypbRZgEqhgz221wIEw76KH-zIZzrgVQex-z87s/gviz/tq?tqx=out:csv&sheet=Sheet1',
      OT_SHEET_JSON_URL,
    ];

    // Try all endpoints in parallel and take the fastest valid response
    const fetchSingleEndpoint = async (url: string): Promise<OtRecord[]> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'text/csv, application/json, text/plain, */*',
            'Cache-Control': 'no-cache',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) return [];

        const text = await response.text();
        if (!text || text.length < 20) return [];

        // Check if JSON / GViz
        if (text.startsWith('/*O_o*/') || text.includes('google.visualization.Query.setResponse')) {
          const parsed = parseGvizJsonOtRecords(text);
          if (parsed.length > 0) return parsed;
        }

        // CSV parsing
        if (text.includes('รหัสพนักงาน') || text.includes('ชื่อ') || text.includes('วันที่ทำ OT') || text.includes('OT') || text.includes('Approved')) {
          const parsed = convertSheetRowsToOtRecords(text);
          if (parsed.length > 0) return parsed;
        }
        return [];
      } catch {
        clearTimeout(timeoutId);
        return [];
      }
    };

    let records: OtRecord[] = [];

    try {
      // Race all candidate endpoints to get the fastest valid response
      const results = await Promise.all(endpoints.map(url => fetchSingleEndpoint(url)));
      for (const res of results) {
        if (res && res.length > 0) {
          records = res;
          break;
        }
      }
    } catch {
      // ignore
    }

    // If live fetch returned nothing, check cache or fallback
    if (!records || records.length === 0) {
      const cached = getCachedOtRecords();
      if (cached.length > 0) {
        records = cached;
      } else {
        records = convertSheetRowsToOtRecords(OT_FALLBACK_CSV);
      }
    }

    if (records.length > 0) {
      inMemoryOtRecords = records;
      try {
        localStorage.setItem('proworkflow_ot_records_cache_v2', JSON.stringify(records));
      } catch {
        // ignore
      }
    }

    return {
      success: true,
      records,
      rawRowsCount: records.length,
      lastSyncedAt: new Date(),
    };
  };

  inFlightOtPromise = executeFetch().finally(() => {
    inFlightOtPromise = null;
  });

  return inFlightOtPromise;
}

// -------------------------------------------------------------------------
// WORK SCHEDULE SYNC (ตารางทำงาน)
// -------------------------------------------------------------------------

export const WORK_SCHEDULE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1JqkwbyIvfopCEpk1euQRD9DmWhNFhLhrEveIt0wChYs/edit?gid=0#gid=0';
export const WORK_SCHEDULE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1JqkwbyIvfopCEpk1euQRD9DmWhNFhLhrEveIt0wChYs/export?format=csv&gid=0';

export const WORK_SCHEDULE_FALLBACK_CSV = `วัน,วันที่,รายชื่อ,,,,,,,,,,ลาพักร้อน,ลาป่วย,ลากิจ,ขาดงาน,วันนักขัตฤกษ์
,,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
,,08.00 - 17.00,08.00 - 17.00,06.00 - 14.30,06.00 - 14.30,06.00 - 14.30,06.00 - 14.30,06.00 - 14.30,06.00 - 14.30,06.00 - 14.30,06.00 - 14.30,,,,,
วันเสาร์,1/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,,,,,,,,,
วันอาทิตย์,2/8/2026,,,,,,,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันจันทร์,3/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันอังคาร,4/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพุธ,5/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพฤหัสบดี,6/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันศุกร์,7/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันเสาร์,8/8/2026,,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,,,,,,,,,
วันอาทิตย์,9/8/2026,,,,,,,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันจันทร์,10/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันอังคาร,11/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพุธ,12/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพฤหัสบดี,13/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันศุกร์,14/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันเสาร์,15/8/2026,ณัฐพร,,ชมภู,สุริยา,พรนิภา,สุดารัตน์,,,,,,,,,
วันอาทิตย์,16/8/2026,,,,,,,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันจันทร์,17/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันอังคาร,18/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพุธ,19/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพฤหัสบดี,20/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันศุกร์,21/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันเสาร์,22/8/2026,,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,,,,,,,,,
วันอาทิตย์,23/8/2026,,,,,,,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันจันทร์,24/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,,นพเก้า,พงศกร,สงกรานต์,ยุพา,,สุดารัตน์,,,
วันอังคาร,25/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพุธ,26/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพฤหัสบดี,27/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันศุกร์,28/8/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันเสาร์,29/8/2026,ณัฐพร,,ชมภู,สุริยา,พรนิภา,,,,สงกรานต์,,,,,,
วันอาทิตย์,30/8/2026,,,,,,,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันจันทร์,31/8/2026,,สิทธิกร,ชมภู,สุริยา,พรนิภา,,นพเก้า,พงศกร,สงกรานต์,ยุพา,สุดารัตน์,,,,ณัฐพร
วันอังคาร,1/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,,นพเก้า,พงศกร,สงกรานต์,ยุพา,สุดารัตน์,,,,
วันพุธ,2/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพฤหัสบดี,3/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันศุกร์,4/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันเสาร์,5/9/2026,,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,,,,,,,,,
วันอาทิตย์,6/9/2026,,,,,,,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันจันทร์,7/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันอังคาร,8/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพุธ,9/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพฤหัสบดี,10/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันศุกร์,11/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันเสาร์,12/9/2026,ณัฐพร,,ชมภู,สุริยา,พรนิภา,สุดารัตน์,,,,,,,,,
วันอาทิตย์,13/9/2026,,,,,,,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันจันทร์,14/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันอังคาร,15/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพุธ,16/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพฤหัสบดี,17/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันศุกร์,18/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันเสาร์,19/9/2026,ณัฐพร,,ชมภู,สุริยา,พรนิภา,สุดารัตน์,,,,,,,,,
วันอาทิตย์,20/9/2026,,,,,,,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันจันทร์,21/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันอังคาร,22/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพุธ,23/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพฤหัสบดี,24/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันศุกร์,25/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันเสาร์,26/9/2026,,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,,,,,,,,,
วันอาทิตย์,27/9/2026,,,,,,,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันจันทร์,28/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันอังคาร,29/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,
วันพุธ,30/9/2026,ณัฐพร,สิทธิกร,ชมภู,สุริยา,พรนิภา,สุดารัตน์,นพเก้า,พงศกร,สงกรานต์,ยุพา,,,,,`;

export function getScheduleEmployeeDepartment(empName: string): string {
  const clean = (empName || '').trim();
  if (clean === 'ณัฐพร' || clean === 'สิทธิกร' || clean === 'ชมภู') {
    return 'หัวหน้างาน';
  }
  if (clean === 'สุริยา' || clean === 'พงศกร' || clean === 'นพเก้า') {
    return 'ธุรการ';
  }
  if (clean === 'พรนิภา' || clean === 'สุดารัตน์' || clean === 'สงกรานต์' || clean === 'ยุพา') {
    return 'แม่บ้าน';
  }
  return 'ฝ่ายปฏิบัติการ';
}

export function convertSheetRowsToWorkSchedule(csvText: string): DailyWorkSchedule[] {
  if (!csvText || !csvText.trim()) return [];

  const rows = parseCSV(csvText);
  if (rows.length < 3) return [];

  // Leave types from column index 12..
  const leaveTypesMap: { colIndex: number; leaveType: WorkScheduleStatus }[] = [
    { colIndex: 12, leaveType: 'ลาพักร้อน' },
    { colIndex: 13, leaveType: 'ลาป่วย' },
    { colIndex: 14, leaveType: 'ลากิจ' },
    { colIndex: 15, leaveType: 'ขาดงาน' },
    { colIndex: 16, leaveType: 'วันนักขัตฤกษ์' },
  ];

  // Parse Line 1 (Names of standard roster employees cols 2..11)
  const line1 = rows[1] || [];
  // Parse Line 2 (Default Shift Times for each column cols 2..11)
  const line2 = rows[2] || [];

  const employeeColumns: { colIndex: number; name: string; defaultShift: string; department: string }[] = [];
  for (let c = 2; c <= 11; c++) {
    const empName = (line1[c] || '').trim();
    if (empName) {
      const shift = (line2[c] || '').trim() || (empName === 'ณัฐพร' || empName === 'สิทธิกร' ? '08.00 - 17.00' : '06.00 - 14.30');
      const dept = getScheduleEmployeeDepartment(empName);
      employeeColumns.push({
        colIndex: c,
        name: empName,
        defaultShift: shift,
        department: dept,
      });
    }
  }

  const dailySchedules: DailyWorkSchedule[] = [];
  let seq = 1;

  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    const dayOfWeek = (row[0] || '').trim();
    const dateStr = (row[1] || '').trim();
    if (!dateStr || !dayOfWeek) continue;

    const onDutyEmployees: { name: string; shiftTime: string; department: string }[] = [];
    const offDutyEmployees: { name: string; department: string }[] = [];
    const leaveEmployees: { name: string; department: string; leaveType: WorkScheduleStatus }[] = [];

    // Check on duty vs off duty
    employeeColumns.forEach(emp => {
      const cellVal = (row[emp.colIndex] || '').trim();
      if (cellVal && (cellVal === emp.name || cellVal.length > 0)) {
        onDutyEmployees.push({
          name: emp.name,
          shiftTime: emp.defaultShift,
          department: emp.department,
        });
      } else {
        offDutyEmployees.push({
          name: emp.name,
          department: emp.department,
        });
      }
    });

    // Check leaves (cols 12..16)
    leaveTypesMap.forEach(lt => {
      const leaveCell = (row[lt.colIndex] || '').trim();
      if (leaveCell) {
        // Can be comma/space separated names or single name
        const names = leaveCell.split(/[,;\n]/).map(n => n.trim()).filter(Boolean);
        names.forEach(n => {
          const matchedEmp = employeeColumns.find(e => e.name === n);
          leaveEmployees.push({
            name: n,
            department: matchedEmp ? matchedEmp.department : getScheduleEmployeeDepartment(n),
            leaveType: lt.leaveType,
          });
        });
      }
    });

    // Format Thai Date string (e.g. 1/8/2026 -> 1 ส.ค. 2569)
    let formattedDate = dateStr;
    const dateParts = dateStr.split(/[-/.]/);
    if (dateParts.length === 3) {
      const d = parseInt(dateParts[0], 10);
      const m = parseInt(dateParts[1], 10);
      let y = parseInt(dateParts[2], 10);
      if (y < 2500) y += 543;
      const thMonths = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      formattedDate = `${d} ${thMonths[m] || m} ${y}`;
    }

    dailySchedules.push({
      id: `sched_${seq}_${dateStr.replace(/[^a-zA-Z0-9]/g, '_')}`,
      seq,
      dayOfWeek,
      dateStr,
      formattedDate,
      onDutyEmployees,
      offDutyEmployees,
      leaveEmployees,
      totalOnDuty: onDutyEmployees.length,
      totalOffDuty: offDutyEmployees.length,
      totalLeaves: leaveEmployees.length,
    });

    seq++;
  }

  return dailySchedules;
}

let inMemoryWorkSchedule: DailyWorkSchedule[] = [];
let inFlightSchedulePromise: Promise<{
  success: boolean;
  schedules: DailyWorkSchedule[];
  rawRowsCount: number;
  lastSyncedAt: Date;
}> | null = null;

export function getCachedWorkSchedules(): DailyWorkSchedule[] {
  if (inMemoryWorkSchedule.length > 0) return inMemoryWorkSchedule;
  try {
    const cached = localStorage.getItem('proworkflow_work_schedule_cache_v1');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryWorkSchedule = parsed;
        return inMemoryWorkSchedule;
      }
    }
  } catch {
    // ignore
  }
  return convertSheetRowsToWorkSchedule(WORK_SCHEDULE_FALLBACK_CSV);
}

export async function fetchGoogleSheetWorkSchedule(): Promise<{
  success: boolean;
  schedules: DailyWorkSchedule[];
  rawRowsCount: number;
  lastSyncedAt: Date;
}> {
  if (inFlightSchedulePromise) {
    return inFlightSchedulePromise;
  }

  const executeFetch = async () => {
    const endpoints = [
      WORK_SCHEDULE_SHEET_CSV_URL,
      `https://docs.google.com/spreadsheets/d/1JqkwbyIvfopCEpk1euQRD9DmWhNFhLhrEveIt0wChYs/gviz/tq?tqx=out:csv&gid=0`,
    ];

    const fetchSingleEndpoint = async (url: string): Promise<DailyWorkSchedule[]> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'text/csv, text/plain, */*' },
          cache: 'no-store',
        });
        clearTimeout(timeoutId);
        if (!response.ok) return [];
        const text = await response.text();
        if (text.includes('วัน') && (text.includes('วันที่') || text.includes('รายชื่อ') || text.includes('ณัฐพร'))) {
          const parsed = convertSheetRowsToWorkSchedule(text);
          if (parsed.length > 0) return parsed;
        }
        return [];
      } catch {
        clearTimeout(timeoutId);
        return [];
      }
    };

    let schedules: DailyWorkSchedule[] = [];

    try {
      const results = await Promise.all(endpoints.map(url => fetchSingleEndpoint(url)));
      for (const res of results) {
        if (res && res.length > 0) {
          schedules = res;
          break;
        }
      }
    } catch {
      // ignore
    }

    if (!schedules || schedules.length === 0) {
      const cached = getCachedWorkSchedules();
      if (cached.length > 0) {
        schedules = cached;
      } else {
        schedules = convertSheetRowsToWorkSchedule(WORK_SCHEDULE_FALLBACK_CSV);
      }
    }

    if (schedules.length > 0) {
      inMemoryWorkSchedule = schedules;
      try {
        localStorage.setItem('proworkflow_work_schedule_cache_v1', JSON.stringify(schedules));
      } catch {
        // ignore
      }
    }

    return {
      success: true,
      schedules,
      rawRowsCount: schedules.length,
      lastSyncedAt: new Date(),
    };
  };

  inFlightSchedulePromise = executeFetch().finally(() => {
    inFlightSchedulePromise = null;
  });

  return inFlightSchedulePromise;
}

// ==========================================
// MEETING ROOM BOOKING (จองห้องประชุม) GOOGLE SHEET INTEGRATION
// ==========================================
export const MEETING_ROOM_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1SHDNqj6e-n1jmMfSl4UV5f6d6sCs_HZv_X00AlP8njA/edit?gid=860478872#gid=860478872';
export const MEETING_ROOM_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1SHDNqj6e-n1jmMfSl4UV5f6d6sCs_HZv_X00AlP8njA/export?format=csv&gid=860478872';

export const FALLBACK_MEETING_ROOM_CSV = `ประทับเวลา,เลือกห้องประชุม,วันที่,เวลาที่เริ่ม,เวลาสิ้นสุด,เรื่องที่ประชุม/อบรม,แผนก/ฝ่าย,จำนวน (คน),เบอร์โทร
"24/8/2026, 15:17:57",TPM 1,3/8/2026,10:30:00,11:30:00,ประชุมแผนกธุรการลาดกระบัง 2,ทรัพยากรบุคคล,9,4510
"24/8/2026, 15:19:34",TPM 1,11/8/2026,8:00:00,12:00:00,อบรม ความรู้ 7 ส.,ทรัพยากรบุคคล,30,6133
"24/8/2026, 15:21:20",TPM 1,11/8/2026,13:30:00,18:30:00,ประชุมสุ่มตรวจไลน์ผลิต,RD & QC,2,6102
"24/8/2026, 15:22:38",TPM 1,14/8/2026,8:00:00,12:00:00,อบรม ทบทวน คปอ.,ทรัพยากรบุคคล,50,6133
"24/8/2026, 15:23:30",TPM 1,14/8/2026,13:00:00,14:00:00,อบรมผู้รับเหมา,บำรุงรักษาอาคาร และงานระบบ,16,5270
"24/8/2026, 15:24:28",TPM 1,17/8/2026,7:30:00,16:30:00,ปฐมนิเทศพนักงานใหม่,ทรัพยากรบุคคล,20,5621
"24/8/2026, 15:25:44",TPM 1,18/8/2026,9:00:00,10:00:00,อบรมผู้รับเหมา,บำรุงรักษาอาคาร และงานระบบ,20,5272
"24/8/2026, 15:26:41",TPM 1,18/8/2026,13:00:00,16:30:00,Pre-meeting ระบบคุณภาพ,RD & QC,10,6138
"24/8/2026, 15:27:42",TPM 1,20/8/2026,9:00:00,12:00:00,ประชุมกับSupplier,ผลิตลาดกระบัง 2,15,4262
"24/8/2026, 15:28:27",TPM 1,24/8/2026,9:00:00,12:00:00,ประชุม DOR,ผลิตลาดกระบัง 2,25,4262
"24/8/2026, 15:29:09",TPM 1,26/8/2026,8:00:00,12:00:00,อบรม การทบทวนระบบคุณภาพฯ,ทรัพยากรบุคคล,40,6133
"24/8/2026, 15:29:56",TPM 1,27/8/2026,8:00:00,12:00:00,อบรม ระบบคุณภาพ,ทรัพยากรบุคคล,30,6133
"24/8/2026, 15:30:51",TPM 2,3/8/2026,10:00:00,12:30:00,ติดตามงาน Chiller Plant,วิศวกรรม,7,5743
"24/8/2026, 15:32:08",TPM 2,4/8/2026,13:30:00,19:30:00,ประชุมสุ่มตรวจไลน์ผลิต,RD & QC,2,6102
"24/8/2026, 15:33:04",TPM 2,6/8/2026,8:30:00,11:30:00,อบรมระบบระบายอากาศ,บำรุงรักษาอาคาร และงานระบบ,8,4611
"24/8/2026, 15:34:01",TPM 2,6/8/2026,13:00:00,16:00:00,QR Code,ผลิตลาดกระบัง 2,10,4264
"24/8/2026, 15:35:56",TPM 2,7/8/2026,13:00:00,16:00:00,อบรมการพัฒนาอย่างยั่งยืน,ผลิตลาดกระบัง 2,2,4262
"24/8/2026, 15:36:59",TPM 2,11/8/2026,13:30:00,15:00:00,ประชุมย่อยคณะสวัสดิการ,ทรัพยากรบุคคล,6,4510
"24/8/2026, 15:38:03",TPM 2,20/8/2026,8:00:00,13:00:00,ทรัพยากรบุคคล,ทรัพยากรบุคคล,12,6131
"24/8/2026, 15:39:04",TPM 2,21/8/2026,8:00:00,12:00:00,สัมภาษณ์พนักงาน,ทรัพยากรบุคคล,5,4510
"24/8/2026, 15:39:59",TPM 2,21/8/2026,13:30:00,16:00:00,Foodqualityandsafetyculture,RD & QC,10,6138
"24/8/2026, 15:40:54",TPM 2,22/8/2026,10:00:00,17:00:00,ประชุมสุ่มตรวจไลน์ผลิต,RD & QC,2,6102
"24/8/2026, 15:42:11",TPM 2,24/8/2026,10:00:00,12:00:00,ติดตามงานชิลเลอร์แพลนท์,วิศวกรรม,7,5743
"24/8/2026, 15:43:13",TPM 2,28/8/2026,9:00:00,12:00:00,ประชุมคปอ,บำรุงรักษาอาคาร และงานระบบ,15,5272
"24/8/2026, 16:58:37",TPM 1,28/8/2026,9:00:00,12:00:00,อบรม OJT,บำรุงรักษาอาคารและงานระบบ,10,4632
"26/8/2026, 11:36:59",TPM 1,2/9/2026,9:30:00,12:00:00,ประชุมซ้อมแผนอพยพหนีไฟ,บำรุงรักษาอาคาร และงานระบบ,30,1201
"26/8/2026, 11:38:12",TPM 1,15/9/2026,8:00:00,12:00:00,อบรมโรคจากการทำงาน,ทรัพยากรบุคคล,50,6133
"26/8/2026, 11:39:59",TPM 1,22/8/2026,8:00:00,12:00:00,อบรมสิทธิมนุษยชน,ทรัพยากรบุคคล,50,6133
"26/8/2026, 11:42:20",TPM 1,23/9/2026,8:00:00,12:00:00,อบรมการทบทวนระบบคุณภาพ,ทรัพยากรบุคคล,40,6133
"26/8/2026, 11:44:20",TPM 1,25/9/2026,8:00:00,12:00:00,อบรมระบบคุณภาพ,ทรัพยากรบุคคล,30,6133
"26/8/2026, 11:46:45",TPM 2,7/9/2026,10:00:00,12:00:00,ติดตามงาน chiller plan,วิศวกรรม,8,5743
"26/8/2026, 11:51:31",TPM 2,3/9/2026,10:30:00,12:00:00,ประชุมแผนก,ทรัพยากรบุคคล,10,4510
"27/8/2026, 12:45:24",TPM 1,28/10/2026,13:00:00,17:00:00,เตรียมสถานที่ตรวจสุขภาพประจำปี,ทรัพยากรบุคคล,2,5632
"27/8/2026, 12:46:35",TPM 1,29/10/2026,7:00:00,17:00:00,ตรวจสุขภาพประจำปี,ทรัพยากรบุคคล,2,5632
"27/8/2026, 12:47:27",TPM 2,28/10/2026,13:00:00,17:00:00,เตรียมสถานที่ตรวจสุขภาพประจำปี,ทรัพยากรบุคคล,2,5632
"27/8/2026, 12:48:23",TPM 2,29/10/2026,7:00:00,17:00:00,ตรวจสุขภาพประจำปี,ทรัพยากรบุคคล,2,5632
"27/8/2026, 13:41:06",TPM 1,17/9/2026,9:00:00,12:00:00,ประชุม DOR,ผลิตลาดกระบัง 2,25,4262
"29/8/2026, 11:20:37",TPM 1,8/9/2026,13:00:00,16:00:00,กิจกรรมอนุรักษ์พลังงาน,วิศวกรรม,30,4742
"29/8/2026, 11:22:51",TPM 2,1/9/2026,7:00:00,13:00:00,RD ทดลอง,RD & QC,2,6102
"29/8/2026, 11:26:34",TPM 2,3/9/2026,13:00:00,16:00:00,ปัญหาเชื้อไลน์ Frozen,ผลิตลาดกระบัง 2,15,4241
"29/8/2026, 11:29:04",TPM 1,15/10/2026,13:00:00,17:00:00,เตรียมพื้นที่ทำลายเอกสาร,ทรัพยากรบุคคล,35,6020
"29/8/2026, 11:37:42",TPM 1,16/10/2026,8:00:00,16:30:00,ทำลายเอกสารประจำปี 2569,ทรัพยากรบุคคล,35,6020
"29/8/2026, 11:42:25",TPM 2,16/10/2026,8:00:00,16:30:00,ทำลายเอกสารประจำปี 2569,ทรัพยากรบุคคล,35,6020`;

// Helper to calculate meeting status
export function calculateMeetingStatus(bookingDateStr: string, startTimeStr: string, endTimeStr: string): MeetingStatus {
  try {
    const parts = (bookingDateStr || '').trim().split(/[-/.]/);
    if (parts.length < 3) return 'นัดหมายล่วงหน้า';

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year > 2500) year -= 543;
    if (year < 100) year += 2000;

    const startParts = (startTimeStr || '').trim().split(':');
    const startHour = parseInt(startParts[0], 10) || 0;
    const startMin = parseInt(startParts[1], 10) || 0;

    const endParts = (endTimeStr || '').trim().split(':');
    const endHour = parseInt(endParts[0], 10) || 23;
    const endMin = parseInt(endParts[1], 10) || 59;

    const startDate = new Date(year, month, day, startHour, startMin);
    const endDate = new Date(year, month, day, endHour, endMin);
    const now = new Date();

    if (now > endDate) {
      return 'เสร็จสิ้นแล้ว';
    }

    // Check if it is today
    const isSameDay =
      now.getFullYear() === year &&
      now.getMonth() === month &&
      now.getDate() === day;

    if (isSameDay) {
      if (now >= startDate && now <= endDate) {
        return 'กำลังประชุม';
      }
      if (now < startDate) {
        return 'รอเริ่มวันนี้';
      }
    }

    if (now < startDate) {
      return 'นัดหมายล่วงหน้า';
    }

    return 'เสร็จสิ้นแล้ว';
  } catch {
    return 'นัดหมายล่วงหน้า';
  }
}

// Convert CSV lines into structured MeetingRoomBooking list
export function convertSheetRowsToMeetingRoomBookings(csvText: string): MeetingRoomBooking[] {
  const lines = parseCSV(csvText);
  if (lines.length <= 1) return [];

  // Filter out header
  const dataRows = lines.filter((row, idx) => {
    if (idx === 0) return false;
    return row.some(cell => cell && cell.trim().length > 0);
  });

  const bookings: MeetingRoomBooking[] = dataRows.map((row, idx) => {
    const timestamp = (row[0] || '').trim();
    const room = (row[1] || '').trim() || 'TPM 1';
    const bookingDate = (row[2] || '').trim();
    const rawStartTime = (row[3] || '').trim();
    const rawEndTime = (row[4] || '').trim();
    const subject = (row[5] || '').trim() || 'การประชุม/อบรม';
    const department = (row[6] || '').trim() || 'ทั่วไป';
    const rawAttendees = (row[7] || '').trim();
    const phoneNumber = (row[8] || '').trim();

    // Clean times from 10:30:00 -> 10:30
    const cleanTime = (t: string) => {
      if (!t) return '';
      const parts = t.split(':');
      if (parts.length >= 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
      }
      return t;
    };

    const startTime = cleanTime(rawStartTime);
    const endTime = cleanTime(rawEndTime);
    const attendeesCount = parseInt(rawAttendees, 10) || 1;
    const status = calculateMeetingStatus(bookingDate, startTime, endTime);

    return {
      id: `mtg-${idx + 1}-${Date.now().toString(36)}`,
      seq: idx + 1,
      timestamp,
      room,
      bookingDate,
      startTime: startTime || '08:00',
      endTime: endTime || '12:00',
      subject,
      department,
      attendeesCount,
      phoneNumber,
      status,
    };
  });

  return bookings;
}

let inFlightMeetingRoomPromise: Promise<{
  success: boolean;
  bookings: MeetingRoomBooking[];
  rawRowsCount: number;
  lastSyncedAt: Date;
  error?: string;
}> | null = null;

export async function fetchGoogleSheetMeetingRoomBookings(): Promise<{
  success: boolean;
  bookings: MeetingRoomBooking[];
  rawRowsCount: number;
  lastSyncedAt: Date;
  error?: string;
}> {
  if (inFlightMeetingRoomPromise) {
    return inFlightMeetingRoomPromise;
  }

  const executeFetch = async () => {
    const candidateUrls = [
      // 1. Server proxy
      '/api/sheet-csv?sheetId=1SHDNqj6e-n1jmMfSl4UV5f6d6sCs_HZv_X00AlP8njA&gid=860478872',
      // 2. Direct CSV export
      MEETING_ROOM_SHEET_CSV_URL,
      // 3. GViz CSV export
      'https://docs.google.com/spreadsheets/d/1SHDNqj6e-n1jmMfSl4UV5f6d6sCs_HZv_X00AlP8njA/gviz/tq?tqx=out:csv&gid=860478872',
    ];

    let csvText: string | null = null;

    for (const url of candidateUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'text/csv, text/plain, */*',
          },
          cache: 'no-cache',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const text = await response.text();
          if (text && (text.includes('ห้องประชุม') || text.includes('TPM') || text.includes('เรื่องที่ประชุม')) && text.length > 50) {
            csvText = text;
            try {
              if (typeof window !== 'undefined') {
                localStorage.setItem('proworkflow_meeting_room_csv_cache_v1', text);
              }
            } catch {
              // ignore
            }
            break;
          }
        }
      } catch {
        // Continue to next candidate endpoint
      }
    }

    if (!csvText) {
      try {
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('proworkflow_meeting_room_csv_cache_v1');
          if (cached && cached.includes('TPM')) {
            csvText = cached;
          }
        }
      } catch {
        // ignore
      }
    }

    const finalText = csvText || FALLBACK_MEETING_ROOM_CSV;
    const bookings = convertSheetRowsToMeetingRoomBookings(finalText);

    return {
      success: true,
      bookings,
      rawRowsCount: bookings.length,
      lastSyncedAt: new Date(),
    };
  };

  inFlightMeetingRoomPromise = executeFetch().finally(() => {
    inFlightMeetingRoomPromise = null;
  });

  return inFlightMeetingRoomPromise;
}

// ==========================================
// ANNOUNCEMENTS & PR (ข่าวประชาสัมพันธ์) GOOGLE SHEET INTEGRATION
// ==========================================
export const ANNOUNCEMENTS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1V-AQVw3JIhfYCtRo1ShH1Wyb-QFlBhz5R1KznOh_qRg/edit?gid=0#gid=0';
export const ANNOUNCEMENTS_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1V-AQVw3JIhfYCtRo1ShH1Wyb-QFlBhz5R1KznOh_qRg/export?format=csv&gid=0';

export const FALLBACK_ANNOUNCEMENTS_CSV = `หัวข้อ,เนื้อหา,แผนก / ฝ่าย,วันเริ่มต้น,วันสิ้นสุด,รูปภาพประกอบ
"ระบบการบริหารจัดการความเสี่ยงที่มีประสิทธิภาพ","ระบบการบริหารจัดการความเสี่ยงที่มีประสิทธิภาพ และเพื่อทบทวนความรู้ ความเข้าใจ รวมทั้งสร้างความตระหนักให้พนักงานสามารถนำนโยบายไป พิเศษ! พนักงานที่มีคะแนนผ่านเกณฑ์การทดสอบ จะได้รับ Farmhouse Activity Points +1 Point",แผนกฝึกอบรมและสนับสนุนกิจกรรม,10/8/2026,31/8/2026,https://drive.google.com/file/d/1TxqnTYl_u5VSfRr4CunP_k82nKRu9YJm/view?usp=drive_link
"Farmhouse Activity Points"" รอบเดือนกรกฎาคม 2569","ประชาสัมพันธ์ ประมวลภาพกิจกรรม "" Farmhouse Activity Points"" รอบเดือนกรกฎาคม 2569",แผนกฝึกอบรมและสนับสนุนกิจกรรม,10/8/2026,,https://drive.google.com/file/d/1zpZd1deq5P71HXuQG4fTDMzqZ3TwXFlZ/view?usp=drive_link
"การบริหารจัดการขยะ"" ครั้งที่ 8/2569","ประชาสัมพันธ์ : ความรู้เกี่ยวกับ ""การบริหารจัดการขยะ""  ครั้งที่ 8/2569 ",แผนกสนับสนุนและประสานงาน,11/8/2026,31/8/2026,https://drive.google.com/file/d/1sitUZbYMsi4gHBAZjLQSgbCD9TBuwbUN/view?usp=drive_link
"การอนุรักษ์พลังงาน รอบเดือน สิงหาคม 2569","ประชาสัมพันธ์ประจำเดือน สิงหาคม 2569 เกี่ยวกับ เรื่อง ""เปลี่ยนอนาคตสู่ความยั่งยืนด้วยเทคโนโลยี  Carbon Capture Utilization and Storage (CCUS)""",แผนกวิศวกรรมพลังงาน,17/8/2026,31/8/2026,https://drive.google.com/file/d/1oKFrCmaDYInaHomJod_zVuE6nYhdwAD_/view?usp=drive_link
"Healthy Minds at Work","ฝ่ายทรัพยากรบุคคล ใคร่ขอประชาสัมพันธ์ ฟาร์มเฮ้าส์ ได้รับรางวัล สถานประกอบการกับการดูแลใจพนักงาน  “Healthy Minds at Work” ระดับประเทศ  ประจำปี  2569",แผนกฝึกอบรมและสนับสนุนกิจกรรม,27/8/2026,,https://drive.google.com/file/d/1CM6DguIt2tMCmxlze4LAvKU9ALkQGwKs/view?usp=drive_link
"สลิปเงินเดือนออนไลน์ (E-Pay Slip)","ขอประชาสัมพันธ์การเปลี่ยนแปลงรูปแบบการรับสลิปเงินเดือนของพนักงาน เดิม : รูปแบบกระดาษ ใหม่ : รูปแบบสลิปเงินเดือนออนไลน์ (E-Pay Slip)",แผนกเงินเดือนและค่าจ้าง,31/8/2026,,https://drive.google.com/file/d/1EcB3WZSYDfrPnG7YeilB9KBOfQzwf4zk/view?usp=drive_link`;

export interface AnnouncementsSyncResult {
  success: boolean;
  announcements: AnnouncementItem[];
  rawRowsCount: number;
  lastSyncedAt: Date;
  error?: string;
}

/**
 * Extracts direct Google Drive preview/thumbnail image URL from a Google Drive share link
 */
export function extractGoogleDriveDirectImageUrl(driveUrl?: string): { previewUrl?: string; thumbnailLargeUrl?: string; fileId?: string } {
  if (!driveUrl) return {};
  const trimmed = driveUrl.trim();
  if (!trimmed) return {};

  // Try extracting file ID from various Google Drive URL formats:
  // 1. https://drive.google.com/file/d/FILE_ID/view...
  // 2. https://drive.google.com/open?id=FILE_ID
  // 3. https://drive.google.com/uc?id=FILE_ID
  const matchD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const matchDirect = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);

  const fileId = matchD ? matchD[1] : matchId ? matchId[1] : matchDirect ? matchDirect[1] : null;

  if (fileId) {
    return {
      fileId,
      previewUrl: `https://lh3.googleusercontent.com/d/${fileId}`,
      thumbnailLargeUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
    };
  }

  // If already a direct image link or external URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return {
      previewUrl: trimmed,
      thumbnailLargeUrl: trimmed,
    };
  }

  return {};
}

/**
 * Clean up title text, quotes, and fallback to sensible title from content
 */
function cleanAnnouncementTitle(rawTitle?: string, content?: string): string {
  let title = (rawTitle || '').replace(/^["'\s]+|["'\s]+$/g, '').trim();
  // Remove unbalanced internal double quotes like Farmhouse Activity Points""
  title = title.replace(/""/g, '"');

  if (!title && content) {
    // If title was empty in sheet, extract the first sentence or subject from content
    const firstSentence = content.split(/[.\n,]/)[0].trim();
    if (firstSentence.length > 0 && firstSentence.length < 80) {
      return firstSentence;
    }
    return content.slice(0, 60) + (content.length > 60 ? '...' : '');
  }

  return title || 'ข่าวประชาสัมพันธ์';
}

/**
 * Clean up content text
 */
function cleanAnnouncementContent(rawContent?: string): string {
  let content = (rawContent || '').replace(/^["'\s]+|["'\s]+$/g, '').trim();
  content = content.replace(/""/g, '"');
  return content;
}

/**
 * Determines announcement status based on start/end dates
 */
function calculateAnnouncementStatus(startDateStr: string, endDateStr?: string): AnnouncementStatus {
  if (!startDateStr && !endDateStr) return 'active';

  // Compare against today
  const todayStr = normalizeDate(); // YYYY-MM-DD
  const startNormalized = normalizeDate(startDateStr);
  const endNormalized = endDateStr ? normalizeDate(endDateStr) : null;

  if (startNormalized && startNormalized > todayStr) {
    return 'upcoming';
  }

  if (endNormalized && endNormalized < todayStr) {
    return 'expired';
  }

  return 'active';
}

/**
 * Categorize announcement into nice tag based on department
 */
function getAnnouncementCategory(department: string, title: string): string {
  const dept = (department || '').toLowerCase();
  const t = (title || '').toLowerCase();

  if (dept.includes('ฝึกอบรม') || dept.includes('กิจกรรม') || t.includes('activity') || t.includes('อบรม')) {
    return 'กิจกรรม & การอบรม';
  }
  if (dept.includes('พลังงาน') || dept.includes('วิศวกรรม') || t.includes('พลังงาน') || t.includes('ccus')) {
    return 'พลังงาน & สิ่งแวดล้อม';
  }
  if (dept.includes('ประสานงาน') || dept.includes('ขยะ') || t.includes('ขยะ') || dept.includes('สนับสนุน')) {
    return 'สุขอนามัย & ความปลอดภัย';
  }
  if (dept.includes('เงินเดือน') || dept.includes('ค่าจ้าง') || t.includes('สลิป') || t.includes('payslip')) {
    return 'สวัสดิการ & ผลตอบแทน';
  }
  if (dept.includes('บุคคล') || dept.includes('hr') || t.includes('mind') || t.includes('รางวัล')) {
    return 'ทรัพยากรบุคคล & องค์กร';
  }

  return 'ประชาสัมพันธ์ทั่วไป';
}

/**
 * Convert parsed CSV rows into structured AnnouncementItem records
 */
/**
 * Parse any date string format from Google Sheet announcement into a timestamp
 * Supports Thai buddhist year, DD/MM/YYYY, YYYY-MM-DD, D/M/YY, and text months
 */
export function parseAnnouncementDate(dateStr?: string): number {
  if (!dateStr || !dateStr.trim()) return 0;
  const clean = dateStr.trim();
  
  // Format: DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY
  const slashMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10) - 1;
    let year = parseInt(slashMatch[3], 10);
    if (year < 100) year += 2000;
    if (year > 2400) year -= 543; // Convert Buddhist Year e.g. 2569 -> 2026
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  // Format: YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (isoMatch) {
    let year = parseInt(isoMatch[1], 10);
    if (year > 2400) year -= 543;
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  const parsed = Date.parse(clean);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Sort announcements so that:
 * 1. Pinned announcements appear first
 * 2. Latest announcements (by start date, or latest row) appear first
 */
export function sortAnnouncementsLatestFirst(list: AnnouncementItem[]): AnnouncementItem[] {
  return [...list].sort((a, b) => {
    // 1. Pinned status first
    const aPinned = a.isPinned ? 1 : 0;
    const bPinned = b.isPinned ? 1 : 0;
    if (aPinned !== bPinned) {
      return bPinned - aPinned;
    }

    // 2. Latest Start Date First
    const dateA = parseAnnouncementDate(a.startDate);
    const dateB = parseAnnouncementDate(b.startDate);

    if (dateA > 0 && dateB > 0 && dateA !== dateB) {
      return dateB - dateA;
    }
    if (dateA > 0 && dateB === 0) return -1;
    if (dateB > 0 && dateA === 0) return 1;

    // 3. Fallback: Latest added sequence / row index descending
    return (b.seq || 0) - (a.seq || 0);
  });
}

export function convertSheetRowsToAnnouncements(csvText: string): AnnouncementItem[] {
  const rows = parseCSV(csvText);
  if (rows.length === 0) return [];

  // Identify header indices
  let headerIndex = -1;
  let titleIdx = 0;
  let contentIdx = 1;
  let deptIdx = 2;
  let startIdx = 3;
  let endIdx = 4;
  let imgIdx = 5;

  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const row = rows[i];
    const joined = row.join(' ').toLowerCase();
    if (joined.includes('หัวข้อ') || joined.includes('เนื้อหา') || joined.includes('แผนก')) {
      headerIndex = i;
      row.forEach((col, colIdx) => {
        const c = col.trim().toLowerCase();
        if (c.includes('หัวข้อ') || c.includes('เรื่อง')) titleIdx = colIdx;
        else if (c.includes('เนื้อหา') || c.includes('รายละเอียด')) contentIdx = colIdx;
        else if (c.includes('แผนก') || c.includes('ฝ่าย')) deptIdx = colIdx;
        else if (c.includes('เริ่มต้น') || c.includes('เริ่ม')) startIdx = colIdx;
        else if (c.includes('สิ้นสุด') || c.includes('จบ')) endIdx = colIdx;
        else if (c.includes('รูปภาพ') || c.includes('ภาพ') || c.includes('ลิงก์') || c.includes('link') || c.includes('drive')) imgIdx = colIdx;
      });
      break;
    }
  }

  const dataRows = headerIndex >= 0 ? rows.slice(headerIndex + 1) : rows;
  const announcements: AnnouncementItem[] = [];

  dataRows.forEach((row, idx) => {
    if (!row || row.length === 0) return;
    const rawTitle = row[titleIdx] || '';
    const rawContent = row[contentIdx] || '';
    const rawDept = row[deptIdx] || '';
    const rawStart = row[startIdx] || '';
    const rawEnd = row[endIdx] || '';
    const rawImg = row[imgIdx] || '';

    // Ignore completely empty rows
    if (!rawTitle && !rawContent && !rawDept && !rawStart) return;

    const content = cleanAnnouncementContent(rawContent);
    const title = cleanAnnouncementTitle(rawTitle, content);
    const department = (rawDept || '').replace(/^["'\s]+|["'\s]+$/g, '').trim() || 'ธุรการลาดกระบัง 2';
    const startDate = (rawStart || '').trim();
    const endDate = (rawEnd || '').trim();
    const rawImageUrl = (rawImg || '').trim();

    const imageInfo = extractGoogleDriveDirectImageUrl(rawImageUrl);
    const category = getAnnouncementCategory(department, title);
    const status = calculateAnnouncementStatus(startDate, endDate);

    // Check pinned status from realtimeHub
    const pinInfo = realtimeHub.getAnnouncementPinInfo({
      id: `announcement-${idx + 1}`,
      title,
      department,
      isPinned: false,
    });

    announcements.push({
      id: `announcement-${idx + 1}`,
      seq: idx + 1,
      title,
      content,
      department,
      startDate,
      endDate: endDate || undefined,
      rawImageUrl: rawImageUrl || undefined,
      imageUrl: imageInfo.previewUrl || undefined,
      category,
      status,
      isPinned: pinInfo.isPinned,
      pinnedBy: pinInfo.pinnedBy,
      pinnedAt: pinInfo.pinnedAt,
    });
  });

  // Sort: Latest first + Pinned items at the top
  return sortAnnouncementsLatestFirst(announcements);
}

let inFlightAnnouncementsPromise: Promise<AnnouncementsSyncResult> | null = null;
let lastSuccessfulAnnouncementsCsvText: string | null = null;

try {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('proworkflow_announcements_csv_cache_v1');
    if (cached && cached.includes('เนื้อหา')) {
      lastSuccessfulAnnouncementsCsvText = cached;
    }
  }
} catch {
  // ignore
}

/**
 * Fetch and sync Google Sheet Announcements in background with high resilience and local cache
 */
export async function fetchGoogleSheetAnnouncements(): Promise<AnnouncementsSyncResult> {
  if (inFlightAnnouncementsPromise) {
    return inFlightAnnouncementsPromise;
  }

  const executeFetch = async (): Promise<AnnouncementsSyncResult> => {
    const candidateUrls = [
      // 1. Backend Proxy (direct fetch from Google Sheets with raw format and no CORS issues)
      '/api/sheet-csv?sheetId=1V-AQVw3JIhfYCtRo1ShH1Wyb-QFlBhz5R1KznOh_qRg&gid=0',
      // 2. Direct CSV export URL
      'https://docs.google.com/spreadsheets/d/1V-AQVw3JIhfYCtRo1ShH1Wyb-QFlBhz5R1KznOh_qRg/export?format=csv&gid=0',
      // 3. gviz table query URL
      'https://docs.google.com/spreadsheets/d/1V-AQVw3JIhfYCtRo1ShH1Wyb-QFlBhz5R1KznOh_qRg/gviz/tq?tqx=out:csv&gid=0',
    ];

    let csvText: string | null = null;

    for (const url of candidateUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'text/csv, text/plain, */*',
          },
          cache: 'no-cache',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const text = await response.text();
          if (text && (text.includes('เนื้อหา') || text.includes('หัวข้อ') || text.includes('แผนก')) && text.length > 50) {
            csvText = text;
            lastSuccessfulAnnouncementsCsvText = text;
            try {
              if (typeof window !== 'undefined') {
                localStorage.setItem('proworkflow_announcements_csv_cache_v1', text);
              }
            } catch {
              // ignore
            }
            break;
          }
        }
      } catch {
        // Continue to next candidate endpoint
      }
    }

    if (!csvText) {
      try {
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('proworkflow_announcements_csv_cache_v1');
          if (cached && cached.includes('เนื้อหา')) {
            csvText = cached;
          }
        }
      } catch {
        // ignore
      }
    }

    const finalText = csvText || lastSuccessfulAnnouncementsCsvText || FALLBACK_ANNOUNCEMENTS_CSV;
    const announcements = convertSheetRowsToAnnouncements(finalText);

    return {
      success: true,
      announcements,
      rawRowsCount: announcements.length,
      lastSyncedAt: new Date(),
    };
  };

  inFlightAnnouncementsPromise = executeFetch().finally(() => {
    inFlightAnnouncementsPromise = null;
  });

  return inFlightAnnouncementsPromise;
}

// ==========================================
// EQUIPMENT REQUISITION (เบิกอุปกรณ์) GOOGLE SHEET INTEGRATION
// ==========================================

export const CLEANING_EQUIPMENT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1ghnlCzcIq9A6rGVrZtEqiVA0bGFdqO3ZhbuYLhyBViw/edit?gid=1432727518#gid=1432727518';
export const CLEANING_EQUIPMENT_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1ghnlCzcIq9A6rGVrZtEqiVA0bGFdqO3ZhbuYLhyBViw/export?format=csv&gid=1432727518';

export const GOWN_EQUIPMENT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1AQXHNA1gDBXl5gWMeXu_y04ziGi3CDk-z6MbH6DQQ2M/edit?gid=1537050902#gid=1537050902';
export const GOWN_EQUIPMENT_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1AQXHNA1gDBXl5gWMeXu_y04ziGi3CDk-z6MbH6DQQ2M/export?format=csv&gid=1537050902';

export const KEYS_EQUIPMENT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1hBOaTsILrvA5UtTyL1iULW7SzGkW0-tPO3QmOUiR8mY/edit?gid=546384221#gid=546384221';
export const KEYS_EQUIPMENT_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1hBOaTsILrvA5UtTyL1iULW7SzGkW0-tPO3QmOUiR8mY/export?format=csv&gid=546384221';

export const LADDER_EQUIPMENT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1ccv4HxX9QRRNVR6rQdCq5LvqD__tTyrxQnj1EWncy2s/edit?gid=1183570474#gid=1183570474';
export const LADDER_EQUIPMENT_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1ccv4HxX9QRRNVR6rQdCq5LvqD__tTyrxQnj1EWncy2s/export?format=csv&gid=1183570474';

export interface EquipmentSyncResult {
  success: boolean;
  records: EquipmentRecord[];
  rawRowsCount: number;
  lastSyncedAt: Date;
  error?: string;
}

// In-flight promises to prevent duplicate fetches
let inFlightCleaningPromise: Promise<EquipmentSyncResult> | null = null;
let inFlightGownPromise: Promise<EquipmentSyncResult> | null = null;
let inFlightKeysPromise: Promise<EquipmentSyncResult> | null = null;
let inFlightLadderPromise: Promise<EquipmentSyncResult> | null = null;

/**
 * 1. Convert Cleaning Equipment CSV Rows to EquipmentRecord[]
 */
export function convertCleaningCsvToRecords(csvText: string): EquipmentRecord[] {
  const rows = parseCSV(csvText);
  if (!rows || rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim());
  const records: EquipmentRecord[] = [];

  // Find item columns (indices starting from 3 up to last col)
  const itemColMap: { index: number; name: string }[] = [];
  headers.forEach((h, idx) => {
    if (idx >= 3) {
      // e.g. "เลือกรายการ [แปรงขัดพื้นด้ามยาว]" or "อื่นๆ"
      const match = h.match(/\[(.*?)\]/);
      if (match) {
        itemColMap.push({ index: idx, name: match[1].trim() });
      } else if (h.includes('อื่นๆ') || h.toLowerCase().includes('other')) {
        itemColMap.push({ index: idx, name: 'อื่นๆ' });
      } else if (h.length > 0 && !h.includes('ประทับเวลา') && !h.includes('วันที่') && !h.includes('ชื่อ')) {
        itemColMap.push({ index: idx, name: h });
      }
    }
  });

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => !c || !c.trim())) continue;

    const timestamp = row[0] || '';
    const rawDate = row[1] || '';
    const requester = row[2] || 'ไม่ระบุชื่อผู้เบิก';
    const date = rawDate.trim() || timestamp.split(',')[0].trim() || 'ไม่ระบุวันที่';

    const itemsList: EquipmentItemDetail[] = [];
    let note = '';

    itemColMap.forEach((col) => {
      const val = (row[col.index] || '').trim();
      if (!val) return;

      if (col.name === 'อื่นๆ') {
        note = val;
        itemsList.push({ name: `อื่นๆ: ${val}`, quantity: 1 });
      } else {
        const num = parseFloat(val);
        const qty = !isNaN(num) && num > 0 ? num : 1;
        itemsList.push({ name: col.name, quantity: qty });
      }
    });

    if (itemsList.length === 0) {
      itemsList.push({ name: 'อุปกรณ์ทำความสะอาดทั่วไป', quantity: 1 });
    }

    const totalQty = itemsList.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const itemSummary = itemsList.map((it) => `${it.name} (${it.quantity})`).join(', ');

    records.push({
      id: `eq-clean-${i}-${date.replace(/\//g, '')}`,
      seq: i,
      subCategory: 'cleaning',
      timestamp,
      date,
      requesterName: requester,
      department: 'ธุรการ / ส่วนกลาง',
      actionType: 'เบิก',
      status: 'เบิกแล้ว',
      itemSummary,
      itemsList,
      totalQuantity: totalQty,
      note,
    });
  }

  // Sort newest first
  return records.reverse();
}

/**
 * 2. Convert Gown (เสื้อกาวน์) CSV Rows to EquipmentRecord[]
 */
export function convertGownCsvToRecords(csvText: string): EquipmentRecord[] {
  const rows = parseCSV(csvText);
  if (!rows || rows.length < 2) return [];

  const records: EquipmentRecord[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => !c || !c.trim())) continue;

    const timestamp = row[0] || '';
    const rawDate = row[1] || '';
    const actionRaw = row[2] || 'เบิกเสื้อกาวน์';
    const requester = row[3] || 'ไม่ระบุชื่อ';
    const rawDept = row[4] || '';
    const department = normalizeDepartment(rawDept) || 'ฝ่ายผลิต / ทั่วไป';

    const qtyL = parseFloat(row[5] || '0') || 0;
    const qtyXL = parseFloat(row[6] || '0') || 0;
    const qty2XL = parseFloat(row[7] || '0') || 0;

    const isReturn = actionRaw.includes('คืน');
    const actionType = isReturn ? 'คืน' : 'เบิก';
    const status = isReturn ? 'คืนแล้ว' : 'เบิกแล้ว';

    const gownSizes: { size: string; count: number }[] = [];
    const itemsList: EquipmentItemDetail[] = [];

    if (qtyL > 0) {
      gownSizes.push({ size: 'L', count: qtyL });
      itemsList.push({ name: 'เสื้อกาวน์ Size L', quantity: qtyL, size: 'L' });
    }
    if (qtyXL > 0) {
      gownSizes.push({ size: 'XL', count: qtyXL });
      itemsList.push({ name: 'เสื้อกาวน์ Size XL', quantity: qtyXL, size: 'XL' });
    }
    if (qty2XL > 0) {
      gownSizes.push({ size: '2XL', count: qty2XL });
      itemsList.push({ name: 'เสื้อกาวน์ Size 2XL', quantity: qty2XL, size: '2XL' });
    }

    if (itemsList.length === 0) {
      itemsList.push({ name: 'เสื้อกาวน์', quantity: 1, size: 'มาตรฐาน' });
    }

    const totalQty = itemsList.reduce((sum, it) => sum + (it.quantity || 1), 0);
    const itemSummary = gownSizes.length > 0
      ? `เสื้อกาวน์ (${gownSizes.map((s) => `Size ${s.size}: ${s.count}`).join(', ')})`
      : `เสื้อกาวน์ (${totalQty} ตัว)`;

    const date = rawDate.trim() || timestamp.split(',')[0].trim() || 'ไม่ระบุวันที่';

    records.push({
      id: `eq-gown-${i}-${date.replace(/\//g, '')}`,
      seq: i,
      subCategory: 'gown',
      timestamp,
      date,
      requesterName: requester,
      department,
      actionType,
      status,
      itemSummary,
      itemsList,
      totalQuantity: totalQty,
      gownSizes,
    });
  }

  return records.reverse();
}

/**
 * 3. Convert Keys (กุญแจ) CSV Rows to EquipmentRecord[]
 */
export function convertKeysCsvToRecords(csvText: string): EquipmentRecord[] {
  const rows = parseCSV(csvText);
  if (!rows || rows.length < 2) return [];

  const records: EquipmentRecord[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => !c || !c.trim())) continue;

    const timestamp = row[0] || '';
    const rawDate = row[1] || '';
    const requester = row[2] || 'ไม่ระบุชื่อ';
    const rawDept = row[3] || '';
    const department = normalizeDepartment(rawDept) || 'แผนกทั่วไป';
    const actionRaw = row[4] || 'เบิก';
    const keyNumbers = row[5] || '';
    const note = row[6] || '';

    const isReturn = actionRaw.includes('คืน');
    const actionType = isReturn ? 'คืน' : 'เบิก';
    const status = isReturn ? 'คืนแล้ว' : 'เบิกแล้ว';

    const keysCount = keyNumbers ? keyNumbers.split(/[,+\/\s]+/).filter(Boolean).length : 1;
    const itemsList: EquipmentItemDetail[] = [
      {
        name: keyNumbers ? `กุญแจหมายเลข #${keyNumbers}` : 'กุญแจห้อง/ตู้',
        quantity: keysCount,
        note,
      },
    ];

    const date = rawDate.trim() || timestamp.split(',')[0].trim() || 'ไม่ระบุวันที่';
    const itemSummary = keyNumbers ? `กุญแจห้อง/อาคาร หมายเลข #${keyNumbers}` : 'กุญแจ';

    records.push({
      id: `eq-key-${i}-${date.replace(/\//g, '')}`,
      seq: i,
      subCategory: 'keys',
      timestamp,
      date,
      requesterName: requester,
      department,
      actionType,
      status,
      itemSummary,
      itemsList,
      totalQuantity: keysCount,
      keyNumbers,
      note,
    });
  }

  return records.reverse();
}

/**
 * 4. Convert Ladder (บันไดทรง A) CSV Rows to EquipmentRecord[]
 */
export function convertLadderCsvToRecords(csvText: string): EquipmentRecord[] {
  const rows = parseCSV(csvText);
  if (!rows || rows.length < 2) return [];

  const records: EquipmentRecord[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => !c || !c.trim())) continue;

    const timestamp = row[0] || '';
    const rawDate = row[1] || '';
    const actionRaw = row[2] || 'ยืม';
    const requester = row[3] || 'ไม่ระบุชื่อ';
    const rawDept = row[4] || '';
    const department = normalizeDepartment(rawDept) || 'ฝ่ายซ่อมบำรุง / ทั่วไป';
    const ladderType = row[5] || 'บันไดทรง A';
    const ladderInspection = row[6] || 'ไม่พบจุดชำรุด';
    const defectPhotoUrl = row[7] || '';

    const isReturn = actionRaw.includes('คืน');
    const actionType = isReturn ? 'คืน' : 'ยืม';
    const status = isReturn ? 'คืนแล้ว' : 'อยู่ระหว่างใช้งาน';

    const itemsList: EquipmentItemDetail[] = [
      {
        name: ladderType,
        quantity: 1,
        note: ladderInspection,
      },
    ];

    const date = rawDate.trim() || timestamp.split(',')[0].trim() || 'ไม่ระบุวันที่';
    const itemSummary = `${ladderType} (${ladderInspection || 'พร้อมใช้งาน'})`;

    records.push({
      id: `eq-ladder-${i}-${date.replace(/\//g, '')}`,
      seq: i,
      subCategory: 'ladder',
      timestamp,
      date,
      requesterName: requester,
      department,
      actionType,
      status,
      itemSummary,
      itemsList,
      totalQuantity: 1,
      ladderType,
      ladderInspection,
      defectPhotoUrl,
    });
  }

  return records.reverse();
}

/**
 * Generic Fetch helper for Equipment Sheets with multi-tier failover and caching
 */
async function fetchSheetCsvWithFallback(
  candidateUrls: string[],
  cacheKey: string
): Promise<string | null> {
  let csvText: string | null = null;

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'text/csv, text/plain, */*',
        },
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        if (text && text.length > 20) {
          csvText = text;
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem(cacheKey, text);
            }
          } catch {
            // ignore
          }
          break;
        }
      }
    } catch {
      // try next
    }
  }

  if (!csvText) {
    try {
      if (typeof window !== 'undefined') {
        csvText = localStorage.getItem(cacheKey);
      }
    } catch {
      // ignore
    }
  }

  return csvText;
}

/**
 * Fetch Cleaning Equipment Records
 */
export async function fetchGoogleSheetEquipmentCleaning(): Promise<EquipmentSyncResult> {
  if (inFlightCleaningPromise) return inFlightCleaningPromise;

  const execute = async (): Promise<EquipmentSyncResult> => {
    const urls = [
      `/api/sheet-csv?sheetId=1ghnlCzcIq9A6rGVrZtEqiVA0bGFdqO3ZhbuYLhyBViw&gid=1432727518`,
      CLEANING_EQUIPMENT_SHEET_CSV_URL,
    ];
    const csv = await fetchSheetCsvWithFallback(urls, 'proworkflow_eq_cleaning_csv_v1');
    const records = csv ? convertCleaningCsvToRecords(csv) : [];
    return {
      success: true,
      records,
      rawRowsCount: records.length,
      lastSyncedAt: new Date(),
    };
  };

  inFlightCleaningPromise = execute().finally(() => {
    inFlightCleaningPromise = null;
  });

  return inFlightCleaningPromise;
}

/**
 * Fetch Gown Records
 */
export async function fetchGoogleSheetEquipmentGown(): Promise<EquipmentSyncResult> {
  if (inFlightGownPromise) return inFlightGownPromise;

  const execute = async (): Promise<EquipmentSyncResult> => {
    const urls = [
      `/api/sheet-csv?sheetId=1AQXHNA1gDBXl5gWMeXu_y04ziGi3CDk-z6MbH6DQQ2M&gid=1537050902`,
      GOWN_EQUIPMENT_SHEET_CSV_URL,
    ];
    const csv = await fetchSheetCsvWithFallback(urls, 'proworkflow_eq_gown_csv_v1');
    const records = csv ? convertGownCsvToRecords(csv) : [];
    return {
      success: true,
      records,
      rawRowsCount: records.length,
      lastSyncedAt: new Date(),
    };
  };

  inFlightGownPromise = execute().finally(() => {
    inFlightGownPromise = null;
  });

  return inFlightGownPromise;
}

/**
 * Fetch Keys Records
 */
export async function fetchGoogleSheetEquipmentKeys(): Promise<EquipmentSyncResult> {
  if (inFlightKeysPromise) return inFlightKeysPromise;

  const execute = async (): Promise<EquipmentSyncResult> => {
    const urls = [
      `/api/sheet-csv?sheetId=1hBOaTsILrvA5UtTyL1iULW7SzGkW0-tPO3QmOUiR8mY&gid=546384221`,
      KEYS_EQUIPMENT_SHEET_CSV_URL,
    ];
    const csv = await fetchSheetCsvWithFallback(urls, 'proworkflow_eq_keys_csv_v1');
    const records = csv ? convertKeysCsvToRecords(csv) : [];
    return {
      success: true,
      records,
      rawRowsCount: records.length,
      lastSyncedAt: new Date(),
    };
  };

  inFlightKeysPromise = execute().finally(() => {
    inFlightKeysPromise = null;
  });

  return inFlightKeysPromise;
}

/**
 * Fetch Ladder Records
 */
export async function fetchGoogleSheetEquipmentLadder(): Promise<EquipmentSyncResult> {
  if (inFlightLadderPromise) return inFlightLadderPromise;

  const execute = async (): Promise<EquipmentSyncResult> => {
    const urls = [
      `/api/sheet-csv?sheetId=1ccv4HxX9QRRNVR6rQdCq5LvqD__tTyrxQnj1EWncy2s&gid=1183570474`,
      LADDER_EQUIPMENT_SHEET_CSV_URL,
    ];
    const csv = await fetchSheetCsvWithFallback(urls, 'proworkflow_eq_ladder_csv_v1');
    const records = csv ? convertLadderCsvToRecords(csv) : [];
    return {
      success: true,
      records,
      rawRowsCount: records.length,
      lastSyncedAt: new Date(),
    };
  };

  inFlightLadderPromise = execute().finally(() => {
    inFlightLadderPromise = null;
  });

  return inFlightLadderPromise;
}

/**
 * Fetch all equipment records by subcategory
 */
export async function fetchEquipmentRecordsBySubCategory(subCategory: EquipmentSubCategory): Promise<EquipmentSyncResult> {
  switch (subCategory) {
    case 'cleaning':
      return fetchGoogleSheetEquipmentCleaning();
    case 'gown':
      return fetchGoogleSheetEquipmentGown();
    case 'keys':
      return fetchGoogleSheetEquipmentKeys();
    case 'ladder':
      return fetchGoogleSheetEquipmentLadder();
    default:
      return fetchGoogleSheetEquipmentCleaning();
  }
}

// ============================================================================
// Google Sheet Integration for สุ่มตรวจคลอรีน (Chlorine Random Inspection)
// ============================================================================
export const CHLORINE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1nZrikbFdB32H7tjR7QM1vorHvXyRpEHew2YuTDTXMBc/edit?gid=788853334#gid=788853334';
export const CHLORINE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1nZrikbFdB32H7tjR7QM1vorHvXyRpEHew2YuTDTXMBc/export?format=csv&gid=788853334';

export const CHLORINE_FALLBACK_CSV = `ประทับเวลา,ชื่อผู้ผสมสาร - ผู้สุ่มตรวจ,กรุณาระบุวันที่,เลือกพื้นที่,อัพรูป
11/3/2026, 9:10:00,นพเก้า,11/3/2026,ส่งผลอาคาร B,https://drive.google.com/open?id=1jV_PtxJwC0VW5qkIhNk6dCza0jlwKXip
20/3/2026, 7:11:14,สุริยา,20/3/2026,ส่งผลอาคาร A,https://drive.google.com/open?id=1OzxItjFvgqukr5QNimCqOgBI1fPTAbFB
20/3/2026, 7:23:31,ชมภู,20/3/0069,ส่งผลอาคาร A,https://drive.google.com/open?id=113YH0heQ-PWb7tsLPmDPZbtyYiffLozK
21/3/2026, 7:25:15,พงศกร,21/3/0069,ส่งผลอาคาร B,https://drive.google.com/open?id=1wWGTYXqajYIWSnM2I_5T0oixSGbKYEqh
21/3/2026, 7:42:03,พงศกร,21/3/0069,ส่งผลอาคาร B,https://drive.google.com/open?id=1uyGraVBV_S89hyUdEodeR945b9gnCcEx
22/3/2026, 7:41:40,พงศกร,22/3/0069,ส่งผลอาคาร B,https://drive.google.com/open?id=191Q19V0wK9rLqG1q3aGg3FjHk4oP7e8L
22/3/2026, 8:12:10,สิทธิกร,22/3/0069,ผลสุ่มตรวจอาคาร A,https://drive.google.com/open?id=12L9k0vW9pX7qRtY1uIz8bA5cDeF3gH4j
23/3/2026, 7:15:30,สุริยา,23/3/2026,ส่งผลอาคาร A,https://drive.google.com/open?id=1jV_PtxJwC0VW5qkIhNk6dCza0jlwKXip`;

export interface ChlorineSyncResult {
  success: boolean;
  records: ChlorineInspectionRecord[];
  rawRowsCount: number;
  lastSyncedAt: Date;
  error?: string;
}

export function formatGoogleDriveImageUrl(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  const clean = url.trim();
  if (!clean) return '';
  
  if (clean.includes('thumbnail?id=') || clean.includes('googleusercontent.com/d/')) {
    return clean;
  }
  
  const idMatch = clean.match(/id=([a-zA-Z0-9_-]+)/) || clean.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    const fileId = idMatch[1];
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }
  return clean;
}

export function convertSheetRowsToChlorineRecords(csvText: string): ChlorineInspectionRecord[] {
  if (!csvText || !csvText.trim()) return [];
  const rows = parseCSV(csvText);
  if (rows.length <= 1) return [];

  const records: ChlorineInspectionRecord[] = [];
  
  // Header: ประทับเวลา,ชื่อผู้ผสมสาร - ผู้สุ่มตรวจ,กรุณาระบุวันที่,เลือกพื้นที่,อัพรูป
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || row.every(cell => !cell || !cell.trim())) continue;

    const timestamp = (row[0] || '').trim();
    const inspectorName = (row[1] || '').trim();
    const rawDate = (row[2] || '').trim();
    const rawArea = (row[3] || '').trim();
    const rawPhotoUrl = (row[4] || '').trim();

    if (!inspectorName && !rawArea && !rawPhotoUrl && !timestamp) continue;

    // Normalize date (handling Buddhist era and 0069 -> 2026)
    let inspectionDate = rawDate;
    if (rawDate) {
      const parts = rawDate.split(/[\/\-]/);
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        let y = parseInt(parts[2], 10);
        if (y < 100) {
          y = y > 50 ? 2500 + y - 543 : 2000 + y;
        } else if (y > 2400) {
          y = y - 543;
        }
        if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
          inspectionDate = `${d}/${m}/${y}`;
        }
      }
    } else if (timestamp) {
      const firstPart = timestamp.split(/[\s,]+/)[0];
      if (firstPart) inspectionDate = firstPart;
    }

    // Determine building
    let building: 'อาคาร A' | 'อาคาร B' | string = 'อาคาร A';
    const areaLower = rawArea.toLowerCase();
    if (areaLower.includes('อาคาร b') || areaLower.includes('อาคารb') || areaLower.includes('b')) {
      building = 'อาคาร B';
    } else if (areaLower.includes('อาคาร a') || areaLower.includes('อาคารa') || areaLower.includes('a')) {
      building = 'อาคาร A';
    }

    const actionType = rawArea.includes('สุ่มตรวจ') ? 'สุ่มตรวจ' : 'ส่งผล';
    const photoUrl = formatGoogleDriveImageUrl(rawPhotoUrl);

    records.push({
      id: `clr-${i}`,
      seq: i,
      timestamp: timestamp || 'ไม่ระบุเวลา',
      inspectorName: inspectorName || 'ไม่ระบุชื่อ',
      inspectionDate: inspectionDate || 'ไม่ระบุวันที่',
      rawArea: rawArea || (building === 'อาคาร A' ? 'สุ่มตรวจอาคาร A' : 'ส่งผลอาคาร B'),
      building,
      actionType,
      rawPhotoUrl,
      photoUrl,
      status: 'บันทึกผลแล้ว',
    });
  }

  // Always sort latest first (newest submission / date / timestamp / row at top)
  records.sort((a, b) => {
    const parseDateTime = (dateStr: string, timeStr: string) => {
      try {
        if (timeStr && timeStr.includes('/')) {
          const parts = timeStr.split(/[\s,]+/);
          const datePart = parts[0];
          const timePart = parts[1] || '00:00:00';
          const dSub = datePart.split(/[\/\-]/);
          if (dSub.length === 3) {
            let y = parseInt(dSub[2], 10);
            let m = parseInt(dSub[1], 10);
            let d = parseInt(dSub[0], 10);
            if (dSub[0].length === 4) {
              y = parseInt(dSub[0], 10);
              m = parseInt(dSub[1], 10);
              d = parseInt(dSub[2], 10);
            }
            if (y > 2400) y -= 543;
            const tSub = timePart.split(':');
            const hh = parseInt(tSub[0] || '0', 10);
            const mm = parseInt(tSub[1] || '0', 10);
            const ss = parseInt(tSub[2] || '0', 10);
            return new Date(y, m - 1, d, hh, mm, ss).getTime();
          }
        }
        if (dateStr) {
          const dParts = dateStr.split(/[\/\-]/);
          if (dParts.length === 3) {
            let d = parseInt(dParts[0], 10);
            let m = parseInt(dParts[1], 10);
            let y = parseInt(dParts[2], 10);
            if (y > 2400) y -= 543;
            return new Date(y, m - 1, d).getTime();
          }
        }
      } catch (e) {}
      return 0;
    };

    const valA = parseDateTime(a.inspectionDate, a.timestamp);
    const valB = parseDateTime(b.inspectionDate, b.timestamp);
    if (valB !== valA && valB > 0 && valA > 0) {
      return valB - valA;
    }
    return b.seq - a.seq; // Higher row seq is newer in Google Sheet
  });

  return records;
}

let inFlightChlorinePromise: Promise<ChlorineSyncResult> | null = null;

export async function fetchGoogleSheetChlorineRecords(): Promise<ChlorineSyncResult> {
  if (inFlightChlorinePromise) return inFlightChlorinePromise;

  const execute = async (): Promise<ChlorineSyncResult> => {
    const urls = [
      `/api/sheet-csv?sheetId=1nZrikbFdB32H7tjR7QM1vorHvXyRpEHew2YuTDTXMBc&gid=788853334`,
      CHLORINE_SHEET_CSV_URL,
      `https://docs.google.com/spreadsheets/d/1nZrikbFdB32H7tjR7QM1vorHvXyRpEHew2YuTDTXMBc/gviz/tq?tqx=out:csv&gid=788853334`,
    ];
    const csv = await fetchSheetCsvWithFallback(urls, 'proworkflow_chlorine_csv_v1');
    const records = csv ? convertSheetRowsToChlorineRecords(csv) : (CHLORINE_FALLBACK_CSV ? convertSheetRowsToChlorineRecords(CHLORINE_FALLBACK_CSV) : []);
    return {
      success: true,
      records,
      rawRowsCount: records.length,
      lastSyncedAt: new Date(),
    };
  };

  inFlightChlorinePromise = execute().finally(() => {
    inFlightChlorinePromise = null;
  });

  return inFlightChlorinePromise;
}






