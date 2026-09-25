import { InventoryCategory, InventoryProduct, InventoryTransaction } from '../types';

export const EQUIPMENT_INVENTORY_SHEET_ID = '1HEs4tRSU9c0crWYlPbk_PTHEdTmUKwWXbWl6N7hlaFA';
export const EQUIPMENT_INVENTORY_SHEET_GID = '172141710';
export const EQUIPMENT_INVENTORY_SHEET_URL = `https://docs.google.com/spreadsheets/d/${EQUIPMENT_INVENTORY_SHEET_ID}/edit?gid=${EQUIPMENT_INVENTORY_SHEET_GID}#gid=${EQUIPMENT_INVENTORY_SHEET_GID}`;
export const EQUIPMENT_INVENTORY_CSV_URL = `https://docs.google.com/spreadsheets/d/${EQUIPMENT_INVENTORY_SHEET_ID}/export?format=csv&gid=${EQUIPMENT_INVENTORY_SHEET_GID}`;

export const INVENTORY_CATEGORIES: { id: InventoryCategory; nameTh: string; nameEn: string; color: string }[] = [
  { id: 'all', nameTh: 'ทั้งหมด', nameEn: 'All Categories', color: 'indigo' },
  { id: 'ppe', nameTh: 'ชุดป้องกัน & เอี๊ยม', nameEn: 'PPE & Aprons', color: 'blue' },
  { id: 'headwear', nameTh: 'หมวก & คลุมผม', nameEn: 'Headwear & Caps', color: 'purple' },
  { id: 'hygiene', nameTh: 'หน้ากาก & สุขอนามัย', nameEn: 'Masks & Hygiene', color: 'emerald' },
  { id: 'uniform', nameTh: 'ป้าย/บัตร & แถบเสื้อ', nameEn: 'ID Badge & Bands', color: 'amber' },
  { id: 'boots', nameTh: 'รองเท้าบูท', nameEn: 'Safety Boots', color: 'rose' },
];

/**
 * 28 Standard Equipment Items according to the exact Google Sheet columns & rows:
 * https://docs.google.com/spreadsheets/d/1HEs4tRSU9c0crWYlPbk_PTHEdTmUKwWXbWl6N7hlaFA/edit?gid=172141710#gid=172141710
 * - ยอดตั้งต้น: Row 1
 * - เพิ่มสต็อก: Row 2 (0)
 * - ราคาขาย: Row 3 (53, 53, 1, 14, 1, 2, 48, 48, 102, 102, 107, 107, 5, 4, 15, 7, 144, 9, 127, 127, 127, 127, 127, 204, 204, 204, 204, 204)
 */
export const INITIAL_INVENTORY_PRODUCTS: InventoryProduct[] = [
  {
    id: 'item-1',
    name: 'เอี๊ยมขอบสีแดง',
    category: 'ppe',
    categoryName: 'ชุดป้องกัน & เอี๊ยม',
    unit: 'ผืน',
    initialStock: 50,
    stockIn: 0,
    price: 53,
    soldCount: 0,
    currentStock: 50,
    stockValue: 50 * 53,
    lastUpdatedDate: '23/09/2026',
    description: 'เอี๊ยมกันเปื้อนสำหรับไลน์ผลิต ขอบกุ๊นสีแดง',
  },
  {
    id: 'item-2',
    name: 'เอี๊ยมขอบสีน้ำเงิน',
    category: 'ppe',
    categoryName: 'ชุดป้องกัน & เอี๊ยม',
    unit: 'ผืน',
    initialStock: 5,
    stockIn: 0,
    price: 53,
    soldCount: 0,
    currentStock: 5,
    stockValue: 5 * 53,
    lastUpdatedDate: '23/09/2026',
    description: 'เอี๊ยมกันเปื้อนสำหรับไลน์ผลิต ขอบกุ๊นสีน้ำเงิน',
  },
  {
    id: 'item-3',
    name: 'หมวกกระดาษ',
    category: 'headwear',
    categoryName: 'หมวก & คลุมผม',
    unit: 'ใบ',
    initialStock: 500,
    stockIn: 0,
    price: 1,
    soldCount: 0,
    currentStock: 500,
    stockValue: 500 * 1,
    lastUpdatedDate: '23/09/2026',
    description: 'หมวกกระดาษแบบใช้แล้วทิ้ง สำหรับผู้เยี่ยมชมและพนักงาน',
  },
  {
    id: 'item-4',
    name: 'หมวกเน็ตคลุมผม',
    category: 'headwear',
    categoryName: 'หมวก & คลุมผม',
    unit: 'ใบ',
    initialStock: 10,
    stockIn: 0,
    price: 14,
    soldCount: 0,
    currentStock: 10,
    stockValue: 10 * 14,
    lastUpdatedDate: '23/09/2026',
    description: 'หมวกตาข่ายคลุมผมเนื้อนุ่ม ระบายอากาศดี',
  },
  {
    id: 'item-5',
    name: 'ผ้าปิดจมูกใยสังเคราะห์',
    category: 'hygiene',
    categoryName: 'หน้ากาก & สุขอนามัย',
    unit: 'ชิ้น',
    initialStock: 300,
    stockIn: 0,
    price: 1,
    soldCount: 0,
    currentStock: 300,
    stockValue: 300 * 1,
    lastUpdatedDate: '23/09/2026',
    description: 'หน้ากากอนามัยใยสังเคราะห์ ป้องกันฝุ่นละอองและสารคัดหลั่ง',
  },
  {
    id: 'item-6',
    name: 'ถุงครอบเท้า',
    category: 'hygiene',
    categoryName: 'หน้ากาก & สุขอนามัย',
    unit: 'คู่',
    initialStock: 20,
    stockIn: 0,
    price: 2,
    soldCount: 0,
    currentStock: 20,
    stockValue: 20 * 2,
    lastUpdatedDate: '23/09/2026',
    description: 'ถุงสวมครอบรองเท้าแบบใช้แล้วทิ้ง กันสิ่งปนเปื้อนในพื้นที่ควบคุม',
  },
  {
    id: 'item-7',
    name: 'หมวกสีขาว SIZE M',
    category: 'headwear',
    categoryName: 'หมวก & คลุมผม',
    unit: 'ใบ',
    initialStock: 5,
    stockIn: 0,
    price: 48,
    soldCount: 0,
    currentStock: 5,
    stockValue: 5 * 48,
    lastUpdatedDate: '23/09/2026',
    description: 'หมวกผ้าสีขาว มาตรฐานฝ่ายผลิต ขนาด M',
  },
  {
    id: 'item-8',
    name: 'หมวกสีขาว SIZE L',
    category: 'headwear',
    categoryName: 'หมวก & คลุมผม',
    unit: 'ใบ',
    initialStock: 5,
    stockIn: 0,
    price: 48,
    soldCount: 0,
    currentStock: 5,
    stockValue: 5 * 48,
    lastUpdatedDate: '23/09/2026',
    description: 'หมวกผ้าสีขาว มาตรฐานฝ่ายผลิต ขนาด L',
  },
  {
    id: 'item-9',
    name: 'หมวกสีขาวคลุมบ่า SIZE M',
    category: 'headwear',
    categoryName: 'หมวก & คลุมผม',
    unit: 'ใบ',
    initialStock: 5,
    stockIn: 0,
    price: 102,
    soldCount: 0,
    currentStock: 5,
    stockValue: 5 * 102,
    lastUpdatedDate: '23/09/2026',
    description: 'หมวกคลุมบ่าสีขาว ป้องกันเส้นผมหลุดร่วง ขนาด M',
  },
  {
    id: 'item-10',
    name: 'หมวกสีขาวคลุมบ่า SIZE L',
    category: 'headwear',
    categoryName: 'หมวก & คลุมผม',
    unit: 'ใบ',
    initialStock: 5,
    stockIn: 0,
    price: 102,
    soldCount: 0,
    currentStock: 5,
    stockValue: 5 * 102,
    lastUpdatedDate: '23/09/2026',
    description: 'หมวกคลุมบ่าสีขาว ป้องกันเส้นผมหลุดร่วง ขนาด L',
  },
  {
    id: 'item-11',
    name: 'หมวกสีขาวคลุมบ่าคาดแดง SIZE M',
    category: 'headwear',
    categoryName: 'หมวก & คลุมผม',
    unit: 'ใบ',
    initialStock: 5,
    stockIn: 0,
    price: 107,
    soldCount: 0,
    currentStock: 5,
    stockValue: 5 * 107,
    lastUpdatedDate: '23/09/2026',
    description: 'หมวกคลุมบ่าแถบคาดแดงสำหรับหัวหน้างาน/QC ขนาด M',
  },
  {
    id: 'item-12',
    name: 'หมวกสีขาวคลุมบ่าคาดแดง SIZE L',
    category: 'headwear',
    categoryName: 'หมวก & คลุมผม',
    unit: 'ใบ',
    initialStock: 5,
    stockIn: 0,
    price: 107,
    soldCount: 0,
    currentStock: 5,
    stockValue: 5 * 107,
    lastUpdatedDate: '23/09/2026',
    description: 'หมวกคลุมบ่าแถบคาดแดงสำหรับหัวหน้างาน/QC ขนาด L',
  },
  {
    id: 'item-13',
    name: 'แถบเสื้อสีชมพู',
    category: 'uniform',
    categoryName: 'ป้าย/บัตร & แถบเสื้อ',
    unit: 'แถบ',
    initialStock: 10,
    stockIn: 0,
    price: 5,
    soldCount: 0,
    currentStock: 10,
    stockValue: 10 * 5,
    lastUpdatedDate: '23/09/2026',
    description: 'แถบตีนตุ๊กแกสีชมพูสำหรับติดยูนิฟอร์มระบุฝ่าย/กะ',
  },
  {
    id: 'item-14',
    name: 'แถบเสื้อสีทอง',
    category: 'uniform',
    categoryName: 'ป้าย/บัตร & แถบเสื้อ',
    unit: 'แถบ',
    initialStock: 0,
    stockIn: 0,
    price: 4,
    soldCount: 0,
    currentStock: 0,
    stockValue: 0,
    lastUpdatedDate: '23/09/2026',
    description: 'แถบตีนตุ๊กแกสีทองสำหรับระดับหัวหน้าแผนก',
  },
  {
    id: 'item-15',
    name: 'สายคล้องบัตร',
    category: 'uniform',
    categoryName: 'ป้าย/บัตร & แถบเสื้อ',
    unit: 'เส้น',
    initialStock: 20,
    stockIn: 0,
    price: 15,
    soldCount: 0,
    currentStock: 20,
    stockValue: 20 * 15,
    lastUpdatedDate: '23/09/2026',
    description: 'สายคล้องบัตรพนักงานโรงงานลาดกระบัง 2 มีตัวปลดล็อกนิรภัย',
  },
  {
    id: 'item-16',
    name: 'กรอบใส่บัตรพนักงาน',
    category: 'uniform',
    categoryName: 'ป้าย/บัตร & แถบเสื้อ',
    unit: 'อัน',
    initialStock: 20,
    stockIn: 0,
    price: 7,
    soldCount: 0,
    currentStock: 20,
    stockValue: 20 * 7,
    lastUpdatedDate: '23/09/2026',
    description: 'กรอบพลาสติกแข็งแบบใสใส่บัตรพนักงาน RFID',
  },
  {
    id: 'item-17',
    name: 'ผ้ากันเปื้อน PVC',
    category: 'ppe',
    categoryName: 'ชุดป้องกัน & เอี๊ยม',
    unit: 'ผืน',
    initialStock: 10,
    stockIn: 0,
    price: 144,
    soldCount: 0,
    currentStock: 10,
    stockValue: 10 * 144,
    lastUpdatedDate: '23/09/2026',
    description: 'ผ้ากันเปื้อน PVC กันน้ำและสารเคมีชนิดหนาพิเศษ',
  },
  {
    id: 'item-18',
    name: 'ชุดตรวจ ATK',
    category: 'hygiene',
    categoryName: 'หน้ากาก & สุขอนามัย',
    unit: 'ชุด',
    initialStock: 0,
    stockIn: 0,
    price: 9,
    soldCount: 0,
    currentStock: 0,
    stockValue: 0,
    lastUpdatedDate: '23/09/2026',
    description: 'ชุดตรวจคัดกรองโควิด-19 ชนิดแยงจมูก รับรองมาตรฐาน อย.',
  },
  {
    id: 'item-19',
    name: 'รองเท้าบูท NO. 10',
    category: 'boots',
    categoryName: 'รองเท้าบูท',
    unit: 'คู่',
    initialStock: 5,
    stockIn: 0,
    price: 127,
    soldCount: 0,
    currentStock: 5,
    stockValue: 5 * 127,
    lastUpdatedDate: '23/09/2026',
    description: 'รองเท้าบูทยางกันลื่น พื้นเสริมเหล็ก เบอร์ 10',
  },
  {
    id: 'item-20',
    name: 'รองเท้าบูท NO. 10.5',
    category: 'boots',
    categoryName: 'รองเท้าบูท',
    unit: 'คู่',
    initialStock: 5,
    stockIn: 0,
    price: 127,
    soldCount: 0,
    currentStock: 5,
    stockValue: 5 * 127,
    lastUpdatedDate: '23/09/2026',
    description: 'รองเท้าบูทยางกันลื่น พื้นเสริมเหล็ก เบอร์ 10.5',
  },
  {
    id: 'item-21',
    name: 'รองเท้าบูท NO. 11',
    category: 'boots',
    categoryName: 'รองเท้าบูท',
    unit: 'คู่',
    initialStock: 5,
    stockIn: 0,
    price: 127,
    soldCount: 0,
    currentStock: 5,
    stockValue: 5 * 127,
    lastUpdatedDate: '23/09/2026',
    description: 'รองเท้าบูทยางกันลื่น พื้นเสริมเหล็ก เบอร์ 11',
  },
  {
    id: 'item-22',
    name: 'รองเท้าบูท NO. 11.5',
    category: 'boots',
    categoryName: 'รองเท้าบูท',
    unit: 'คู่',
    initialStock: 5,
    stockIn: 0,
    price: 127,
    soldCount: 0,
    currentStock: 5,
    stockValue: 5 * 127,
    lastUpdatedDate: '23/09/2026',
    description: 'รองเท้าบูทยางกันลื่น พื้นเสริมเหล็ก เบอร์ 11.5',
  },
  {
    id: 'item-23',
    name: 'รองเท้าบูท NO. 12',
    category: 'boots',
    categoryName: 'รองเท้าบูท',
    unit: 'คู่',
    initialStock: 3,
    stockIn: 0,
    price: 127,
    soldCount: 0,
    currentStock: 3,
    stockValue: 3 * 127,
    lastUpdatedDate: '23/09/2026',
    description: 'รองเท้าบูทยางกันลื่น พื้นเสริมเหล็ก เบอร์ 12',
  },
  {
    id: 'item-24',
    name: 'รองเท้าบูท EVA NO. 9.5',
    category: 'boots',
    categoryName: 'รองเท้าบูท',
    unit: 'คู่',
    initialStock: 3,
    stockIn: 0,
    price: 204,
    soldCount: 0,
    currentStock: 3,
    stockValue: 3 * 204,
    lastUpdatedDate: '23/09/2026',
    description: 'รองเท้าบูทน้ำหนักเบาพิเศษ โฟม EVA นุ่มสบาย เบอร์ 9.5',
  },
  {
    id: 'item-25',
    name: 'รองเท้าบูท EVA NO. 10',
    category: 'boots',
    categoryName: 'รองเท้าบูท',
    unit: 'คู่',
    initialStock: 3,
    stockIn: 0,
    price: 204,
    soldCount: 0,
    currentStock: 3,
    stockValue: 3 * 204,
    lastUpdatedDate: '23/09/2026',
    description: 'รองเท้าบูทน้ำหนักเบาพิเศษ โฟม EVA นุ่มสบาย เบอร์ 10',
  },
  {
    id: 'item-26',
    name: 'รองเท้าบูท EVA NO. 10.5',
    category: 'boots',
    categoryName: 'รองเท้าบูท',
    unit: 'คู่',
    initialStock: 3,
    stockIn: 0,
    price: 204,
    soldCount: 0,
    currentStock: 3,
    stockValue: 3 * 204,
    lastUpdatedDate: '23/09/2026',
    description: 'รองเท้าบูทน้ำหนักเบาพิเศษ โฟม EVA นุ่มสบาย เบอร์ 10.5',
  },
  {
    id: 'item-27',
    name: 'รองเท้าบูท EVA NO. 11',
    category: 'boots',
    categoryName: 'รองเท้าบูท',
    unit: 'คู่',
    initialStock: 3,
    stockIn: 0,
    price: 204,
    soldCount: 0,
    currentStock: 3,
    stockValue: 3 * 204,
    lastUpdatedDate: '23/09/2026',
    description: 'รองเท้าบูทน้ำหนักเบาพิเศษ โฟม EVA นุ่มสบาย เบอร์ 11',
  },
  {
    id: 'item-28',
    name: 'รองเท้าบูท EVA NO. 11.5',
    category: 'boots',
    categoryName: 'รองเท้าบูท',
    unit: 'คู่',
    initialStock: 3,
    stockIn: 0,
    price: 204,
    soldCount: 0,
    currentStock: 3,
    stockValue: 3 * 204,
    lastUpdatedDate: '23/09/2026',
    description: 'รองเท้าบูทน้ำหนักเบาพิเศษ โฟม EVA นุ่มสบาย เบอร์ 11.5',
  },
];

const LOCAL_STORAGE_PRODUCTS_KEY = 'proworkflow_equipment_inventory_products_v2';
const LOCAL_STORAGE_TRANSACTIONS_KEY = 'proworkflow_equipment_inventory_transactions_v2';
const LOCAL_STORAGE_WEBHOOK_KEY = 'proworkflow_equipment_inventory_webhook_url';

/**
 * Get configured Webhook URL from localStorage
 */
export function getEquipmentInventoryWebhookUrl(): string {
  try {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LOCAL_STORAGE_WEBHOOK_KEY) || '';
    }
  } catch {
    // ignore
  }
  return '';
}

/**
 * Save configured Webhook URL
 */
export function setEquipmentInventoryWebhookUrl(url: string): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_WEBHOOK_KEY, url.trim());
    }
  } catch {
    // ignore
  }
}

/**
 * Load saved products or fallback to default
 */
export function getLocalInventoryProducts(): InventoryProduct[] {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch {
    // ignore
  }
  return INITIAL_INVENTORY_PRODUCTS;
}

/**
 * Save inventory products to localStorage
 */
export function saveLocalInventoryProducts(products: InventoryProduct[]): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(products));
    }
  } catch {
    // ignore
  }
}

/**
 * Load all inventory transactions (sales, restocks, adjustments)
 */
export function getLocalInventoryTransactions(): InventoryTransaction[] {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LOCAL_STORAGE_TRANSACTIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Save inventory transactions
 */
export function saveLocalInventoryTransactions(transactions: InventoryTransaction[]): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_TRANSACTIONS_KEY, JSON.stringify(transactions));
    }
  } catch {
    // ignore
  }
}

/**
 * Fetch and Parse Live CSV from Google Sheet
 */
export async function syncInventoryFromGoogleSheet(): Promise<{
  success: boolean;
  products: InventoryProduct[];
  source: 'google-sheet' | 'proxy' | 'local';
  error?: string;
}> {
  let csvText = '';

  // Try 1: Proxy endpoint from Express server
  try {
    const proxyUrl = `/api/sheet-csv?sheetId=${EQUIPMENT_INVENTORY_SHEET_ID}&gid=${EQUIPMENT_INVENTORY_SHEET_GID}&_t=${Date.now()}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      csvText = await res.text();
    }
  } catch {
    // ignore
  }

  // Try 2: Direct Google Sheet CSV export if proxy fails
  if (!csvText || !csvText.includes('รายการสินค้า')) {
    try {
      const directUrl = `${EQUIPMENT_INVENTORY_CSV_URL}&_t=${Date.now()}`;
      const res = await fetch(directUrl);
      if (res.ok) {
        csvText = await res.text();
      }
    } catch {
      // ignore
    }
  }

  if (!csvText || !csvText.includes('รายการสินค้า')) {
    return {
      success: false,
      products: getLocalInventoryProducts(),
      source: 'local',
      error: 'ไม่สามารถดึงข้อมูลสดจาก Google Sheet ได้ กำลังใช้ข้อมูลที่บันทึกล่าสุด',
    };
  }

  // Parse CSV Rows
  const parsedProducts = parseInventorySheetCsv(csvText);
  if (parsedProducts.length > 0) {
    saveLocalInventoryProducts(parsedProducts);
    return {
      success: true,
      products: parsedProducts,
      source: 'google-sheet',
    };
  }

  return {
    success: false,
    products: getLocalInventoryProducts(),
    source: 'local',
    error: 'การแปลผลข้อมูลจาก Google Sheet ไม่สมบูรณ์',
  };
}

/**
 * Parse CSV text from the 7-row matrix Google Sheet format
 */
export function parseInventorySheetCsv(csv: string): InventoryProduct[] {
  // Normalize line endings (\r\n or \r to \n)
  const normalizedCsv = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = parseCSVRows(normalizedCsv);
  if (lines.length < 2) return INITIAL_INVENTORY_PRODUCTS;

  // Header row is Line 0: รายการสินค้า, [item1], [item2], ...
  const headerRow = lines[0];
  const rowInitial = lines.find((r) => r[0]?.trim() === 'ยอดตั้งต้น') || [];
  const rowRestock = lines.find((r) => r[0]?.trim() === 'เพิ่มสต็อก') || [];
  const rowPrice = lines.find((r) => r[0]?.trim() === 'ราคาขาย') || [];
  const rowDate = lines.find((r) => r[0]?.trim() === 'วันที่') || [];
  const rowSold = lines.find((r) => r[0]?.trim() === 'จำนวนขาย') || [];
  const rowRemaining = lines.find((r) => r[0]?.trim() === 'คงเหลือ') || [];
  const rowValue = lines.find((r) => r[0]?.trim() === 'มูลค่าคงเหลือ (฿)') || [];

  const existingProducts = getLocalInventoryProducts();
  const existingMap = new Map<string, InventoryProduct>();
  existingProducts.forEach((p) => existingMap.set(p.name.trim(), p));

  const initialListMap = new Map<string, InventoryProduct>();
  INITIAL_INVENTORY_PRODUCTS.forEach((p) => initialListMap.set(p.name.trim(), p));

  const result: InventoryProduct[] = [];

  for (let col = 1; col < headerRow.length; col++) {
    const itemName = headerRow[col]?.trim();
    if (!itemName) continue;

    const baseItem = existingMap.get(itemName) || initialListMap.get(itemName) || {
      id: `item-${col}`,
      name: itemName,
      category: detectItemCategory(itemName),
      categoryName: detectItemCategoryName(itemName),
      unit: detectItemUnit(itemName),
      initialStock: 0,
      stockIn: 0,
      price: 0,
      soldCount: 0,
      currentStock: 0,
      stockValue: 0,
      lastUpdatedDate: '23/09/2026',
    };

    // Parse initial stock
    const initial = rowInitial[col] && !isNaN(parseFloat(rowInitial[col]))
      ? parseFloat(rowInitial[col])
      : baseItem.initialStock;

    // Parse stockIn (เพิ่มสต็อก)
    const restock = rowRestock[col] && rowRestock[col].trim() !== '' && !isNaN(parseFloat(rowRestock[col]))
      ? parseFloat(rowRestock[col])
      : 0;

    // Parse price (ราคาขาย)
    const price = rowPrice[col] && rowPrice[col].trim() !== '' && !isNaN(parseFloat(rowPrice[col]))
      ? parseFloat(rowPrice[col])
      : baseItem.price;

    const date = rowDate[col]?.trim() || baseItem.lastUpdatedDate;
    
    const sold = rowSold[col] && rowSold[col].trim() !== '' && !isNaN(parseFloat(rowSold[col]))
      ? parseFloat(rowSold[col])
      : (baseItem.soldCount || 0);

    // Remaining is initial + restock - sold
    const calculatedRemaining = Math.max(0, initial + restock - sold);
    const remaining = rowRemaining[col] && rowRemaining[col].trim() !== '' && !isNaN(parseFloat(rowRemaining[col]))
      ? parseFloat(rowRemaining[col])
      : calculatedRemaining;

    const value = rowValue[col] && rowValue[col].trim() !== '' && !isNaN(parseFloat(rowValue[col]))
      ? parseFloat(rowValue[col])
      : remaining * price;

    result.push({
      ...baseItem,
      initialStock: initial,
      stockIn: restock,
      price: price,
      soldCount: sold,
      currentStock: remaining,
      stockValue: value,
      lastUpdatedDate: date,
    });
  }

  return result.length > 0 ? result : INITIAL_INVENTORY_PRODUCTS;
}

/**
 * Simple CSV parser handling quotes
 */
function parseCSVRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let inQuotes = false;
  let currentValue = '';

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        currentValue += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      currentRow.push(currentValue.trim());
      currentValue = '';
    } else if (c === '\n' && !inQuotes) {
      currentRow.push(currentValue.trim());
      if (currentRow.some((val) => val.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentValue = '';
    } else {
      currentValue += c;
    }
  }

  if (currentValue || currentRow.length > 0) {
    currentRow.push(currentValue.trim());
    if (currentRow.some((val) => val.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function detectItemCategory(name: string): 'ppe' | 'headwear' | 'hygiene' | 'uniform' | 'boots' {
  if (name.includes('เอี๊ยม') || name.includes('ผ้ากันเปื้อน') || name.includes('PVC')) return 'ppe';
  if (name.includes('หมวก')) return 'headwear';
  if (name.includes('ผ้าปิดจมูก') || name.includes('ถุงครอบเท้า') || name.includes('ATK')) return 'hygiene';
  if (name.includes('แถบเสื้อ') || name.includes('สายคล้อง') || name.includes('บัตร')) return 'uniform';
  if (name.includes('บูท') || name.includes('รองเท้า')) return 'boots';
  return 'ppe';
}

function detectItemCategoryName(name: string): string {
  const cat = detectItemCategory(name);
  const found = INVENTORY_CATEGORIES.find((c) => c.id === cat);
  return found ? found.nameTh : 'อุปกรณ์ทั่วไป';
}

function detectItemUnit(name: string): string {
  if (name.includes('รองเท้า') || name.includes('บูท') || name.includes('ถุงครอบเท้า')) return 'คู่';
  if (name.includes('หมวก') || name.includes('กรอบ')) return 'ใบ';
  if (name.includes('สายคล้อง') || name.includes('แถบ')) return 'เส้น';
  if (name.includes('ผ้ากันเปื้อน') || name.includes('เอี๊ยม')) return 'ผืน';
  if (name.includes('ATK')) return 'ชุด';
  return 'ชิ้น';
}

/**
 * Batch update row data for เพิ่มสต็อก and ราคาขาย
 */
export function updateBatchStockAndPrice(
  updates: Array<{ id: string; stockIn: number; price: number; initialStock?: number }>
): InventoryProduct[] {
  const products = getLocalInventoryProducts();
  const updateMap = new Map(updates.map((u) => [u.id, u]));

  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const updated = products.map((p) => {
    const up = updateMap.get(p.id);
    if (!up) return p;
    const stockIn = Math.max(0, up.stockIn);
    const price = Math.max(0, up.price);
    const initialStock = up.initialStock !== undefined && up.initialStock >= 0 ? up.initialStock : p.initialStock;
    const currentStock = Math.max(0, initialStock + stockIn - (p.soldCount || 0));
    const stockValue = currentStock * price;
    return {
      ...p,
      initialStock,
      stockIn,
      price,
      currentStock,
      stockValue,
      lastUpdatedDate: dateStr,
    };
  });

  saveLocalInventoryProducts(updated);
  return updated;
}

/**
 * Record a transaction:
 * - 'sale': reduce currentStock, increase soldCount
 * - 'restock': increase currentStock, increase stockIn
 * - 'adjust': adjust stock with difference
 */
export async function executeInventoryTransaction(
  payload: {
    type: 'sale' | 'restock' | 'adjust';
    productId: string;
    quantity: number;
    unitPrice?: number;
    customerName?: string;
    department?: string;
    operatorName?: string;
    note?: string;
  }
): Promise<{
  success: boolean;
  product?: InventoryProduct;
  transaction?: InventoryTransaction;
  error?: string;
}> {
  const products = getLocalInventoryProducts();
  const prodIndex = products.findIndex((p) => p.id === payload.productId);

  if (prodIndex === -1) {
    return { success: false, error: 'ไม่พบรายการสินค้าที่ระบุ' };
  }

  const prod = { ...products[prodIndex] };
  const qty = Math.abs(payload.quantity);

  if (qty <= 0) {
    return { success: false, error: 'กรุณาระบุจำนวนมากกว่า 0' };
  }

  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const timestamp = `${dateStr}, ${timeStr}`;

  if (payload.type === 'sale') {
    if (prod.currentStock < qty) {
      return {
        success: false,
        error: `สต็อกคงเหลือไม่เพียงพอ (คงเหลือ ${prod.currentStock} ${prod.unit}, ต้องการขาย ${qty} ${prod.unit})`,
      };
    }
    prod.soldCount += qty;
    prod.currentStock = Math.max(0, prod.initialStock + prod.stockIn - prod.soldCount);
    if (payload.unitPrice !== undefined && payload.unitPrice >= 0) {
      prod.price = payload.unitPrice;
    }
  } else if (payload.type === 'restock') {
    prod.stockIn += qty;
    prod.currentStock = prod.initialStock + prod.stockIn - prod.soldCount;
  } else if (payload.type === 'adjust') {
    // If adjust replaces stock directly
    prod.currentStock = qty;
    prod.initialStock = qty + prod.soldCount - prod.stockIn;
  }

  prod.stockValue = prod.currentStock * prod.price;
  prod.lastUpdatedDate = dateStr;

  products[prodIndex] = prod;
  saveLocalInventoryProducts(products);

  const newTx: InventoryTransaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp,
    dateStr,
    type: payload.type,
    productId: prod.id,
    productName: prod.name,
    quantity: payload.type === 'sale' ? -qty : qty,
    unitPrice: payload.unitPrice ?? prod.price,
    totalAmount: payload.type === 'sale' ? qty * (payload.unitPrice ?? prod.price) : 0,
    customerName: payload.customerName?.trim() || undefined,
    department: payload.department?.trim() || undefined,
    operatorName: payload.operatorName?.trim() || 'ผู้ดูแลคลังสินค้า',
    note: payload.note?.trim() || undefined,
    googleSheetSynced: false,
  };

  const transactions = [newTx, ...getLocalInventoryTransactions()];
  saveLocalInventoryTransactions(transactions);

  // Sync to Backend Express Server API & Google Apps Script Webhook
  try {
    syncTransactionToBackend(newTx, prod, products);
  } catch {
    // background sync
  }

  return {
    success: true,
    product: prod,
    transaction: newTx,
  };
}

/**
 * Update product price or starting stock or stock in
 */
export function updateProductDetails(
  productId: string,
  updates: { price?: number; initialStock?: number; stockIn?: number; name?: string; unit?: string }
): InventoryProduct | null {
  const products = getLocalInventoryProducts();
  const index = products.findIndex((p) => p.id === productId);
  if (index === -1) return null;

  const prod = { ...products[index] };
  if (updates.price !== undefined && updates.price >= 0) {
    prod.price = updates.price;
  }
  if (updates.stockIn !== undefined && updates.stockIn >= 0) {
    prod.stockIn = updates.stockIn;
  }
  if (updates.initialStock !== undefined && updates.initialStock >= 0) {
    prod.initialStock = updates.initialStock;
  }
  prod.currentStock = Math.max(0, prod.initialStock + prod.stockIn - prod.soldCount);
  if (updates.name?.trim()) prod.name = updates.name.trim();
  if (updates.unit?.trim()) prod.unit = updates.unit.trim();

  prod.stockValue = prod.currentStock * prod.price;
  products[index] = prod;
  saveLocalInventoryProducts(products);

  return prod;
}

// Client-side cache to prevent duplicate background sync calls
const sentTransactionIds = new Set<string>();

/**
 * Send Transaction to Backend & Google Sheet Webhook
 */
async function syncTransactionToBackend(
  transaction: InventoryTransaction,
  product: InventoryProduct,
  allProducts: InventoryProduct[]
): Promise<void> {
  const txId = transaction.id;
  if (txId && sentTransactionIds.has(txId)) {
    return;
  }
  if (txId) {
    sentTransactionIds.add(txId);
    if (sentTransactionIds.size > 500) {
      const first = sentTransactionIds.values().next().value;
      if (first) sentTransactionIds.delete(first);
    }
  }

  const webhookUrl = getEquipmentInventoryWebhookUrl();

  const payload = {
    transaction,
    product,
    txId,
    allProductsSummary: allProducts.map((p) => ({
      name: p.name,
      initialStock: p.initialStock,
      stockIn: p.stockIn,
      price: p.price,
      soldCount: p.soldCount,
      currentStock: p.currentStock,
      stockValue: p.stockValue,
      lastUpdatedDate: p.lastUpdatedDate,
    })),
    webhookUrl,
  };

  let serverSynced = false;

  // 1. Post to Express Server API (which proxies & forwards to Google Apps Script Webhook)
  try {
    const res = await fetch('/api/equipment-inventory-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      serverSynced = data.googleSheetSynced === true;
    }
  } catch (err) {
    console.warn('Could not post to /api/equipment-inventory-submit:', err);
  }

  // 2. Direct Webhook fallback ONLY if server was unreachable or did NOT forward to Google Sheet
  // CRITICAL FIX: Previously, both the Express server AND the browser called the Google Webhook,
  // causing Google Sheet to record 2x (e.g. 1 item sold was recorded as 2 items in Google Sheet).
  if (!serverSynced && webhookUrl && webhookUrl.startsWith('http')) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          txId: transaction.id,
          action: transaction.type,
          item: product.name,
          quantity: Math.abs(transaction.quantity),
          unitPrice: transaction.unitPrice,
          totalAmount: transaction.totalAmount,
          customer: transaction.customerName,
          department: transaction.department,
          operator: transaction.operatorName,
          note: transaction.note,
          date: transaction.dateStr,
          timestamp: transaction.timestamp,
          remainingStock: product.currentStock,
        }),
      });
    } catch {
      // ignore
    }
  }
}

/**
 * Generate TSV matrix identical to the Google Sheet for 1-click clipboard copy
 */
export function generateInventorySheetTsv(products: InventoryProduct[]): string {
  const header = ['รายการสินค้า', ...products.map((p) => p.name)].join('\t');
  const initial = ['ยอดตั้งต้น', ...products.map((p) => String(p.initialStock))].join('\t');
  const restock = ['เพิ่มสต็อก', ...products.map((p) => String(p.stockIn))].join('\t');
  const price = ['ราคาขาย', ...products.map((p) => String(p.price))].join('\t');
  const date = ['วันที่', ...products.map((p) => p.lastUpdatedDate || '')].join('\t');
  const sold = ['จำนวนขาย', ...products.map((p) => String(p.soldCount))].join('\t');
  const remaining = ['คงเหลือ', ...products.map((p) => String(p.currentStock))].join('\t');
  const value = ['มูลค่าคงเหลือ (฿)', ...products.map((p) => String(Math.round(p.stockValue)))].join('\t');

  return [header, initial, restock, price, date, sold, remaining, value].join('\n');
}

/**
 * Google Apps Script Webhook Template for the user
 */
export const EQUIPMENT_INVENTORY_APPS_SCRIPT = `/**
 * Google Apps Script สำหรับคลังอุปกรณ์ (Equipment Warehouse Management)
 * รองรับการอัปเดตสต็อก, การขาย, และบันทึกประวัติการทำรายการลง Google Sheet อัตโนมัติ
 * พร้อมระบบป้องกันการบันทึกข้อมูลซ้ำซ้อน (Deduplication)
 * 
 * วิธีติดตั้ง:
 * 1. เปิด Google Sheet: https://docs.google.com/spreadsheets/d/1HEs4tRSU9c0crWYlPbk_PTHEdTmUKwWXbWl6N7hlaFA/edit?gid=172141710
 * 2. ไปที่เมนู ส่วนขยาย (Extensions) -> Apps Script
 * 3. ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดชุดนี้ลงไป
 * 4. กด บันทึก (Save)
 * 5. กด ทำให้ใช้งานได้ (Deploy) -> การทำให้ใช้งานได้ใหม่ (New deployment)
 * 6. เลือกประเภท: เว็บแอป (Web app)
 * 7. ตั้งค่า: Execute as: "Me" (ฉัน) และ Who has access: "Anyone" (ทุกคน)
 * 8. กด ทำให้ใช้งานได้ (Deploy) แล้วคัดลอก Web App URL มาใส่ในระบบ
 */

function doPost(e) {
  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("คลังอุปกรณ์") || ss.getSheetByName("Sheet1") || ss.getSheets()[0];

    // ป้องกันการประมวลผลคำสั่งซ้ำ (Idempotency / Deduplication)
    var txId = data.txId || data.transactionId || (data.transaction && data.transaction.id);
    if (txId) {
      var cache = CacheService.getScriptCache();
      var cached = cache.get("tx_" + txId);
      if (cached) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "skipped_duplicate",
          message: "ข้ามการบันทึกเนื่องจากรายการนี้ถูกบันทึกเรียบร้อยแล้ว",
          txId: txId
        })).setMimeType(ContentService.MimeType.JSON);
      }
      cache.put("tx_" + txId, "done", 600); // จำประวัติธุรกรรมไว้ 10 นาที
    }

    var itemName = data.item || "";
    var action = data.action || "";
    var qty = Number(data.quantity) || 0;
    var price = Number(data.unitPrice) || 0;
    var date = data.date || Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy");

    // 1. ค้นหาคอลัมน์ของสินค้าที่ระบุในแถวที่ 1
    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var colIndex = -1;
    for (var c = 1; c < headers.length; c++) {
      if (headers[c].toString().trim() === itemName.trim()) {
        colIndex = c + 1; // 1-based index
        break;
      }
    }

    if (colIndex > 0) {
      // แถวที่ 2: ยอดตั้งต้น
      // แถวที่ 3: เพิ่มสต็อก
      // แถวที่ 4: ราคาขาย
      // แถวที่ 5: วันที่
      // แถวที่ 6: จำนวนขาย
      // แถวที่ 7: คงเหลือ
      // แถวที่ 8: มูลค่าคงเหลือ (฿)
      
      if (action === "sale") {
        var currentSold = Number(sheet.getRange(6, colIndex).getValue()) || 0;
        sheet.getRange(6, colIndex).setValue(currentSold + qty);
      } else if (action === "restock") {
        var currentRestock = Number(sheet.getRange(3, colIndex).getValue()) || 0;
        sheet.getRange(3, colIndex).setValue(currentRestock + qty);
      }
      
      if (price > 0) {
        sheet.getRange(4, colIndex).setValue(price);
      }
      sheet.getRange(5, colIndex).setValue(date);
    }

    // 2. บันทึกลงชีตประวัติการทำรายการ (History Logs)
    var logSheet = ss.getSheetByName("ประวัติการทำรายการ");
    if (!logSheet) {
      logSheet = ss.insertSheet("ประวัติการทำรายการ");
      logSheet.appendRow(["ประทับเวลา", "ประเภทรายการ", "รายการสินค้า", "จำนวน", "ราคาต่อหน่วย (฿)", "ยอดรวม (฿)", "ผู้ซื้อ/ผู้เบิก", "แผนก", "ผู้ทำรายการ", "หมายเหตุ", "รหัสรายการ (TxID)"]);
      logSheet.getRange(1, 1, 1, 11).setFontWeight("bold").setBackground("#e2e8f0");
    }

    var actionTh = action === "sale" ? "ขาย / เบิกจ่าย" : (action === "restock" ? "รับเข้าคลัง" : "ปรับปรุงสต็อก");
    logSheet.appendRow([
      data.timestamp || new Date(),
      actionTh,
      itemName,
      qty,
      price || 0,
      data.totalAmount || (qty * price),
      data.customer || "-",
      data.department || "-",
      data.operator || "-",
      data.note || "-",
      txId || "-"
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "บันทึกข้อมูลลง Google Sheet สำเร็จ",
      item: itemName,
      action: action,
      quantityRecorded: qty
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    sheetName: "Equipment Warehouse Webhook API"
  })).setMimeType(ContentService.MimeType.JSON);
}
`;
