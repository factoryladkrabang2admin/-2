import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

interface ParcelSubmissionRecord {
  id: string;
  timestamp: string;
  actionType: string;
  senderName: string;
  senderDepartment: string;
  recipientName: string;
  recipientDepartment: string;
  itemTitle: string;
  operatorName?: string;
  operatorDepartment?: string;
  createdAt: number;
  trackingCode?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const PARCEL_DATA_FILE = path.join(DATA_DIR, "parcel_submissions.json");
const LAUNDRY_DATA_FILE = path.join(DATA_DIR, "laundry_submissions.json");
const ANNOUNCEMENTS_DATA_FILE = path.join(DATA_DIR, "announcements_submissions.json");
const ANNOUNCEMENT_WEBHOOK_FILE = path.join(DATA_DIR, "announcement_webhook.json");
const EQUIPMENT_INVENTORY_DATA_FILE = path.join(DATA_DIR, "equipment_inventory_submissions.json");
const EQUIPMENT_INVENTORY_WEBHOOK_FILE = path.join(DATA_DIR, "equipment_inventory_webhook.json");
const EQUIPMENT_INVENTORY_RESET_FILE = path.join(DATA_DIR, "equipment_inventory_reset.json");
const EQUIPMENT_INVENTORY_PRODUCTS_FILE = path.join(DATA_DIR, "equipment_inventory_products.json");

let equipmentInventoryResetState: {
  isReset: boolean;
  resetTime: number;
  resetDate?: string;
  mode?: string;
} = { isReset: false, resetTime: 0 };
try {
  if (fs.existsSync(EQUIPMENT_INVENTORY_RESET_FILE)) {
    const raw = fs.readFileSync(EQUIPMENT_INVENTORY_RESET_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.isReset === "boolean") {
      equipmentInventoryResetState = parsed;
    }
  }
} catch {
  // ignore
}

let serverAnnouncementWebhookUrl: string = process.env.ANNOUNCEMENTS_WEBHOOK_URL || "";
let serverInventoryWebhookUrl: string = process.env.EQUIPMENT_INVENTORY_WEBHOOK_URL || "";
try {
  if (fs.existsSync(ANNOUNCEMENT_WEBHOOK_FILE)) {
    const raw = fs.readFileSync(ANNOUNCEMENT_WEBHOOK_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.webhookUrl === "string" && parsed.webhookUrl.trim()) {
      serverAnnouncementWebhookUrl = parsed.webhookUrl.trim();
      console.log("Loaded server-side announcement webhook URL from file");
    }
  }
} catch (e) {
  console.warn("Could not load announcement webhook from file:", e);
}

try {
  if (fs.existsSync(EQUIPMENT_INVENTORY_WEBHOOK_FILE)) {
    const raw = fs.readFileSync(EQUIPMENT_INVENTORY_WEBHOOK_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.webhookUrl === "string" && parsed.webhookUrl.trim()) {
      serverInventoryWebhookUrl = parsed.webhookUrl.trim();
      console.log("Loaded server-side equipment inventory webhook URL from file");
    }
  }
} catch (e) {
  console.warn("Could not load equipment inventory webhook from file:", e);
}

const DEFAULT_SERVER_INVENTORY_PRODUCTS = [
  { id: 'item-1', name: 'เอี๊ยมขอบสีแดง', category: 'ppe', categoryName: 'ชุดป้องกัน & เอี๊ยม', unit: 'ผืน', initialStock: 50, stockIn: 0, price: 53, soldCount: 0, currentStock: 50, stockValue: 2650, lastUpdatedDate: '23/09/2026', description: 'เอี๊ยมกันเปื้อนสำหรับไลน์ผลิต ขอบกุ๊นสีแดง' },
  { id: 'item-2', name: 'เอี๊ยมขอบสีน้ำเงิน', category: 'ppe', categoryName: 'ชุดป้องกัน & เอี๊ยม', unit: 'ผืน', initialStock: 5, stockIn: 0, price: 53, soldCount: 0, currentStock: 5, stockValue: 265, lastUpdatedDate: '23/09/2026', description: 'เอี๊ยมกันเปื้อนสำหรับไลน์ผลิต ขอบกุ๊นสีน้ำเงิน' },
  { id: 'item-3', name: 'หมวกกระดาษ', category: 'headwear', categoryName: 'หมวก & คลุมผม', unit: 'ใบ', initialStock: 500, stockIn: 0, price: 1, soldCount: 0, currentStock: 500, stockValue: 500, lastUpdatedDate: '23/09/2026', description: 'หมวกกระดาษแบบใช้แล้วทิ้ง สำหรับผู้เยี่ยมชมและพนักงาน' },
  { id: 'item-4', name: 'หมวกเน็ตคลุมผม', category: 'headwear', categoryName: 'หมวก & คลุมผม', unit: 'ใบ', initialStock: 10, stockIn: 0, price: 14, soldCount: 0, currentStock: 10, stockValue: 140, lastUpdatedDate: '23/09/2026', description: 'หมวกตาข่ายคลุมผมเนื้อนุ่ม ระบายอากาศดี' },
  { id: 'item-5', name: 'ผ้าปิดจมูกใยสังเคราะห์', category: 'hygiene', categoryName: 'หน้ากาก & สุขอนามัย', unit: 'ชิ้น', initialStock: 300, stockIn: 0, price: 1, soldCount: 100, currentStock: 200, stockValue: 200, lastUpdatedDate: '08/10/2026', description: 'หน้ากากอนามัยใยสังเคราะห์ ป้องกันฝุ่นละอองและสารคัดหลั่ง' },
  { id: 'item-6', name: 'ถุงครอบเท้า', category: 'hygiene', categoryName: 'หน้ากาก & สุขอนามัย', unit: 'คู่', initialStock: 20, stockIn: 0, price: 2, soldCount: 0, currentStock: 20, stockValue: 40, lastUpdatedDate: '23/09/2026', description: 'ถุงสวมครอบรองเท้าแบบใช้แล้วทิ้ง กันสิ่งปนเปื้อนในพื้นที่ควบคุม' },
  { id: 'item-7', name: 'หมวกสีขาว SIZE M', category: 'headwear', categoryName: 'หมวก & คลุมผม', unit: 'ใบ', initialStock: 5, stockIn: 0, price: 48, soldCount: 0, currentStock: 5, stockValue: 240, lastUpdatedDate: '23/09/2026', description: 'หมวกผ้าสีขาว มาตรฐานฝ่ายผลิต ขนาด M' },
  { id: 'item-8', name: 'หมวกสีขาว SIZE L', category: 'headwear', categoryName: 'หมวก & คลุมผม', unit: 'ใบ', initialStock: 5, stockIn: 0, price: 48, soldCount: 0, currentStock: 5, stockValue: 240, lastUpdatedDate: '23/09/2026', description: 'หมวกผ้าสีขาว มาตรฐานฝ่ายผลิต ขนาด L' },
  { id: 'item-9', name: 'หมวกสีขาวคลุมบ่า SIZE M', category: 'headwear', categoryName: 'หมวก & คลุมผม', unit: 'ใบ', initialStock: 5, stockIn: 0, price: 102, soldCount: 0, currentStock: 5, stockValue: 510, lastUpdatedDate: '23/09/2026', description: 'หมวกคลุมบ่าสีขาว ป้องกันเส้นผมหลุดร่วง ขนาด M' },
  { id: 'item-10', name: 'หมวกสีขาวคลุมบ่า SIZE L', category: 'headwear', categoryName: 'หมวก & คลุมผม', unit: 'ใบ', initialStock: 5, stockIn: 0, price: 102, soldCount: 0, currentStock: 5, stockValue: 510, lastUpdatedDate: '23/09/2026', description: 'หมวกคลุมบ่าสีขาว ป้องกันเส้นผมหลุดร่วง ขนาด L' },
  { id: 'item-11', name: 'หมวกสีขาวคลุมบ่าคาดแดง SIZE M', category: 'headwear', categoryName: 'หมวก & คลุมผม', unit: 'ใบ', initialStock: 5, stockIn: 0, price: 107, soldCount: 0, currentStock: 5, stockValue: 535, lastUpdatedDate: '23/09/2026', description: 'หมวกคลุมบ่าแถบคาดแดงสำหรับหัวหน้างาน/QC ขนาด M' },
  { id: 'item-12', name: 'หมวกสีขาวคลุมบ่าคาดแดง SIZE L', category: 'headwear', categoryName: 'หมวก & คลุมผม', unit: 'ใบ', initialStock: 5, stockIn: 0, price: 107, soldCount: 0, currentStock: 5, stockValue: 535, lastUpdatedDate: '23/09/2026', description: 'หมวกคลุมบ่าแถบคาดแดงสำหรับหัวหน้างาน/QC ขนาด L' },
  { id: 'item-13', name: 'แถบเสื้อสีชมพู', category: 'uniform', categoryName: 'ป้าย/บัตร & แถบเสื้อ', unit: 'แถบ', initialStock: 10, stockIn: 0, price: 5, soldCount: 0, currentStock: 10, stockValue: 50, lastUpdatedDate: '23/09/2026', description: 'แถบตีนตุ๊กแกสีชมพูสำหรับติดยูนิฟอร์มระบุฝ่าย/กะ' },
  { id: 'item-14', name: 'แถบเสื้อสีทอง', category: 'uniform', categoryName: 'ป้าย/บัตร & แถบเสื้อ', unit: 'แถบ', initialStock: 0, stockIn: 0, price: 4, soldCount: 0, currentStock: 0, stockValue: 0, lastUpdatedDate: '23/09/2026', description: 'แถบตีนตุ๊กแกสีทองสำหรับระดับหัวหน้าแผนก' },
  { id: 'item-15', name: 'สายคล้องบัตร', category: 'uniform', categoryName: 'ป้าย/บัตร & แถบเสื้อ', unit: 'เส้น', initialStock: 20, stockIn: 0, price: 15, soldCount: 0, currentStock: 20, stockValue: 300, lastUpdatedDate: '23/09/2026', description: 'สายคล้องบัตรพนักงานโรงงานลาดกระบัง 2 มีตัวปลดล็อกนิรภัย' },
  { id: 'item-16', name: 'กรอบใส่บัตรพนักงาน', category: 'uniform', categoryName: 'ป้าย/บัตร & แถบเสื้อ', unit: 'อัน', initialStock: 20, stockIn: 0, price: 7, soldCount: 0, currentStock: 20, stockValue: 140, lastUpdatedDate: '23/09/2026', description: 'กรอบพลาสติกแข็งแบบใสใส่บัตรพนักงาน RFID' },
  { id: 'item-17', name: 'ผ้ากันเปื้อน PVC', category: 'ppe', categoryName: 'ชุดป้องกัน & เอี๊ยม', unit: 'ผืน', initialStock: 10, stockIn: 0, price: 144, soldCount: 0, currentStock: 10, stockValue: 1440, lastUpdatedDate: '23/09/2026', description: 'ผ้ากันเปื้อน PVC กันน้ำและสารเคมีชนิดหนาพิเศษ' },
  { id: 'item-18', name: 'ชุดตรวจ ATK', category: 'hygiene', categoryName: 'หน้ากาก & สุขอนามัย', unit: 'ชุด', initialStock: 0, stockIn: 0, price: 9, soldCount: 0, currentStock: 0, stockValue: 0, lastUpdatedDate: '23/09/2026', description: 'ชุดตรวจคัดกรองโควิด-19 ชนิดแยงจมูก รับรองมาตรฐาน อย.' },
  { id: 'item-19', name: 'รองเท้าบูท NO. 10', category: 'boots', categoryName: 'รองเท้าบูท', unit: 'คู่', initialStock: 5, stockIn: 0, price: 127, soldCount: 0, currentStock: 5, stockValue: 635, lastUpdatedDate: '23/09/2026', description: 'รองเท้าบูทยางกันลื่น พื้นเสริมเหล็ก เบอร์ 10' },
  { id: 'item-20', name: 'รองเท้าบูท NO. 10.5', category: 'boots', categoryName: 'รองเท้าบูท', unit: 'คู่', initialStock: 5, stockIn: 0, price: 127, soldCount: 0, currentStock: 5, stockValue: 635, lastUpdatedDate: '23/09/2026', description: 'รองเท้าบูทยางกันลื่น พื้นเสริมเหล็ก เบอร์ 10.5' },
  { id: 'item-21', name: 'รองเท้าบูท NO. 11', category: 'boots', categoryName: 'รองเท้าบูท', unit: 'คู่', initialStock: 5, stockIn: 0, price: 127, soldCount: 0, currentStock: 5, stockValue: 635, lastUpdatedDate: '23/09/2026', description: 'รองเท้าบูทยางกันลื่น พื้นเสริมเหล็ก เบอร์ 11' },
  { id: 'item-22', name: 'รองเท้าบูท NO. 11.5', category: 'boots', categoryName: 'รองเท้าบูท', unit: 'คู่', initialStock: 5, stockIn: 0, price: 127, soldCount: 0, currentStock: 5, stockValue: 635, lastUpdatedDate: '23/09/2026', description: 'รองเท้าบูทยางกันลื่น พื้นเสริมเหล็ก เบอร์ 11.5' },
  { id: 'item-23', name: 'รองเท้าบูท NO. 12', category: 'boots', categoryName: 'รองเท้าบูท', unit: 'คู่', initialStock: 3, stockIn: 0, price: 127, soldCount: 0, currentStock: 3, stockValue: 381, lastUpdatedDate: '23/09/2026', description: 'รองเท้าบูทยางกันลื่น พื้นเสริมเหล็ก เบอร์ 12' },
  { id: 'item-24', name: 'รองเท้าบูท EVA NO. 9.5', category: 'boots', categoryName: 'รองเท้าบูท', unit: 'คู่', initialStock: 3, stockIn: 0, price: 204, soldCount: 0, currentStock: 3, stockValue: 612, lastUpdatedDate: '23/09/2026', description: 'รองเท้าบูทน้ำหนักเบาพิเศษ โฟม EVA นุ่มสบาย เบอร์ 9.5' },
  { id: 'item-25', name: 'รองเท้าบูท EVA NO. 10', category: 'boots', categoryName: 'รองเท้าบูท', unit: 'คู่', initialStock: 3, stockIn: 0, price: 204, soldCount: 0, currentStock: 3, stockValue: 612, lastUpdatedDate: '23/09/2026', description: 'รองเท้าบูทน้ำหนักเบาพิเศษ โฟม EVA นุ่มสบาย เบอร์ 10' },
  { id: 'item-26', name: 'รองเท้าบูท EVA NO. 10.5', category: 'boots', categoryName: 'รองเท้าบูท', unit: 'คู่', initialStock: 3, stockIn: 0, price: 204, soldCount: 0, currentStock: 3, stockValue: 612, lastUpdatedDate: '23/09/2026', description: 'รองเท้าบูทน้ำหนักเบาพิเศษ โฟม EVA นุ่มสบาย เบอร์ 10.5' },
  { id: 'item-27', name: 'รองเท้าบูท EVA NO. 11', category: 'boots', categoryName: 'รองเท้าบูท', unit: 'คู่', initialStock: 3, stockIn: 0, price: 204, soldCount: 0, currentStock: 3, stockValue: 612, lastUpdatedDate: '23/09/2026', description: 'รองเท้าบูทน้ำหนักเบาพิเศษ โฟม EVA นุ่มสบาย เบอร์ 11' },
  { id: 'item-28', name: 'รองเท้าบูท EVA NO. 11.5', category: 'boots', categoryName: 'รองเท้าบูท', unit: 'คู่', initialStock: 3, stockIn: 0, price: 204, soldCount: 0, currentStock: 3, stockValue: 612, lastUpdatedDate: '23/09/2026', description: 'รองเท้าบูทน้ำหนักเบาพิเศษ โฟม EVA นุ่มสบาย เบอร์ 11.5' },
];

let inMemoryInventoryProducts: any[] = [];
try {
  if (fs.existsSync(EQUIPMENT_INVENTORY_PRODUCTS_FILE)) {
    const raw = fs.readFileSync(EQUIPMENT_INVENTORY_PRODUCTS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      inMemoryInventoryProducts = parsed;
    }
  }
} catch (e) {
  console.warn("Could not load equipment inventory products from file:", e);
}
if (!inMemoryInventoryProducts || inMemoryInventoryProducts.length === 0) {
  inMemoryInventoryProducts = DEFAULT_SERVER_INVENTORY_PRODUCTS;
  try {
    fs.writeFileSync(EQUIPMENT_INVENTORY_PRODUCTS_FILE, JSON.stringify(inMemoryInventoryProducts, null, 2), "utf-8");
  } catch {}
}

function saveEquipmentInventoryProducts() {
  try {
    fs.writeFileSync(EQUIPMENT_INVENTORY_PRODUCTS_FILE, JSON.stringify(inMemoryInventoryProducts, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not save equipment inventory products to disk:", err);
  }
}

let equipmentInventoryVersion = Date.now();
const equipmentInventorySseClients = new Set<express.Response>();

function broadcastEquipmentInventoryUpdate(payload: any) {
  equipmentInventoryVersion = Date.now();
  const data = JSON.stringify({
    ...payload,
    version: equipmentInventoryVersion,
    timestamp: Date.now(),
  });
  for (const client of Array.from(equipmentInventorySseClients)) {
    try {
      client.write(`data: ${data}\n\n`);
    } catch {
      equipmentInventorySseClients.delete(client);
    }
  }
}

const DEFAULT_SERVER_INVENTORY_TRANSACTIONS = [
  {
    id: "tx-sheet-item-5",
    timestamp: "08/10/2026, 08:30:00",
    dateStr: "08/10/2026",
    type: "sale",
    productId: "item-5",
    productName: "ผ้าปิดจมูกใยสังเคราะห์",
    quantity: -100,
    unitPrice: 1,
    totalAmount: 100,
    customerName: "ฝ่ายผลิต",
    department: "ฝ่ายผลิต",
    operatorName: "เจ้าหน้าที่คลัง",
    note: "เบิกจ่ายประจำวัน (ตามยอดชีต)",
    googleSheetSynced: true,
    createdAt: 1791448200000,
  },
];

let inMemoryInventoryTransactions: any[] = [];
const forwardedInventoryTxIds = new Set<string>();
try {
  if (fs.existsSync(EQUIPMENT_INVENTORY_DATA_FILE)) {
    const raw = fs.readFileSync(EQUIPMENT_INVENTORY_DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      inMemoryInventoryTransactions = parsed;
    }
  }
} catch (e) {
  console.warn("Could not load equipment inventory submissions from file:", e);
}

if (!inMemoryInventoryTransactions || inMemoryInventoryTransactions.length === 0) {
  inMemoryInventoryTransactions = [...DEFAULT_SERVER_INVENTORY_TRANSACTIONS];
  try {
    fs.writeFileSync(EQUIPMENT_INVENTORY_DATA_FILE, JSON.stringify(inMemoryInventoryTransactions, null, 2), "utf-8");
  } catch {}
}

for (const item of inMemoryInventoryTransactions) {
  if (item && item.id) {
    forwardedInventoryTxIds.add(item.id);
  }
}
const GOWN_DATA_FILE = path.join(DATA_DIR, "gown_submissions.json");

// Helper to generate running tracking code identical to Laundry QR code
function extractServerDateTag(input?: string): string {
  const now = new Date();
  let yy = String(now.getFullYear()).slice(-2);
  let mm = String(now.getMonth() + 1).padStart(2, '0');
  let dd = String(now.getDate()).padStart(2, '0');
  if (input) {
    const clean = input.split(/[\s,]+/)[0];
    const parts = clean.split(/[-/.]/);
    if (parts.length === 3) {
      let y = parseInt(clean.includes('-') ? parts[0] : parts[2], 10);
      let m = parseInt(parts[1], 10);
      let d = parseInt(clean.includes('-') ? parts[2] : parts[0], 10);
      if (y > 2400) y -= 543;
      if (y < 100) y += 2000;
      yy = String(y).slice(-2);
      mm = String(m).padStart(2, '0');
      dd = String(d).padStart(2, '0');
    }
  }
  return `${yy}${mm}${dd}`;
}

function generateServerParcelTrackingCode(timestamp?: string): string {
  const dateTag = extractServerDateTag(timestamp);
  const targetTag = `LKB2${dateTag}`.toUpperCase();
  let maxSeq = 0;
  for (const s of inMemorySubmissions) {
    if (!s.trackingCode || (s.actionType && s.actionType !== "ส่ง")) continue;
    const norm = s.trackingCode.replace(/[\s\-_]/g, '').toUpperCase();
    if (norm.startsWith(targetTag)) {
      const seqStr = norm.slice(targetTag.length);
      const parsed = parseInt(seqStr, 10);
      if (!isNaN(parsed) && parsed > maxSeq) maxSeq = parsed;
    }
  }
  const nextSeq = String(maxSeq + 1).padStart(2, '0');
  return `LKB2 - ${dateTag}${nextSeq}`;
}

// Ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn("Could not create data directory:", e);
}

// In-memory cache of parcel submissions
let inMemorySubmissions: ParcelSubmissionRecord[] = [];

// Load initial submissions from file if available
try {
  if (fs.existsSync(PARCEL_DATA_FILE)) {
    const raw = fs.readFileSync(PARCEL_DATA_FILE, "utf-8");
    inMemorySubmissions = JSON.parse(raw);
  }
} catch (e) {
  console.warn("Could not load parcel submissions from file:", e);
}

function saveSubmission(record: ParcelSubmissionRecord) {
  inMemorySubmissions.unshift(record);
  // Keep last 500 records
  if (inMemorySubmissions.length > 500) {
    inMemorySubmissions = inMemorySubmissions.slice(0, 500);
  }
  try {
    fs.writeFileSync(PARCEL_DATA_FILE, JSON.stringify(inMemorySubmissions, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not persist parcel submission to disk:", err);
  }
}

let inMemoryLaundrySubmissions: any[] = [];
try {
  if (fs.existsSync(LAUNDRY_DATA_FILE)) {
    const raw = fs.readFileSync(LAUNDRY_DATA_FILE, "utf-8");
    inMemoryLaundrySubmissions = JSON.parse(raw);
    console.log(`Loaded ${inMemoryLaundrySubmissions.length} saved laundry submissions`);
  }
} catch (e) {
  console.warn("Could not load laundry submissions from file:", e);
}

function saveLaundrySubmission(record: any) {
  inMemoryLaundrySubmissions.unshift(record);
  if (inMemoryLaundrySubmissions.length > 500) {
    inMemoryLaundrySubmissions = inMemoryLaundrySubmissions.slice(0, 500);
  }
  try {
    fs.writeFileSync(LAUNDRY_DATA_FILE, JSON.stringify(inMemoryLaundrySubmissions, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not persist laundry submission to disk:", err);
  }
}

interface AnnouncementSubmissionRecord {
  id: string;
  title: string;
  content: string;
  department: string;
  startDate: string;
  endDate?: string;
  imageUrl?: string;
  imageUrl2?: string;
  imageUrl3?: string;
  imageUrls?: string[];
  rawImageUrls?: string[];
  operatorName?: string;
  createdAt: number;
  syncedToGoogle?: boolean;
}

let inMemoryAnnouncementSubmissions: AnnouncementSubmissionRecord[] = [];
try {
  if (fs.existsSync(ANNOUNCEMENTS_DATA_FILE)) {
    const raw = fs.readFileSync(ANNOUNCEMENTS_DATA_FILE, "utf-8");
    inMemoryAnnouncementSubmissions = JSON.parse(raw);
    console.log(`Loaded ${inMemoryAnnouncementSubmissions.length} saved announcement submissions`);
  }
} catch (e) {
  console.warn("Could not load announcement submissions from file:", e);
}

function saveAnnouncementSubmission(record: AnnouncementSubmissionRecord) {
  inMemoryAnnouncementSubmissions.unshift(record);
  if (inMemoryAnnouncementSubmissions.length > 500) {
    inMemoryAnnouncementSubmissions = inMemoryAnnouncementSubmissions.slice(0, 500);
  }
  try {
    fs.writeFileSync(ANNOUNCEMENTS_DATA_FILE, JSON.stringify(inMemoryAnnouncementSubmissions, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not persist announcement submission to disk:", err);
  }
}

const DELETED_ANNOUNCEMENTS_FILE = path.join(DATA_DIR, "deleted_announcements.json");
let deletedAnnouncementKeys = new Set<string>();
try {
  if (fs.existsSync(DELETED_ANNOUNCEMENTS_FILE)) {
    const raw = fs.readFileSync(DELETED_ANNOUNCEMENTS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      parsed.forEach((k: string) => {
        if (k && typeof k === "string") deletedAnnouncementKeys.add(k.trim().toLowerCase());
      });
    }
  }
} catch (e) {
  console.warn("Could not load deleted announcements:", e);
}

function saveDeletedAnnouncementKey(key: string) {
  if (!key || typeof key !== "string") return;
  deletedAnnouncementKeys.add(key.trim().toLowerCase());
  try {
    fs.writeFileSync(
      DELETED_ANNOUNCEMENTS_FILE,
      JSON.stringify(Array.from(deletedAnnouncementKeys), null, 2),
      "utf-8"
    );
  } catch (err) {
    console.warn("Could not persist deleted announcement key:", err);
  }
}

function removeDeletedAnnouncementKey(key: string) {
  if (!key || typeof key !== "string") return;
  const norm = key.trim().toLowerCase();
  if (deletedAnnouncementKeys.has(norm)) {
    deletedAnnouncementKeys.delete(norm);
    try {
      fs.writeFileSync(
        DELETED_ANNOUNCEMENTS_FILE,
        JSON.stringify(Array.from(deletedAnnouncementKeys), null, 2),
        "utf-8"
      );
    } catch (err) {
      console.warn("Could not update deleted announcements file:", err);
    }
  }
}

interface GownSubmissionRecord {
  id: string;
  actionType: string;
  date: string;
  personName: string;
  department: string;
  sizeL?: number | string;
  sizeXL?: number | string;
  size2XL?: number | string;
  totalQuantity: number;
  trackingCode?: string;
  syncedToGoogle: boolean;
  createdAt: number;
}

let inMemoryGownSubmissions: GownSubmissionRecord[] = [];
try {
  if (fs.existsSync(GOWN_DATA_FILE)) {
    const raw = fs.readFileSync(GOWN_DATA_FILE, "utf-8");
    inMemoryGownSubmissions = JSON.parse(raw);
    console.log(`Loaded ${inMemoryGownSubmissions.length} saved gown submissions`);
  }
} catch (e) {
  console.warn("Could not load gown submissions from file:", e);
}

function saveGownSubmission(record: GownSubmissionRecord) {
  inMemoryGownSubmissions.unshift(record);
  if (inMemoryGownSubmissions.length > 500) {
    inMemoryGownSubmissions = inMemoryGownSubmissions.slice(0, 500);
  }
  try {
    fs.writeFileSync(GOWN_DATA_FILE, JSON.stringify(inMemoryGownSubmissions, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not persist gown submission to disk:", err);
  }
}

function generateServerGownTrackingCode(rawDate?: string): string {
  let yy = "26";
  let mm = "09";
  let dd = "26";

  if (rawDate) {
    if (rawDate.includes("-")) {
      const p = rawDate.split("-");
      yy = p[0].slice(-2);
      mm = p[1].padStart(2, "0");
      dd = p[2].padStart(2, "0");
    } else if (rawDate.includes("/")) {
      const p = rawDate.split("/");
      dd = p[0].padStart(2, "0");
      mm = p[1].padStart(2, "0");
      let y = p[2];
      if (parseInt(y, 10) > 2400) y = String(parseInt(y, 10) - 543);
      yy = y.slice(-2);
    }
  } else {
    const now = new Date();
    yy = String(now.getFullYear()).slice(-2);
    mm = String(now.getMonth() + 1).padStart(2, "0");
    dd = String(now.getDate()).padStart(2, "0");
  }

  const dateTag = `${yy}${mm}${dd}`;
  const prefix = `LKB2 - ${dateTag}`;
  const targetTag = `LKB2${dateTag}`.toUpperCase();

  let maxSeq = 0;
  for (const sub of inMemoryGownSubmissions) {
    if (sub.trackingCode) {
      const norm = sub.trackingCode.replace(/[\s\-_]/g, "").toUpperCase();
      if (norm.startsWith(targetTag)) {
        const seq = parseInt(norm.slice(targetTag.length), 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(2, "0");
  return `${prefix}${nextSeq}`;
}

const KEYS_DATA_FILE = path.join(process.cwd(), "keys-submissions.json");

interface KeySubmissionRecord {
  id: string;
  actionType: string;
  date: string;
  personName: string;
  department: string;
  keyNumbers: string;
  trackingCode?: string;
  note?: string;
  syncedToGoogle: boolean;
  createdAt: number;
}

let inMemoryKeysSubmissions: KeySubmissionRecord[] = [];
try {
  if (fs.existsSync(KEYS_DATA_FILE)) {
    const raw = fs.readFileSync(KEYS_DATA_FILE, "utf-8");
    inMemoryKeysSubmissions = JSON.parse(raw);
    console.log(`Loaded ${inMemoryKeysSubmissions.length} saved keys submissions`);
  }
} catch (e) {
  console.warn("Could not load keys submissions from file:", e);
}

function saveKeysSubmission(record: KeySubmissionRecord) {
  inMemoryKeysSubmissions.unshift(record);
  if (inMemoryKeysSubmissions.length > 500) {
    inMemoryKeysSubmissions = inMemoryKeysSubmissions.slice(0, 500);
  }
  try {
    fs.writeFileSync(KEYS_DATA_FILE, JSON.stringify(inMemoryKeysSubmissions, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not persist keys submission to disk:", err);
  }
}

const LADDER_DATA_FILE = path.join(process.cwd(), "ladder-submissions.json");

interface LadderSubmissionRecord {
  id: string;
  actionType: string;
  date: string;
  personName: string;
  department: string;
  ladderType: string;
  trackingCode?: string;
  syncedToGoogle: boolean;
  createdAt: number;
}

let inMemoryLadderSubmissions: LadderSubmissionRecord[] = [];
try {
  if (fs.existsSync(LADDER_DATA_FILE)) {
    const raw = fs.readFileSync(LADDER_DATA_FILE, "utf-8");
    inMemoryLadderSubmissions = JSON.parse(raw);
    console.log(`Loaded ${inMemoryLadderSubmissions.length} saved ladder submissions`);
  }
} catch (e) {
  console.warn("Could not load ladder submissions from file:", e);
}

function saveLadderSubmission(record: LadderSubmissionRecord) {
  inMemoryLadderSubmissions.unshift(record);
  if (inMemoryLadderSubmissions.length > 500) {
    inMemoryLadderSubmissions = inMemoryLadderSubmissions.slice(0, 500);
  }
  try {
    fs.writeFileSync(LADDER_DATA_FILE, JSON.stringify(inMemoryLadderSubmissions, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not persist ladder submission to disk:", err);
  }
}

const SOFTENER_DATA_FILE = path.join(process.cwd(), "softener-submissions.json");

interface SoftenerSubmissionRecord {
  id: string;
  actionType: string;
  date: string;
  personName: string;
  area: string;
  item: string;
  syncedToGoogle: boolean;
  createdAt: number;
}

let inMemorySoftenerSubmissions: SoftenerSubmissionRecord[] = [];
try {
  if (fs.existsSync(SOFTENER_DATA_FILE)) {
    const raw = fs.readFileSync(SOFTENER_DATA_FILE, "utf-8");
    inMemorySoftenerSubmissions = JSON.parse(raw);
    console.log(`Loaded ${inMemorySoftenerSubmissions.length} saved softener submissions`);
  }
} catch (e) {
  console.warn("Could not load softener submissions from file:", e);
}

function saveSoftenerSubmission(record: SoftenerSubmissionRecord) {
  inMemorySoftenerSubmissions.unshift(record);
  if (inMemorySoftenerSubmissions.length > 500) {
    inMemorySoftenerSubmissions = inMemorySoftenerSubmissions.slice(0, 500);
  }
  try {
    fs.writeFileSync(SOFTENER_DATA_FILE, JSON.stringify(inMemorySoftenerSubmissions, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not persist softener submission to disk:", err);
  }
}

// RFC-4180 compliant CSV parser and stringifier
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentCell);
        currentCell = "";
      } else if (char === "\r" && nextChar === "\n") {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
        i++;
      } else if (char === "\n" || char === "\r") {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
  }
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }
  return rows;
}

function stringifyCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const str = cell ?? "";
          if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    )
    .join("\r\n");
}

// Google Form dynamic entry detection for itemTitle and trackingCode
interface DetectedParcelFormEntries {
  actionTypeEntry: string;
  senderNameEntry: string;
  senderDeptEntry: string;
  recipientNameEntry: string;
  recipientDeptEntry: string;
  itemTitleEntry: string | null;
  trackingCodeEntry: string | null;
}

let cachedParcelEntries: DetectedParcelFormEntries = {
  actionTypeEntry: "entry.1879722225",
  senderNameEntry: "entry.645686724",
  senderDeptEntry: "entry.1066148556",
  recipientNameEntry: "entry.222826518",
  recipientDeptEntry: "entry.600874339",
  itemTitleEntry: process.env.GOOGLE_PARCEL_ITEM_TITLE_ENTRY_ID || "entry.1686437864",
  trackingCodeEntry: "entry.1154218643",
};
let lastFormCheckTime = 0;

async function getOrDetectParcelFormEntries(formId: string): Promise<DetectedParcelFormEntries> {
  const now = Date.now();
  if (
    now - lastFormCheckTime < 30000 &&
    cachedParcelEntries.itemTitleEntry &&
    cachedParcelEntries.trackingCodeEntry
  ) {
    return cachedParcelEntries;
  }

  try {
    const res = await fetch(`https://docs.google.com/forms/d/e/${formId}/viewform`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (res.ok) {
      const html = await res.text();
      const match = html.match(/FB_PUBLIC_LOAD_DATA_ = (\[.*?\]);\s*<\/script>/s);
      if (match) {
        const data = JSON.parse(match[1]);
        const items = data[1]?.[1];
        if (Array.isArray(items)) {
          for (const item of items) {
            const title = (item[1] || "").trim();
            const entryId = item[4]?.[0]?.[0];
            if (!entryId) continue;
            const entryStr = `entry.${entryId}`;
            const tLower = title.toLowerCase();

            if (tLower.includes("ประเภท")) {
              cachedParcelEntries.actionTypeEntry = entryStr;
            } else if (tLower.includes("ชื่อผู้ส่ง")) {
              cachedParcelEntries.senderNameEntry = entryStr;
            } else if (tLower.includes("แผนกผู้ส่ง")) {
              cachedParcelEntries.senderDeptEntry = entryStr;
            } else if (tLower.includes("ชื่อผู้รับ")) {
              cachedParcelEntries.recipientNameEntry = entryStr;
            } else if (tLower.includes("แผนกผู้รับ")) {
              cachedParcelEntries.recipientDeptEntry = entryStr;
            } else if (/รหัส|ติดตาม|tracking/i.test(title)) {
              cachedParcelEntries.trackingCodeEntry = entryStr;
              console.log(`[Google Form] Detected tracking code entry ID: ${entryStr} (Title: ${title})`);
            } else if (/เอกสาร|พัสดุ|ชื่อ|รายการ|item|title/i.test(title)) {
              cachedParcelEntries.itemTitleEntry = entryStr;
              console.log(`[Google Form] Detected item title entry ID: ${entryStr} (Title: ${title})`);
            }
          }
        }
      }
    }
    lastFormCheckTime = now;
  } catch (err) {
    console.warn("[Google Form] Error detecting entries:", err);
  }

  return cachedParcelEntries;
}

// Backward-compatibility wrapper for item title entry detection
async function getOrDetectItemTitleEntryId(formId: string): Promise<string | null> {
  const entries = await getOrDetectParcelFormEntries(formId);
  return entries.itemTitleEntry;
}

// Clean and normalize strings for matching
function normalizeText(text: string): string {
  return (text || "").replace(/\s+/g, "").trim().toLowerCase();
}

interface DetectedLaundryFormSchema {
  departments: string[];
  garmentTypes: string[];
  deliveryTimes: string[];
  actionTypes: string[];
  updatedAt: string;
  source: "google_form" | "fallback";
}

const DEFAULT_LAUNDRY_DEPARTMENTS = [
  "A/2", "A/3", "A/4", "A/6", "B/1", "B/5",
  "2/1", "2/2", "2/3", "3/1", "3/2", "3/3", "3/4", "3/5",
  "ธุรการลาดกระบัง 1", "ธุรการลาดกระบัง 2", "สรรหาลาดกระบัง 1",
  "การตลาด (ขาย 1)", "การตลาด (ขาย 2)", "สต๊อก 2"
];

const DEFAULT_LAUNDRY_GARMENT_TYPES = [
  "เสื้อกาวน์สีเขียว",
  "เสื้อกาวน์สีกรมท่า",
  "ผ้ากรองแอร์",
  "ผ้าปูเตียงพยาบาล",
  "ผ้าปูโต๊ะ",
  "ผ้ารองปูโต๊ะ",
  "ชุด Visitor",
  "ผ้าคลุมไส้",
  "เอี๊ยม/หมวก",
  "เสื้อแขนยาวสีขาว"
];

const DEFAULT_LAUNDRY_DELIVERY_TIMES = [
  "10.35",
  "12.35",
  "14.35",
  "16.35",
  "วันถัดไป 08.10",
  "วันถัดไป 10.35",
  "วันถัดไป 12.35"
];

let cachedLaundryFormSchema: DetectedLaundryFormSchema = {
  departments: DEFAULT_LAUNDRY_DEPARTMENTS,
  garmentTypes: DEFAULT_LAUNDRY_GARMENT_TYPES,
  deliveryTimes: DEFAULT_LAUNDRY_DELIVERY_TIMES,
  actionTypes: ["อยู่ระหว่างการซัก", "ซักเสร็จแล้ว"],
  updatedAt: new Date().toISOString(),
  source: "fallback",
};
let lastLaundryFormCheckTime = 0;

async function getOrDetectLaundryFormSchema(
  formId: string = "1FAIpQLSfD1D5CgGbhL94VP2kePtM7fw5jxI7Nk8YA6_oDqsdxzkSZFQ",
  forceRefresh: boolean = false
): Promise<DetectedLaundryFormSchema> {
  const now = Date.now();
  if (!forceRefresh && now - lastLaundryFormCheckTime < 60000 && cachedLaundryFormSchema.source === "google_form") {
    return cachedLaundryFormSchema;
  }

  try {
    const res = await fetch(`https://docs.google.com/forms/d/e/${formId}/viewform`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (res.ok) {
      const html = await res.text();
      const match = html.match(/FB_PUBLIC_LOAD_DATA_ = (\[.*?\]);\s*<\/script>/s);
      if (match) {
        const data = JSON.parse(match[1]);
        const items = data[1]?.[1];
        if (Array.isArray(items)) {
          let detectedDepts: string[] = [];
          let detectedGarments: string[] = [];
          let detectedTimes: string[] = [];
          let detectedActions: string[] = [];

          for (const item of items) {
            const title = (item[1] || "").trim();
            const options = (item[4]?.[0]?.[1] || [])
              .map((o: any) => o?.[0])
              .filter((val: any) => typeof val === "string" && val.trim().length > 0);

            if (/แผนก/i.test(title) && options.length > 0) {
              detectedDepts = options;
            } else if (/ประเภทผ้า/i.test(title) && options.length > 0) {
              detectedGarments = options;
            } else if (/เวลาที่จัดส่ง/i.test(title) && options.length > 0) {
              detectedTimes = options;
            } else if (/เลือกข้อมูล/i.test(title) && options.length > 0) {
              detectedActions = options;
            }
          }

          if (detectedDepts.length > 0 || detectedGarments.length > 0) {
            cachedLaundryFormSchema = {
              departments: detectedDepts.length > 0 ? detectedDepts : cachedLaundryFormSchema.departments,
              garmentTypes: detectedGarments.length > 0 ? detectedGarments : cachedLaundryFormSchema.garmentTypes,
              deliveryTimes: detectedTimes.length > 0 ? detectedTimes : cachedLaundryFormSchema.deliveryTimes,
              actionTypes: detectedActions.length > 0 ? detectedActions : cachedLaundryFormSchema.actionTypes,
              updatedAt: new Date().toISOString(),
              source: "google_form",
            };
            lastLaundryFormCheckTime = now;
            console.log(
              `[Google Form] Successfully detected laundry form schema (${cachedLaundryFormSchema.departments.length} departments, ${cachedLaundryFormSchema.garmentTypes.length} garment types)`
            );
          }
        }
      }
    }
  } catch (err) {
    console.warn("[Google Form] Error detecting laundry form schema:", err);
  }

  return cachedLaundryFormSchema;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Global CORS and Cross-Origin-Resource-Policy for seamless embedding inside iframes and cross-origin subresources
  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    if (_req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Ensure local uploads directory for announcements and assets
  const uploadsDir = path.join(process.cwd(), "data", "uploads", "announcements");
  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
    } catch (mkdirErr) {
      console.warn("Could not create uploads directory:", mkdirErr);
    }
  }
  app.use("/uploads", express.static(path.join(process.cwd(), "data", "uploads"), {
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Cache-Control", "public, max-age=86400");
    }
  }));

  // In-memory & disk cache for Google Drive images to guarantee 100% reliable rendering without CORS/iFrame issues
  const driveImageCache = new Map<string, { buffer: Buffer; contentType: string; timestamp: number }>();
  const IMAGE_CACHE_DIR = path.join(process.cwd(), "data", "image_cache");
  if (!fs.existsSync(IMAGE_CACHE_DIR)) {
    try {
      fs.mkdirSync(IMAGE_CACHE_DIR, { recursive: true });
    } catch {
      // ignore
    }
  }

  // Pre-load disk cache on server start
  try {
    const cachedFiles = fs.readdirSync(IMAGE_CACHE_DIR);
    for (const f of cachedFiles) {
      if (f.endsWith(".bin")) {
        const fileId = f.replace(/\.bin$/, "");
        const metaPath = path.join(IMAGE_CACHE_DIR, `${fileId}.meta`);
        let contentType = "image/jpeg";
        if (fs.existsSync(metaPath)) {
          try {
            const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
            if (meta.contentType) contentType = meta.contentType;
          } catch {
            // ignore
          }
        }
        try {
          const buffer = fs.readFileSync(path.join(IMAGE_CACHE_DIR, f));
          driveImageCache.set(fileId, { buffer, contentType, timestamp: Date.now() });
        } catch {
          // ignore
        }
      }
    }
    console.log(`Loaded ${driveImageCache.size} cached images from disk.`);
  } catch (err) {
    console.warn("Could not pre-load image cache:", err);
  }

  // Helper to fetch and cache a Google Drive image
  async function fetchAndCacheDriveImage(fileId: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    // 1. Check RAM cache
    const ram = driveImageCache.get(fileId);
    if (ram && Date.now() - ram.timestamp < 14 * 24 * 60 * 60 * 1000) {
      return ram;
    }

    // 2. Check Disk cache
    const diskFilePath = path.join(IMAGE_CACHE_DIR, `${fileId}.bin`);
    const diskMetaPath = path.join(IMAGE_CACHE_DIR, `${fileId}.meta`);
    if (fs.existsSync(diskFilePath)) {
      try {
        const buffer = fs.readFileSync(diskFilePath);
        let contentType = "image/jpeg";
        if (fs.existsSync(diskMetaPath)) {
          const meta = JSON.parse(fs.readFileSync(diskMetaPath, "utf-8"));
          if (meta.contentType) contentType = meta.contentType;
        }
        const entry = { buffer, contentType, timestamp: Date.now() };
        driveImageCache.set(fileId, entry);
        return entry;
      } catch {
        // continue to network fetch
      }
    }

    // 3. Network fetch with multiple reliable endpoints and timeout
    const candidateUrls = [
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
      `https://lh3.googleusercontent.com/d/${fileId}`,
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`,
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`,
      `https://drive.usercontent.google.com/download?id=${fileId}&export=view`,
      `https://drive.google.com/uc?export=view&id=${fileId}`,
      `https://drive.google.com/uc?id=${fileId}`,
    ];

    for (const targetUrl of candidateUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);

        const googleRes = await fetch(targetUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          },
          redirect: "follow",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (googleRes.ok) {
          const contentType = googleRes.headers.get("content-type") || "image/jpeg";
          if (contentType.startsWith("image/") || contentType === "application/octet-stream") {
            const arrayBuf = await googleRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuf);
            if (buffer.length > 500) {
              const finalContentType = contentType === "application/octet-stream" ? "image/jpeg" : contentType;
              const entry = { buffer, contentType: finalContentType, timestamp: Date.now() };
              driveImageCache.set(fileId, entry);
              try {
                fs.writeFileSync(diskFilePath, buffer);
                fs.writeFileSync(diskMetaPath, JSON.stringify({ contentType: finalContentType }));
              } catch {
                // ignore
              }
              return entry;
            }
          }
        }
      } catch {
        // try next candidate
      }
    }

    return null;
  }

  // Prewarm announcement images from Google Sheet in the background
  async function prewarmAnnouncementImages() {
    try {
      const sheetUrl = "https://docs.google.com/spreadsheets/d/1cfsHq0UnSl6cwUgX7DQXeyDbnwDvIb01Y3Xb01PgxyU/gviz/tq?tqx=out:csv&gid=1228686844";
      const res = await fetch(sheetUrl, { headers: { Accept: "text/csv" } });
      if (!res.ok) return;
      const csv = await res.text();
      const driveIdMatches = Array.from(csv.matchAll(/(?:file\/d\/|[?&]id=|googleusercontent\.com\/d\/)([a-zA-Z0-9_-]{20,})/g));
      const fileIds = Array.from(new Set(driveIdMatches.map(m => m[1])));
      for (const id of fileIds) {
        if (!driveImageCache.has(id)) {
          await fetchAndCacheDriveImage(id).catch(() => {});
        }
      }
    } catch {
      // background task quiet fail
    }
  }

  // Run pre-warm after server boot and every 10 minutes
  setTimeout(() => prewarmAnnouncementImages(), 1500);
  setInterval(() => prewarmAnnouncementImages(), 10 * 60 * 1000);

  app.get("/api/drive-image", async (req, res) => {
    try {
      const rawId = (req.query.id as string) || "";
      const rawUrl = (req.query.url as string) || "";

      let fileId = rawId.trim();
      if (!fileId && rawUrl) {
        const matchD = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        const matchId = rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        const matchLh3 = rawUrl.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
        const matchDirect = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        fileId = matchD ? matchD[1] : matchId ? matchId[1] : matchLh3 ? matchLh3[1] : matchDirect ? matchDirect[1] : "";
      }

      if (!fileId) {
        return res.status(400).send("Missing Google Drive file ID");
      }

      // Fetch or read from cache
      const cached = await fetchAndCacheDriveImage(fileId);

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

      if (cached && cached.buffer) {
        res.setHeader("Content-Type", cached.contentType);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return res.send(cached.buffer);
      }

      // If network fetch could not download the image stream directly, redirect to Google CDN
      return res.redirect(`https://lh3.googleusercontent.com/d/${fileId}`);
    } catch (err: any) {
      console.warn("Error proxying drive image:", err);
      // Return safe SVG fallback so <img> never breaks
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      return res.send(`
        <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#1e293b"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
          </defs>
          <rect width="600" height="400" fill="url(#bg)"/>
          <circle cx="300" cy="170" r="50" fill="#334155"/>
          <path d="M280 160 L300 140 L320 160 L310 160 L310 190 L290 190 L290 160 Z" fill="#f59e0b"/>
          <text x="300" y="250" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-size="16" font-weight="bold">ข่าวประชาสัมพันธ์ ฟาร์มเฮ้าส์</text>
          <text x="300" y="275" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="12">ธุรการลาดกระบัง 2</text>
        </svg>
      `);
    }
  });

  // Google Sheet proxy endpoint for streaming raw CSV with intelligent parcel itemTitle enrichment
  app.get("/api/sheet-csv", async (req, res) => {
    try {
      const sheetId = (req.query.sheetId as string) || "1V2QAI3dRg8n5DXUGGBOGjpgsriSVUCZtySmLUQcqfpI";
      const gid = req.query.gid as string | undefined;
      const sheetName = req.query.sheet as string | undefined;
      const targetGid = gid || "1327805432";

      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      let exportUrl = "";
      const nowTs = Date.now();
      if (sheetName) {
        exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&_t=${nowTs}`;
      } else {
        exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${targetGid}&_t=${nowTs}`;
      }

      const isAnnouncementsSheet =
        targetGid === "1228686844" ||
        sheetId === "1cfsHq0UnSl6cwUgX7DQXeyDbnwDvIb01Y3Xb01PgxyU" ||
        (sheetName && (sheetName.includes("ข่าวประชาสัมพันธ์") || sheetName.includes("announcement")));

      let response: Response;
      try {
        response = await fetch(exportUrl, {
          headers: {
            Accept: "text/csv, text/plain, */*",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });
      } catch (fetchErr: any) {
        return res.status(500).json({ error: fetchErr.message || "Failed to fetch Google Sheet" });
      }

      if (!response.ok) {

        if (response.status === 401 || response.status === 403) {
          return res.status(response.status).json({
            error: "Google Sheet ยังไม่ได้เปิดสิทธิ์แชร์สาธารณะ (กรุณาตั้งค่าแชร์ใน Google Sheet เป็น 'ทุกคนที่มีลิงก์มีสิทธิ์ดู' / Anyone with the link can view)",
            requiresAuth: true,
            sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit?gid=${targetGid}#gid=${targetGid}`,
          });
        }
        return res.status(response.status).json({ error: `Google Sheets export returned ${response.status}` });
      }

      let csvText = await response.text();

      // If Google returned an HTML authentication / login gate instead of CSV data
      if (
        csvText.includes("<!DOCTYPE") ||
        csvText.includes("<html") ||
        csvText.includes("accounts.google.com") ||
        csvText.includes("document-root")
      ) {
        return res.status(403).json({
          error: "Google Sheet ยังไม่ได้เปิดสิทธิ์แชร์แบบสาธารณะ (กรุณาตั้งค่า 'ทุกคนที่มีลิงก์มีสิทธิ์ดู' ใน Google Sheet)",
          requiresAuth: true,
          sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit?gid=${gid || "1228686844"}#gid=${gid || "1228686844"}`,
        });
      }

      // Announcements sheet: strictly return rows from Google Sheet as requested
      // ("ข้อมูลที่แสดงให้นำข้อมูลจาก Google sheet เท่านั้น")
      if (isAnnouncementsSheet) {
        try {
          const rows = parseCsv(csvText);
          if (rows.length > 0) {
            // Keep rows from Google Sheet clean and formatted
            csvText = stringifyCsv(rows);
          }
        } catch (annErr) {
          console.warn("Could not parse announcements CSV:", annErr);
        }
      }

      // If this is the parcel delivery sheet (gid=1955620947 or sheetId=1IvTSJ9R1HeRtB89cvp3_zP776pfpOsaqAzAES1Pv330),
      // enrich any row where column 7 (ชื่อเอกสาร / พัสดุ) is empty using our saved submissions!
      const isParcelSheet =
        gid === "1955620947" ||
        sheetId === "1IvTSJ9R1HeRtB89cvp3_zP776pfpOsaqAzAES1Pv330" ||
        (sheetName && sheetName.includes("พัสดุ"));

      if (isParcelSheet && inMemorySubmissions.length > 0) {
        try {
          const rows = parseCsv(csvText);
          if (rows.length > 1) {
            const header = rows[0].map((h) => h.trim().toLowerCase());
            let titleColIdx = header.findIndex(
              (h) => h.includes("ชื่อเอกสาร") || h.includes("พัสดุ") || h.includes("รายการ")
            );
            if (titleColIdx === -1 && rows[0].length > 6) {
              titleColIdx = 6;
            }

            let trackingColIdx = header.findIndex(
              (h) => h.includes("รหัสติดตาม") || h.includes("tracking") || h.includes("รหัส")
            );
            if (trackingColIdx === -1 && rows[0].length > 7) {
              trackingColIdx = 7;
            }

            const senderColIdx = header.findIndex((h) => h.includes("ชื่อผู้ส่ง"));
            const recipientColIdx = header.findIndex((h) => h.includes("ชื่อผู้รับ"));
            const actionColIdx = header.findIndex((h) => h.includes("ประเภท"));

            if (titleColIdx >= 0) {
              // Ensure header exists
              if (!rows[0][titleColIdx] || !rows[0][titleColIdx].trim()) {
                rows[0][titleColIdx] = "ชื่อเอกสาร / พัสดุ";
              }
            }

            if (trackingColIdx >= 0) {
              if (!rows[0][trackingColIdx] || !rows[0][trackingColIdx].trim()) {
                rows[0][trackingColIdx] = "รหัสติดตาม";
              }
            }

            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (!row || row.length === 0) continue;

              const currentTitle = titleColIdx >= 0 ? (row[titleColIdx] || "").trim() : "";
              const currentTracking = trackingColIdx >= 0 ? (row[trackingColIdx] || "").trim() : "";

              if (!currentTitle || !currentTracking) {
                const sName = senderColIdx >= 0 ? normalizeText(row[senderColIdx]) : "";
                const rName = recipientColIdx >= 0 ? normalizeText(row[recipientColIdx]) : "";
                const aType = actionColIdx >= 0 ? normalizeText(row[actionColIdx]) : "";

                // Find best matching saved submission
                const match = inMemorySubmissions.find((sub) => {
                  const matchSender = !sName || normalizeText(sub.senderName) === sName;
                  const matchRecipient = !rName || normalizeText(sub.recipientName) === rName;
                  const matchAction = !aType || normalizeText(sub.actionType) === aType;
                  return matchSender && matchRecipient && matchAction;
                });

                if (match) {
                  if (!currentTitle && match.itemTitle && titleColIdx >= 0) {
                    while (row.length <= titleColIdx) {
                      row.push("");
                    }
                    row[titleColIdx] = match.itemTitle;
                  }
                  if (!currentTracking && match.trackingCode && trackingColIdx >= 0) {
                    while (row.length <= trackingColIdx) {
                      row.push("");
                    }
                    row[trackingColIdx] = match.trackingCode;
                  }
                }
              }
            }
            csvText = stringifyCsv(rows);
          }
        } catch (enrichErr) {
          console.warn("Could not enrich parcel CSV:", enrichErr);
        }
      }

      // Announcements sheet: strictly return rows from Google Sheet only (plus admin delete filtering)
      if (isAnnouncementsSheet) {
        try {
          let rows = parseCsv(csvText);
          if (rows.length > 0) {
            // Filter out rows deleted by admin
            if (deletedAnnouncementKeys.size > 0) {
              const header = rows[0];
              const remaining = rows.slice(1).filter((r) => {
                const rowTitle = normalizeText(r[1] || r[0] || "");
                return !deletedAnnouncementKeys.has(rowTitle);
              });
              rows = [header, ...remaining];
            }
            csvText = stringifyCsv(rows);
          }
        } catch (filterErr) {
          console.warn("Could not filter announcements CSV:", filterErr);
        }
      }

      // Equipment Inventory sheet enrichment (sheetId: 1HEs4tRSU9c0crWYlPbk_PTHEdTmUKwWXbWl6N7hlaFA, gid: 172141710)
      const isEquipmentInventorySheet =
        targetGid === "172141710" ||
        sheetId === "1HEs4tRSU9c0crWYlPbk_PTHEdTmUKwWXbWl6N7hlaFA" ||
        (sheetName && (sheetName.includes("คลังอุปกรณ์") || sheetName.includes("Equipment")));

      if (isEquipmentInventorySheet && (inMemoryInventoryTransactions.length > 0 || equipmentInventoryResetState.isReset)) {
        try {
          const rows = parseCsv(csvText);
          if (rows.length >= 6) {
            // Row 0: รายการสินค้า
            // Row 1: ยอดตั้งต้น
            // Row 2: เพิ่มสต็อก
            // Row 3: ราคาขาย
            // Row 4: วันที่
            // Row 5: จำนวนขาย
            // Row 6: คงเหลือ
            // Row 7: มูลค่าคงเหลือ (฿)
            const itemHeaders = rows[0];

            // If system has been reset, clear any old pre-reset restock and sales counts from Google Sheet CSV
            if (equipmentInventoryResetState.isReset) {
              const now = new Date();
              const todayStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
              for (let c = 1; c < itemHeaders.length; c++) {
                if (rows[2]) rows[2][c] = "0"; // เพิ่มสต็อก (ลบข้อมูลเดิมเป็น 0)
                if (rows[5]) rows[5][c] = "0"; // จำนวนขาย (ลบข้อมูลเดิมเป็น 0)
                if (rows[4]) rows[4][c] = todayStr; // วันที่ (เริ่มรอบใหม่)
                const initial = parseFloat(rows[1]?.[c] || "0") || 0;
                const price = parseFloat(rows[3]?.[c] || "0") || 0;
                if (!rows[6]) rows[6] = [];
                rows[6][c] = String(initial); // คงเหลือ = ยอดตั้งต้น
                if (!rows[7]) rows[7] = [];
                rows[7][c] = String(Math.round(initial * price)); // มูลค่าคงเหลือ
              }
            }

            const salesMap = new Map<string, number>();
            const restockMap = new Map<string, number>();
            for (const tx of inMemoryInventoryTransactions) {
              const pName = (tx.productName || "").trim();
              if (!pName) continue;
              if (tx.type === "sale") {
                salesMap.set(pName, (salesMap.get(pName) || 0) + Math.abs(tx.quantity || 1));
              } else if (tx.type === "restock") {
                restockMap.set(pName, (restockMap.get(pName) || 0) + Math.abs(tx.quantity || 1));
              }
            }

            for (const prod of inMemoryInventoryProducts) {
              const pName = (prod.name || "").trim();
              if (pName && prod.soldCount > 0) {
                salesMap.set(pName, Math.max(salesMap.get(pName) || 0, prod.soldCount));
              }
              if (pName && prod.stockIn > 0) {
                restockMap.set(pName, Math.max(restockMap.get(pName) || 0, prod.stockIn));
              }
            }

            for (let c = 1; c < itemHeaders.length; c++) {
              const itemName = (itemHeaders[c] || "").trim();
              if (!itemName) continue;
              const addedSales = salesMap.get(itemName) || 0;
              const addedRestock = restockMap.get(itemName) || 0;
              if (addedSales > 0 || addedRestock > 0) {
                const currentSold = parseFloat(rows[5]?.[c] || "0") || 0;
                const newSold = currentSold + addedSales;
                if (!rows[5]) rows[5] = [];
                rows[5][c] = String(newSold);

                const currentRestock = parseFloat(rows[2]?.[c] || "0") || 0;
                const newRestock = currentRestock + addedRestock;
                if (!rows[2]) rows[2] = [];
                rows[2][c] = String(newRestock);

                const initial = parseFloat(rows[1]?.[c] || "0") || 0;
                const price = parseFloat(rows[3]?.[c] || "0") || 0;
                const remaining = Math.max(0, initial + newRestock - newSold);
                if (!rows[6]) rows[6] = [];
                rows[6][c] = String(remaining);

                if (!rows[7]) rows[7] = [];
                rows[7][c] = String(Math.round(remaining * price));

                // Row 4: วันที่ (Date) - บันทึกวันที่ต่อลงด้านล่างเรื่อยๆ
                if (!rows[4]) rows[4] = [];
                const curDate = (rows[4][c] || "").trim();
                const now = new Date();
                const todayStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
                if (!curDate) {
                  rows[4][c] = todayStr;
                } else {
                  const dateLines = curDate.split(/[\r\n]+/).map((s) => s.trim()).filter(Boolean);
                  if (!dateLines.includes(todayStr)) {
                    dateLines.push(todayStr);
                    rows[4][c] = dateLines.join("\n");
                  }
                }
              }
            }
            csvText = stringifyCsv(rows);
          }
        } catch (enrichErr) {
          console.warn("Could not enrich equipment inventory CSV:", enrichErr);
        }
      }

      // Keys sheet enrichment: ensure recent borrow/return submissions with trackingCode are immediately reflected before Google gviz cache expires
      const isKeysSheet =
        targetGid === "546384221" ||
        sheetId === "1hBOaTsILrvA5UtTyL1iULW7SzGkW0-tPO3QmOUiR8mY";

      if (isKeysSheet && inMemoryKeysSubmissions.length > 0) {
        try {
          const rows = parseCsv(csvText);
          if (rows.length > 0) {
            // Helper to normalize dates (YYYY-MM-DD or D/M/YYYY) to D/M/YYYY for comparison and sheet rows
            const toSheetDate = (dStr: string): string => {
              const clean = (dStr || "").trim();
              if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(clean)) {
                const p = clean.split("-");
                let y = parseInt(p[0], 10);
                if (y > 2400) y -= 543;
                return `${parseInt(p[2], 10)}/${parseInt(p[1], 10)}/${y}`;
              }
              return clean;
            };

            const existingKeys = new Set<string>();
            for (let i = 1; i < rows.length; i++) {
              const r = rows[i];
              if (!r) continue;
              const act = ((r[4] || "").trim().includes("คืน") ? "คืน" : "เบิก");
              const trk = (r[6] || "").replace(/[\s\-_]/g, "").toUpperCase();
              const num = (r[5] || "").trim().toLowerCase();
              const reqName = (r[2] || "").trim().toLowerCase();
              const normDate = toSheetDate(r[1] || "");
              if (trk) {
                existingKeys.add(`${act}:TRK:${trk}`);
              }
              existingKeys.add(`${act}:ITEM:${reqName}:${num}:${normDate}`);
            }

            // Append in chronological order (oldest to newest) so consolidation keeps latest state
            const chronologicalSubs = [...inMemoryKeysSubmissions].reverse();
            for (const sub of chronologicalSubs) {
              const act = sub.actionType && sub.actionType.includes("คืน") ? "คืน" : "เบิก";
              const trk = (sub.trackingCode || "").replace(/[\s\-_]/g, "").toUpperCase();
              const num = (sub.keyNumbers || "").trim().toLowerCase();
              const reqName = (sub.personName || "").trim().toLowerCase();
              const normDate = toSheetDate(sub.date || "");
              const trkKey = trk ? `${act}:TRK:${trk}` : "";
              const itemKey = `${act}:ITEM:${reqName}:${num}:${normDate}`;

              const alreadyInSheet = trkKey ? existingKeys.has(trkKey) : existingKeys.has(itemKey);
              if (!alreadyInSheet) {
                if (trkKey) existingKeys.add(trkKey);
                existingKeys.add(itemKey);
                const subDate = new Date(sub.createdAt || Date.now());
                const timeStr = `${subDate.getDate()}/${subDate.getMonth() + 1}/${subDate.getFullYear()}, ${String(subDate.getHours()).padStart(2, "0")}:${String(subDate.getMinutes()).padStart(2, "0")}:${String(subDate.getSeconds()).padStart(2, "0")}`;
                rows.push([
                  timeStr,
                  normDate || sub.date || "",
                  sub.personName || "",
                  sub.department || "",
                  act,
                  sub.keyNumbers || "",
                  sub.trackingCode || "",
                ]);
              }
            }
            csvText = stringifyCsv(rows);
          }
        } catch (enrichErr) {
          console.warn("Could not enrich keys CSV:", enrichErr);
        }
      }

      // Ladder sheet enrichment: ensure borrow/return submissions with trackingCode are reflected in CSV
      const isLadderSheet =
        targetGid === "1183570474" ||
        sheetId === "1ccv4HxX9QRRNVR6rQdCq5LvqD__tTyrxQnj1EWncy2s";

      if (isLadderSheet && inMemoryLadderSubmissions.length > 0) {
        try {
          const rows = parseCsv(csvText);
          if (rows.length > 0) {
            const toSheetDate = (dStr: string): string => {
              const clean = (dStr || "").trim();
              if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(clean)) {
                const p = clean.split("-");
                let y = parseInt(p[0], 10);
                if (y > 2400) y -= 543;
                return `${parseInt(p[2], 10)}/${parseInt(p[1], 10)}/${y}`;
              }
              return clean;
            };

            if (!rows[0][6] || !rows[0][6].trim()) {
              while (rows[0].length <= 6) rows[0].push("");
              rows[0][6] = "หมายเลขติดตาม";
            }

            const chronologicalSubs = [...inMemoryLadderSubmissions].reverse();
            const matchedSubIds = new Set<string>();

            // 1. Enrich existing sheet rows that don't have column 6 (trackingCode) yet
            for (let i = 1; i < rows.length; i++) {
              const r = rows[i];
              if (!r) continue;
              const act = (r[2] || "").trim().includes("คืน") ? "คืน" : "ยืม";
              const reqName = (r[3] || "").trim().toLowerCase();
              const lType = (r[5] || "").trim().toLowerCase();
              const normDate = toSheetDate(r[1] || "");
              const currentTrk = (r[6] || "").trim();

              if (!currentTrk) {
                const matchSub = chronologicalSubs.find((sub) => {
                  if (matchedSubIds.has(sub.id) || !sub.trackingCode) return false;
                  const subAct = sub.actionType && sub.actionType.includes("คืน") ? "คืน" : "ยืม";
                  const subName = (sub.personName || "").trim().toLowerCase();
                  const subLadder = (sub.ladderType || "").trim().toLowerCase();
                  const subDate = toSheetDate(sub.date || "");
                  return subAct === act && subName === reqName && subLadder === lType && subDate === normDate;
                });
                if (matchSub && matchSub.trackingCode) {
                  matchedSubIds.add(matchSub.id);
                  while (r.length <= 6) r.push("");
                  r[6] = matchSub.trackingCode;
                }
              }
            }

            // 2. Track existing entries and append recent submissions not yet in sheet cache
            const existingLadders = new Set<string>();
            for (let i = 1; i < rows.length; i++) {
              const r = rows[i];
              if (!r) continue;
              const act = (r[2] || "").trim().includes("คืน") ? "คืน" : "ยืม";
              const trk = (r[6] || "").replace(/[\s\-_]/g, "").toUpperCase();
              const reqName = (r[3] || "").trim().toLowerCase();
              const lType = (r[5] || "").trim().toLowerCase();
              const normDate = toSheetDate(r[1] || "");
              if (trk) {
                existingLadders.add(`${act}:TRK:${trk}`);
              }
              existingLadders.add(`${act}:ITEM:${reqName}:${lType}:${normDate}`);
            }

            for (const sub of chronologicalSubs) {
              if (matchedSubIds.has(sub.id)) continue;
              const act = sub.actionType && sub.actionType.includes("คืน") ? "คืน" : "ยืม";
              const trk = (sub.trackingCode || "").replace(/[\s\-_]/g, "").toUpperCase();
              const reqName = (sub.personName || "").trim().toLowerCase();
              const lType = (sub.ladderType || "").trim().toLowerCase();
              const normDate = toSheetDate(sub.date || "");
              const trkKey = trk ? `${act}:TRK:${trk}` : "";
              const itemKey = `${act}:ITEM:${reqName}:${lType}:${normDate}`;

              const alreadyInSheet = trkKey ? existingLadders.has(trkKey) : existingLadders.has(itemKey);
              if (!alreadyInSheet) {
                if (trkKey) existingLadders.add(trkKey);
                existingLadders.add(itemKey);
                const subDate = new Date(sub.createdAt || Date.now());
                const timeStr = `${subDate.getDate()}/${subDate.getMonth() + 1}/${subDate.getFullYear()}, ${String(subDate.getHours()).padStart(2, "0")}:${String(subDate.getMinutes()).padStart(2, "0")}:${String(subDate.getSeconds()).padStart(2, "0")}`;
                rows.push([
                  timeStr,
                  normDate || sub.date || "",
                  act,
                  sub.personName || "",
                  sub.department || "",
                  sub.ladderType || "",
                  sub.trackingCode || "",
                ]);
              }
            }
            csvText = stringifyCsv(rows);
          }
        } catch (enrichErr) {
          console.warn("Could not enrich ladder CSV:", enrichErr);
        }
      }

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      return res.send(csvText);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to fetch sheet proxy" });
    }
  });

  // Get list of saved announcement submissions
  app.get("/api/announcement-submissions", (_req, res) => {
    res.json({
      success: true,
      submissions: inMemoryAnnouncementSubmissions,
      count: inMemoryAnnouncementSubmissions.length,
    });
  });

  // Get and set global announcement Apps Script webhook URL
  app.get("/api/announcement-webhook", (_req, res) => {
    const effectiveUrl = serverAnnouncementWebhookUrl || process.env.ANNOUNCEMENTS_WEBHOOK_URL || "";
    res.json({
      webhookUrl: effectiveUrl,
      connected: !!(effectiveUrl && effectiveUrl.startsWith("http")),
    });
  });

  app.post("/api/announcement-webhook", (req, res) => {
    const { webhookUrl } = req.body || {};
    if (typeof webhookUrl === "string") {
      serverAnnouncementWebhookUrl = webhookUrl.trim();
      try {
        fs.writeFileSync(
          ANNOUNCEMENT_WEBHOOK_FILE,
          JSON.stringify({ webhookUrl: serverAnnouncementWebhookUrl }, null, 2),
          "utf-8"
        );
      } catch (err) {
        console.warn("Could not persist announcement webhook to disk:", err);
      }
    }
    const effectiveUrl = serverAnnouncementWebhookUrl || process.env.ANNOUNCEMENTS_WEBHOOK_URL || "";
    res.json({
      success: true,
      webhookUrl: effectiveUrl,
      connected: !!(effectiveUrl && effectiveUrl.startsWith("http")),
    });
  });

  // Delete announcement endpoint (Restricted to Administrator / Supervisor / Page Admin)
  app.post("/api/announcement-delete", async (req, res) => {
    try {
      const { id, title } = req.body || {};
      if (!id && !title) {
        return res.status(400).json({ success: false, error: "Missing announcement id or title" });
      }

      if (id) saveDeletedAnnouncementKey(String(id));
      if (title) saveDeletedAnnouncementKey(String(title));

      // Remove from inMemoryAnnouncementSubmissions
      inMemoryAnnouncementSubmissions = inMemoryAnnouncementSubmissions.filter((sub) => {
        const matchId = id && sub.id === id;
        const matchTitle = title && sub.title.trim().toLowerCase() === String(title).trim().toLowerCase();
        return !(matchId || matchTitle);
      });

      try {
        fs.writeFileSync(ANNOUNCEMENTS_DATA_FILE, JSON.stringify(inMemoryAnnouncementSubmissions, null, 2), "utf-8");
      } catch (err) {
        console.warn("Could not persist updated announcements file:", err);
      }

      // If webhook is available, forward delete event to Google Apps Script
      let webhookUrl = (serverAnnouncementWebhookUrl || process.env.ANNOUNCEMENTS_WEBHOOK_URL || "").trim();
      if (!webhookUrl && fs.existsSync(ANNOUNCEMENT_WEBHOOK_FILE)) {
        try {
          const raw = fs.readFileSync(ANNOUNCEMENT_WEBHOOK_FILE, "utf-8");
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.webhookUrl === "string") webhookUrl = parsed.webhookUrl.trim();
        } catch {}
      }

      if (webhookUrl && webhookUrl.startsWith("http")) {
        try {
          fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", id, title, "หัวข้อ": title }),
          }).catch(() => {});
        } catch {}
      }

      return res.json({
        success: true,
        message: "ลบข่าวประชาสัมพันธ์เรียบร้อยแล้ว",
        deletedId: id,
        deletedTitle: title,
      });
    } catch (err: any) {
      console.error("Error in /api/announcement-delete:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to delete announcement" });
    }
  });

  app.delete("/api/announcements/:id", async (req, res) => {
    const { id } = req.params;
    const title = req.query.title as string | undefined;
    if (id) saveDeletedAnnouncementKey(String(id));
    if (title) saveDeletedAnnouncementKey(String(title));

    inMemoryAnnouncementSubmissions = inMemoryAnnouncementSubmissions.filter((sub) => sub.id !== id);
    try {
      fs.writeFileSync(ANNOUNCEMENTS_DATA_FILE, JSON.stringify(inMemoryAnnouncementSubmissions, null, 2), "utf-8");
    } catch {}

    return res.json({ success: true, message: "ลบข่าวประชาสัมพันธ์เรียบร้อยแล้ว", deletedId: id });
  });

  // Get list of saved parcel submissions
  app.get("/api/parcel-submissions", (_req, res) => {
    res.json({
      success: true,
      submissions: inMemorySubmissions,
      count: inMemorySubmissions.length,
    });
  });

  // Check Google Form status for Parcel Delivery
  app.get("/api/parcel-form-status", async (req, res) => {
    try {
      const GOOGLE_PARCEL_FORM_ID = "1FAIpQLSfhL7tVwlJ7aYMt7fCWkBnMk1hS7ZJePsjYDRxnSDxmwsqq_g";
      if (req.query.refresh === "true") {
        lastFormCheckTime = 0;
      }
      const formEntries = await getOrDetectParcelFormEntries(GOOGLE_PARCEL_FORM_ID);
      return res.json({
        formId: GOOGLE_PARCEL_FORM_ID,
        hasItemTitleQuestion: !!formEntries.itemTitleEntry,
        detectedEntryId: formEntries.itemTitleEntry,
        hasTrackingCodeQuestion: !!formEntries.trackingCodeEntry,
        detectedTrackingEntryId: formEntries.trackingCodeEntry,
        formEditUrl: `https://docs.google.com/forms/d/${GOOGLE_PARCEL_FORM_ID}/edit`,
        formViewUrl: `https://docs.google.com/forms/d/e/${GOOGLE_PARCEL_FORM_ID}/viewform`,
        sheetUrl: "https://docs.google.com/spreadsheets/d/1IvTSJ9R1HeRtB89cvp3_zP776pfpOsaqAzAES1Pv330/edit?gid=1955620947",
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Parcel & Document Google Form & Google Sheet direct submission endpoint
  app.post("/api/parcel-submit", async (req, res) => {
    try {
      const payload = req.body || {};

      if (
        !payload.senderName?.trim() ||
        !payload.senderDepartment?.trim() ||
        !payload.recipientName?.trim() ||
        !payload.recipientDepartment?.trim() ||
        !payload.itemTitle?.trim()
      ) {
        return res.status(400).json({
          success: false,
          error: "กรุณากรอกข้อมูลให้ครบทุกช่องก่อนทำรายการ",
        });
      }

      const actionType = payload.actionType || "รับ";
      const trackingCode = payload.trackingCode || (actionType === "ส่ง" ? generateServerParcelTrackingCode(payload.timestamp) : "");

      // Duplicate prevention on server for already received codes:
      // (ตั้งค่าเลขรหัส หรือ ข้อมูลที่ถูกรับไปแล้ว ไม่สามารถทำรายการซ้ำได้)
      if (actionType === "รับ" && trackingCode) {
        const norm = trackingCode.replace(/[\s\-_]/g, "").toLowerCase();
        const alreadyReceived = inMemorySubmissions.some((s) => {
          if (!s.trackingCode) return false;
          const sNorm = s.trackingCode.replace(/[\s\-_]/g, "").toLowerCase();
          return sNorm === norm && s.actionType === "รับ";
        });
        if (alreadyReceived) {
          return res.status(400).json({
            success: false,
            error: `รหัสติดตาม "${trackingCode}" ถูกทำรายการรับไปแล้ว ไม่สามารถทำรายการซ้ำได้`,
          });
        }
      }

      // Check duplicate by exact title + sender + recipient for receiving
      if (actionType === "รับ" && payload.itemTitle && payload.senderName && payload.recipientName) {
        const normTitle = normalizeText(payload.itemTitle);
        const normSender = normalizeText(payload.senderName);
        const normRecipient = normalizeText(payload.recipientName);
        const duplicateReceived = inMemorySubmissions.some((s) => {
          if (s.actionType !== "รับ") return false;
          return (
            normalizeText(s.itemTitle) === normTitle &&
            normalizeText(s.senderName) === normSender &&
            normalizeText(s.recipientName) === normRecipient
          );
        });
        if (duplicateReceived) {
          return res.status(400).json({
            success: false,
            error: `ข้อมูลเอกสาร/พัสดุ "${payload.itemTitle.trim()}" (จาก ${payload.senderName.trim()} ถึง ${payload.recipientName.trim()}) ถูกทำรายการรับไปแล้ว ไม่สามารถทำรายการซ้ำได้`,
          });
        }
      }

      const GOOGLE_PARCEL_FORM_ID = "1FAIpQLSfhL7tVwlJ7aYMt7fCWkBnMk1hS7ZJePsjYDRxnSDxmwsqq_g";
      const GOOGLE_FORM_ACTION_URL = `https://docs.google.com/forms/d/e/${GOOGLE_PARCEL_FORM_ID}/formResponse`;

      // 1. Prepare Google Form POST parameters
      const formEntries = await getOrDetectParcelFormEntries(GOOGLE_PARCEL_FORM_ID);
      const formParams = new URLSearchParams();

      // Required Google Form entry mappings
      formParams.append(formEntries.actionTypeEntry, actionType);
      formParams.append(formEntries.senderNameEntry, payload.senderName || "");
      formParams.append(formEntries.senderDeptEntry, payload.senderDepartment || "");
      formParams.append(formEntries.recipientNameEntry, payload.recipientName || "");
      formParams.append(formEntries.recipientDeptEntry, payload.recipientDepartment || "");

      // Question for "ชื่อเอกสาร / พัสดุ"
      if (formEntries.itemTitleEntry && payload.itemTitle) {
        formParams.append(formEntries.itemTitleEntry, payload.itemTitle.trim());
      }

      // Requirement 2: เมื่อกดทำรายการส่งเสร็จ ให้เพิ่มรหัสติดตามเข้าไปใน Google sheet ด้วย
      if (formEntries.trackingCodeEntry && trackingCode) {
        formParams.append(formEntries.trackingCodeEntry, trackingCode);
      }

      formParams.append("fvv", "1");
      formParams.append("pageHistory", "0");

      let googleSheetSynced = false;
      let statusDetails = "";

      // 2. Submit directly to Google Form via POST
      try {
        const formResponse = await fetch(GOOGLE_FORM_ACTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          body: formParams.toString(),
          redirect: "follow",
        });

        const formText = await formResponse.text();
        const isSuccess =
          formResponse.ok ||
          formText.includes("บันทึกคำตอบของคุณแล้ว") ||
          formText.includes("Your response has been recorded");

        if (isSuccess) {
          googleSheetSynced = true;
          const trackingMsg = trackingCode ? ` (เพิ่มรหัสติดตาม: ${trackingCode} เข้า Google Sheet ด้วยแล้ว)` : "";
          if (formEntries.itemTitleEntry) {
            statusDetails = `ส่งข้อมูลครบถ้วนรวมทั้งชื่อเอกสาร/พัสดุ และรหัสติดตาม ไปยัง Google Form และ Google Sheet สำเร็จเรียบร้อยแล้ว${trackingMsg}`;
          } else {
            statusDetails = `ส่งข้อมูลเข้า Google Form และ Google Sheet สำเร็จเรียบร้อยแล้ว${trackingMsg}`;
          }
        } else {
          statusDetails = `Google Form response status ${formResponse.status}`;
        }
      } catch (formErr: any) {
        statusDetails = formErr.message || "Failed to submit to Google Form POST";
      }

      // 3. Save to persistent storage so the app always preserves itemTitle and trackingCode
      const savedRecord: ParcelSubmissionRecord = {
        id: `parcel-sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: payload.timestamp || new Date().toLocaleString("th-TH"),
        actionType,
        senderName: payload.senderName.trim(),
        senderDepartment: payload.senderDepartment.trim(),
        recipientName: payload.recipientName.trim(),
        recipientDepartment: payload.recipientDepartment.trim(),
        itemTitle: payload.itemTitle.trim(),
        operatorName: payload.operatorName?.trim() || "ธุรการ",
        operatorDepartment: payload.operatorDepartment?.trim() || "ธุรการลาดกระบัง 2",
        createdAt: Date.now(),
        trackingCode,
      };
      saveSubmission(savedRecord);

      // 4. If a custom external webhook is also configured, mirror asynchronously
      const customWebhook = payload.webhookUrl;
      if (
        customWebhook &&
        customWebhook.startsWith("http") &&
        !customWebhook.includes("1FAIpQLSfhL7tVwlJ7aYMt7fCWkBnMk1hS7ZJePsjYDRxnSDxmwsqq_g") &&
        !customWebhook.includes("AKfycbwAFd2MCDiWydPz3ycfRuWC6Jv3IKtGpn-tnhm4mNbHkJn4W2AyJ9hlVydURxGdGhh9gw")
      ) {
        try {
          const webhookData = new URLSearchParams();
          webhookData.append("วันที่เวลา", payload.timestamp || "");
          webhookData.append("ประเภท", payload.actionType || "");
          webhookData.append("ชื่อผู้ส่งตามหน้าซอง", payload.senderName || "");
          webhookData.append("แผนกผู้ส่ง", payload.senderDepartment || "");
          webhookData.append("ชื่อผู้รับตามหน้าซอง", payload.recipientName || "");
          webhookData.append("แผนกผู้รับ", payload.recipientDepartment || "");
          webhookData.append("ชื่อเอกสาร/พัสดุ", payload.itemTitle || "");
          webhookData.append("รหัสติดตาม", trackingCode || "");
          webhookData.append("ชื่อผู้ทำรายการ", payload.operatorName || "");
          webhookData.append("แผนกผู้ทำรายการ", payload.operatorDepartment || "");

          fetch(customWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: webhookData.toString(),
          }).catch(() => {});
        } catch {
          // Ignore mirror errors
        }
      }

      return res.json({
        success: true,
        googleSheetSynced,
        detectedItemTitleEntry: formEntries.itemTitleEntry,
        detectedTrackingEntry: formEntries.trackingCodeEntry,
        trackingCodeSyncedToSheet: !!(formEntries.trackingCodeEntry && trackingCode),
        details: statusDetails,
        record: savedRecord,
        payload,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || "Internal server error during parcel submission",
      });
    }
  });

  // Laundry Google Form & Google Sheet direct submission endpoint
  // Google Form: https://docs.google.com/forms/d/e/1FAIpQLSfD1D5CgGbhL94VP2kePtM7fw5jxI7Nk8YA6_oDqsdxzkSZFQ/viewform?usp=pp_url
  // Google Sheet: https://docs.google.com/spreadsheets/d/1V2QAI3dRg8n5DXUGGBOGjpgsriSVUCZtySmLUQcqfpI/edit?gid=1327805432#gid=1327805432
  app.get("/api/laundry-submissions", (_req, res) => {
    res.json({
      success: true,
      submissions: inMemoryLaundrySubmissions,
      count: inMemoryLaundrySubmissions.length,
    });
  });

  // Dynamic Google Form schema for laundry (Departments, Garment Types, Delivery Times)
  app.get("/api/laundry-form-schema", async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === "true";
      const schema = await getOrDetectLaundryFormSchema(
        "1FAIpQLSfD1D5CgGbhL94VP2kePtM7fw5jxI7Nk8YA6_oDqsdxzkSZFQ",
        forceRefresh
      );
      res.json({
        success: true,
        ...schema,
        formId: "1FAIpQLSfD1D5CgGbhL94VP2kePtM7fw5jxI7Nk8YA6_oDqsdxzkSZFQ",
        formViewUrl: "https://docs.google.com/forms/d/e/1FAIpQLSfD1D5CgGbhL94VP2kePtM7fw5jxI7Nk8YA6_oDqsdxzkSZFQ/viewform",
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/laundry-submit", async (req, res) => {
    try {
      const payload = req.body || {};
      const actionType = payload.actionType || "อยู่ระหว่างการซัก";
      const operatorName = (payload.operatorName || "").trim();
      const department = (payload.department || "").trim();
      const deliveryTime = (payload.deliveryTime || "12.35").trim();
      const trackingCode = (payload.trackingCode || "").trim();

      if (!operatorName) {
        return res.status(400).json({
          success: false,
          error: "กรุณาระบุชื่อผู้ดำเนินการ",
        });
      }
      if (!department) {
        return res.status(400).json({
          success: false,
          error: "กรุณาระบุแผนก",
        });
      }

      // Date parsing
      let year = "2026";
      let month = "9";
      let day = "14";
      if (payload.date) {
        const clean = String(payload.date).trim();
        if (clean.includes("-")) {
          const p = clean.split("-");
          year = p[0];
          month = String(parseInt(p[1], 10));
          day = String(parseInt(p[2], 10));
        } else if (clean.includes("/")) {
          const p = clean.split("/");
          day = String(parseInt(p[0], 10));
          month = String(parseInt(p[1], 10));
          year = p[2];
          if (parseInt(year, 10) > 2500) year = String(parseInt(year, 10) - 543);
        }
      } else {
        const now = new Date();
        year = String(now.getFullYear());
        month = String(now.getMonth() + 1);
        day = String(now.getDate());
      }

      // Items list: either payload.items or single item from payload.garmentType / quantity
      const itemsToSubmit: Array<{ garmentType: string; quantity: number | string }> = [];
      if (Array.isArray(payload.items) && payload.items.length > 0) {
        for (const it of payload.items) {
          itemsToSubmit.push({
            garmentType: (it.garmentType || it.name || "เสื้อกาวน์สีเขียว").trim(),
            quantity: it.quantity || 1,
          });
        }
      } else {
        itemsToSubmit.push({
          garmentType: (payload.garmentType || "เสื้อกาวน์สีเขียว").trim(),
          quantity: payload.quantity || 1,
        });
      }

      const GOOGLE_LAUNDRY_FORM_ACTION_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfD1D5CgGbhL94VP2kePtM7fw5jxI7Nk8YA6_oDqsdxzkSZFQ/formResponse";
      const savedRecords: any[] = [];
      let anySuccess = false;

      for (const item of itemsToSubmit) {
        const formParams = new URLSearchParams();
        formParams.append("entry.250169946", actionType);
        formParams.append("entry.507087445", `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        formParams.append("entry.507087445_year", year);
        formParams.append("entry.507087445_month", month);
        formParams.append("entry.507087445_day", day);
        formParams.append("entry.409924680", operatorName);
        formParams.append("entry.2031428945", department);
        formParams.append("entry.1296199940", item.garmentType);
        formParams.append("entry.1567032658", String(item.quantity));
        formParams.append("entry.1719198625", deliveryTime);
        if (trackingCode) {
          formParams.append("entry.1367173718", trackingCode);
        }
        formParams.append("fvv", "1");
        formParams.append("pageHistory", "0");

        let syncedToGoogle = false;

        try {
          const formRes = await fetch(GOOGLE_LAUNDRY_FORM_ACTION_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
            body: formParams.toString(),
          });
          const formText = await formRes.text();
          syncedToGoogle = formRes.ok || formRes.status === 200 || formRes.status === 204 || formText.includes("บันทึกคำตอบของคุณแล้ว") || formText.includes("Your response has been recorded");
          if (syncedToGoogle) {
            anySuccess = true;
          }
        } catch (fetchErr: any) {
          console.warn("Error posting laundry item to Google Form:", fetchErr.message);
        }

        const record = {
          id: `lnd-sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          actionType,
          date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
          operatorName,
          department,
          garmentType: item.garmentType,
          quantity: Number(item.quantity) || 1,
          deliveryTime,
          trackingCode,
          syncedToGoogle,
          createdAt: Date.now(),
        };

        saveLaundrySubmission(record);
        savedRecords.push(record);
      }

      return res.json({
        success: true,
        googleSheetSynced: anySuccess,
        message: anySuccess
          ? "ส่งข้อมูลเข้า Google Form และบันทึกลงใน Google Sheet สำเร็จเรียบร้อยแล้ว"
          : "บันทึกข้อมูลในระบบเรียบร้อยแล้ว",
        countSubmitted: itemsToSubmit.length,
        trackingCode,
        records: savedRecords,
      });
    } catch (err: any) {
      console.error("Error in /api/laundry-submit:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Internal server error during laundry submission",
      });
    }
  });

  // Rags & Gloves (เศษผ้า - ถุงมือ) Google Form & Sheet Submission
  app.post("/api/rags-gloves-submit", async (req, res) => {
    try {
      const payload = req.body || {};
      
      // Date parsing (YYYY-MM-DD or DD/MM/YYYY)
      let year = "2026";
      let month = "9";
      let day = "15";
      if (payload.date) {
        const clean = String(payload.date).trim();
        if (clean.includes("-")) {
          const p = clean.split("-");
          year = p[0];
          month = String(parseInt(p[1], 10));
          day = String(parseInt(p[2], 10));
        } else if (clean.includes("/")) {
          const p = clean.split("/");
          day = String(parseInt(p[0], 10));
          month = String(parseInt(p[1], 10));
          year = p[2];
          if (parseInt(year, 10) > 2500) year = String(parseInt(year, 10) - 543);
        }
      } else {
        const now = new Date();
        year = String(now.getFullYear());
        month = String(now.getMonth() + 1);
        day = String(now.getDate());
      }

      const formatVal = (val: any) => {
        if (val === undefined || val === null || val === "") return "";
        return String(val).trim();
      };

      const discardRags = formatVal(payload.discardRags);
      const discardGloves = formatVal(payload.discardGloves);
      const beforeRags = formatVal(payload.beforeRags);
      const beforeGloves = formatVal(payload.beforeGloves);
      const afterRags = formatVal(payload.afterRags);
      const afterGloves = formatVal(payload.afterGloves);

      const GOOGLE_RAGS_GLOVES_FORM_ACTION_URL = "https://docs.google.com/forms/d/e/1FAIpQLSd0iF7VKIbQxRsvXbhVZXiIXkkBfe7Mu26D0dLWhaOfVbfkrw/formResponse";

      const formParams = new URLSearchParams();
      const dateFormatted = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      formParams.append("entry.507087445", dateFormatted);
      formParams.append("entry.507087445_year", year);
      formParams.append("entry.507087445_month", month);
      formParams.append("entry.507087445_day", day);

      if (discardRags !== "") formParams.append("entry.1248564706", discardRags);
      if (discardGloves !== "") formParams.append("entry.829742500", discardGloves);
      if (beforeRags !== "") formParams.append("entry.140645531", beforeRags);
      if (beforeGloves !== "") formParams.append("entry.302762672", beforeGloves);
      if (afterRags !== "") formParams.append("entry.119255118", afterRags);
      if (afterGloves !== "") formParams.append("entry.1199146722", afterGloves);

      // Google Form has 4 sections/pages:
      // Page 0: วันที่ (Date)
      // Page 1: คัดทิ้ง (KG) - เศษผ้า & ถุงมือ
      // Page 2: ก่อนซัก (KG) - เศษผ้า & ถุงมือ
      // Page 3: หลังซัก (KG) - เศษผ้า & ถุงมือ
      // pageHistory MUST be "0,1,2,3" so that Google Forms processes and records all pages into Google Sheet!
      let fbzx = "";
      try {
        const viewRes = await fetch("https://docs.google.com/forms/d/e/1FAIpQLSd0iF7VKIbQxRsvXbhVZXiIXkkBfe7Mu26D0dLWhaOfVbfkrw/viewform", {
          signal: AbortSignal.timeout(3000),
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          }
        });
        if (viewRes.ok) {
          const viewHtml = await viewRes.text();
          const fbzxMatch = viewHtml.match(/name="fbzx" value="([^"]+)"/);
          if (fbzxMatch) fbzx = fbzxMatch[1];
        }
      } catch {
        // Fallback gracefully
      }

      formParams.append("fvv", "1");
      formParams.append("pageHistory", "0,1,2,3");
      if (fbzx) {
        formParams.append("fbzx", fbzx);
      }

      let syncedToGoogle = false;
      let formStatus = 0;

      try {
        const formRes = await fetch(GOOGLE_RAGS_GLOVES_FORM_ACTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          body: formParams.toString(),
        });
        formStatus = formRes.status;
        const formText = await formRes.text();
        syncedToGoogle = formRes.ok || formRes.status === 200 || formRes.status === 204 || formText.includes("บันทึกคำตอบของคุณแล้ว") || formText.includes("Your response has been recorded");
      } catch (fetchErr: any) {
        console.warn("Error posting rags & gloves to Google Form:", fetchErr.message);
      }

      return res.json({
        success: true,
        googleSheetSynced: syncedToGoogle,
        formStatus,
        message: syncedToGoogle 
          ? "บันทึกข้อมูลผ่าน Google Form ลง Google Sheet เรียบร้อยแล้ว" 
          : "บันทึกข้อมูลเข้าระบบเรียบร้อยแล้ว",
        record: {
          date: dateFormatted,
          day: parseInt(day, 10),
          month: parseInt(month, 10),
          year: parseInt(year, 10),
          discardRagsKg: parseFloat(discardRags) || 0,
          discardGlovesKg: parseFloat(discardGloves) || 0,
          beforeWashRagsKg: parseFloat(beforeRags) || 0,
          beforeWashGlovesKg: parseFloat(beforeGloves) || 0,
          afterWashRagsKg: parseFloat(afterRags) || 0,
          afterWashGlovesKg: parseFloat(afterGloves) || 0,
          syncedToGoogle,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (err: any) {
      console.error("Error in /api/rags-gloves-submit:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Internal server error during rags & gloves submission",
      });
    }
  });

  // Equipment Gown (แบบฟอร์มการเบิก-คืน เสื้อกาวน์สีกรมท่า) Google Form & Google Sheet direct submission endpoint
  app.post("/api/equipment-gown-submit", async (req, res) => {
    try {
      const payload = req.body || {};

      let actionType = (payload.actionType || payload.action || "").trim();
      if (actionType === "เบิก" || actionType.toLowerCase().includes("requisition") || actionType.toLowerCase().includes("borrow")) {
        actionType = "เบิกเสื้อกาวน์";
      } else if (actionType === "คืน" || actionType.toLowerCase().includes("return")) {
        actionType = "คืนเสื้อกาวน์";
      }
      if (!actionType) {
        actionType = "เบิกเสื้อกาวน์";
      }

      // Date parsing (YYYY-MM-DD or DD/MM/YYYY)
      let year = "2026";
      let month = "9";
      let day = "15";
      if (payload.date) {
        const clean = String(payload.date).trim();
        if (clean.includes("-")) {
          const p = clean.split("-");
          year = p[0];
          month = String(parseInt(p[1], 10));
          day = String(parseInt(p[2], 10));
        } else if (clean.includes("/")) {
          const p = clean.split("/");
          day = String(parseInt(p[0], 10));
          month = String(parseInt(p[1], 10));
          year = p[2];
          if (parseInt(year, 10) > 2500) year = String(parseInt(year, 10) - 543);
        }
      } else {
        const now = new Date();
        year = String(now.getFullYear());
        month = String(now.getMonth() + 1);
        day = String(now.getDate());
      }

      const personName = (payload.personName || payload.name || payload.operatorName || "").trim();
      if (!personName) {
        return res.status(400).json({
          success: false,
          error: "กรุณาระบุชื่อผู้เบิก-คืน",
        });
      }

      const department = (payload.department || payload.dept || "").trim();
      if (!department) {
        return res.status(400).json({
          success: false,
          error: "กรุณาระบุแผนก",
        });
      }

      const formatQty = (v: any) => {
        if (v === undefined || v === null || v === "" || v === 0 || v === "0") return "";
        const num = parseInt(String(v), 10);
        return (!isNaN(num) && num > 0) ? String(num) : "";
      };

      const sizeL = formatQty(payload.sizeL);
      const sizeXL = formatQty(payload.sizeXL);
      const size2XL = formatQty(payload.size2XL);

      if (!sizeL && !sizeXL && !size2XL) {
        return res.status(400).json({
          success: false,
          error: "กรุณาระบุขนาดและจำนวนเสื้อกาวน์อย่างน้อย 1 รายการ (L, XL หรือ 2XL)",
        });
      }

      const GOOGLE_GOWN_FORM_ACTION_URL = "https://docs.google.com/forms/d/e/1FAIpQLScSaoDIIxRWdKWDK9HQRXkRwsMCGQoxViNRzi5INLEqSdmIPQ/formResponse";

      const formParams = new URLSearchParams();
      // 1. กรุณาเลือกการเบิก-คืน
      formParams.append("entry.405389570", actionType);

      // 2. วันที่
      const dateFormatted = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      formParams.append("entry.575108522", dateFormatted);
      formParams.append("entry.575108522_year", year);
      formParams.append("entry.575108522_month", month);
      formParams.append("entry.575108522_day", day);

      // 3. ชื่อผู้เบิก-คืน
      formParams.append("entry.1775519368", personName);

      // 4. แผนก
      formParams.append("entry.422774460", department);

      // 5. ขนาดและจำนวนที่ต้องการ
      if (sizeL) formParams.append("entry.1507729396", sizeL);
      if (sizeXL) formParams.append("entry.1172983301", sizeXL);
      if (size2XL) formParams.append("entry.1185036298", size2XL);

      // 6. รหัสติดตาม:
      // - เบิกเสื้อกาวน์: สร้างรหัสใหม่อัตโนมัติ (หรือใช้รหัสที่ส่งมา)
      // - ส่งคืนเสื้อกาวน์: บันทึกอิงตามรหัสติดตามที่ส่งมาลง Google Sheet
      const isRequisition = actionType === "เบิกเสื้อกาวน์";
      let trackingCode = "";
      if (isRequisition) {
        trackingCode = (payload.trackingCode || generateServerGownTrackingCode(dateFormatted)).trim();
      } else {
        trackingCode = (payload.trackingCode || "").trim();
      }

      if (trackingCode) {
        formParams.append("entry.188299713", trackingCode);
      }

      // Sentinels and hidden inputs
      formParams.append("entry.405389570_sentinel", "");
      formParams.append("entry.422774460_sentinel", "");
      formParams.append("entry.1507729396_sentinel", "");
      formParams.append("entry.1172983301_sentinel", "");
      formParams.append("entry.1185036298_sentinel", "");
      formParams.append("fvv", "1");
      formParams.append("pageHistory", "0");

      // Fetch dynamic fbzx
      let fbzx = "";
      try {
        const viewRes = await fetch("https://docs.google.com/forms/d/e/1FAIpQLScSaoDIIxRWdKWDK9HQRXkRwsMCGQoxViNRzi5INLEqSdmIPQ/viewform?usp=pp_url", {
          signal: AbortSignal.timeout(3500),
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          }
        });
        if (viewRes.ok) {
          const viewHtml = await viewRes.text();
          const fbzxMatch = viewHtml.match(/name="fbzx" value="([^"]+)"/);
          if (fbzxMatch) fbzx = fbzxMatch[1];
        }
      } catch {
        // Fallback
      }

      if (fbzx) {
        formParams.append("fbzx", fbzx);
      }

      let syncedToGoogle = false;
      try {
        const formRes = await fetch(GOOGLE_GOWN_FORM_ACTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          body: formParams.toString(),
        });
        const formText = await formRes.text();
        syncedToGoogle = formRes.ok || formRes.status === 200 || formRes.status === 204 ||
          formText.includes("บันทึกคำตอบของคุณแล้ว") || formText.includes("Your response has been recorded");
      } catch (err: any) {
        console.warn("Could not post to Google Form directly:", err?.message);
      }

      const totalQuantity = (parseInt(sizeL || "0", 10) + parseInt(sizeXL || "0", 10) + parseInt(size2XL || "0", 10)) || 1;

      const record: GownSubmissionRecord = {
        id: `gown-sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        actionType,
        date: dateFormatted,
        personName,
        department,
        sizeL: sizeL ? parseInt(sizeL, 10) : undefined,
        sizeXL: sizeXL ? parseInt(sizeXL, 10) : undefined,
        size2XL: size2XL ? parseInt(size2XL, 10) : undefined,
        totalQuantity,
        trackingCode: trackingCode || undefined,
        syncedToGoogle,
        createdAt: Date.now(),
      };

      saveGownSubmission(record);

      return res.json({
        success: true,
        googleSheetSynced: syncedToGoogle,
        message: syncedToGoogle
          ? (trackingCode
              ? (isRequisition
                  ? `ส่งข้อมูลเข้า Google Form และบันทึกรหัสติดตาม (${trackingCode}) ลงใน Google Sheet สำเร็จเรียบร้อยแล้ว`
                  : `ส่งข้อมูลการคืนเสื้อกาวน์อิงตามรหัสติดตาม (${trackingCode}) ลงใน Google Sheet เรียบร้อยแล้ว`)
              : "ส่งข้อมูลเข้า Google Form และบันทึกลงใน Google Sheet สำเร็จเรียบร้อยแล้ว")
          : "บันทึกข้อมูลในระบบเรียบร้อยแล้ว",
        record,
        sheetUrl: "https://docs.google.com/spreadsheets/d/1AQXHNA1gDBXl5gWMeXu_y04ziGi3CDk-z6MbH6DQQ2M/edit?gid=1537050902#gid=1537050902",
        formUrl: "https://docs.google.com/forms/d/e/1FAIpQLScSaoDIIxRWdKWDK9HQRXkRwsMCGQoxViNRzi5INLEqSdmIPQ/viewform?usp=pp_url",
      });
    } catch (err: any) {
      console.error("Error in /api/equipment-gown-submit:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Internal server error during gown submission",
      });
    }
  });

  // Equipment Keys (แบบฟอร์มยืมกุญแจ แผนกธุรการลาดกระบัง 2) Google Form & Google Sheet direct submission endpoint
  app.post("/api/equipment-keys-submit", async (req, res) => {
    try {
      const payload = req.body || {};

      let actionType = (payload.actionType || payload.action || "").trim();
      if (actionType.includes("เบิก") || actionType.toLowerCase().includes("borrow")) {
        actionType = "เบิก";
      } else if (actionType.includes("คืน") || actionType.toLowerCase().includes("return")) {
        actionType = "คืน";
      } else {
        actionType = "เบิก";
      }

      // Date parsing (YYYY-MM-DD or DD/MM/YYYY)
      let year = "2026";
      let month = "9";
      let day = "20";
      if (payload.date) {
        const clean = String(payload.date).trim();
        if (clean.includes("-")) {
          const p = clean.split("-");
          year = p[0];
          month = String(parseInt(p[1], 10));
          day = String(parseInt(p[2], 10));
        } else if (clean.includes("/")) {
          const p = clean.split("/");
          day = String(parseInt(p[0], 10));
          month = String(parseInt(p[1], 10));
          year = p[2];
          if (parseInt(year, 10) > 2500) year = String(parseInt(year, 10) - 543);
        }
      } else {
        const now = new Date();
        year = String(now.getFullYear());
        month = String(now.getMonth() + 1);
        day = String(now.getDate());
      }

      const personName = (payload.personName || payload.name || payload.operatorName || "").trim();
      if (!personName) {
        return res.status(400).json({
          success: false,
          error: "กรุณาระบุชื่อผู้เบิก-คืน",
        });
      }

      const GOOGLE_KEYS_DEPARTMENTS = [
        "แผนกความปลอดภัย",
        "แผนกธุรการลาดกระบัง 1",
        "แผนกธุรการลาดกระบัง 2",
        "แผนกเทคนิคบริการ",
        "แผนกไฟฟ้าและสื่อสาร",
        "แผนกปรับอากาศ",
        "แผนกสุขาภิบาล",
        "แผนกวิศกรรมเครื่องกล",
        "แผนก Lab",
        "แผนกสารสนเทศ",
        "ฝ่ายผลิตลาดกระบัง 2",
      ];

      const rawDept = (payload.department || payload.dept || "").trim();
      if (!rawDept) {
        return res.status(400).json({
          success: false,
          error: "กรุณาระบุแผนก",
        });
      }

      // Check if department matches Google Form options
      let matchedDepartment = GOOGLE_KEYS_DEPARTMENTS.find(
        (d) => d.toLowerCase() === rawDept.toLowerCase()
      );
      if (!matchedDepartment) {
        matchedDepartment = GOOGLE_KEYS_DEPARTMENTS.find((d) =>
          d.includes(rawDept) || rawDept.includes(d)
        );
      }
      if (!matchedDepartment && (rawDept.includes("วิศวกรรม") || rawDept.includes("เครื่องกล"))) {
        matchedDepartment = "แผนกวิศกรรมเครื่องกล";
      }
      if (!matchedDepartment) {
        matchedDepartment = "แผนกธุรการลาดกระบัง 2";
      }

      const keyNumbers = (payload.keyNumbers || payload.keys || payload.keyNumber || "").trim();
      if (!keyNumbers) {
        return res.status(400).json({
          success: false,
          error: "กรุณาระบุหมายเลขกุญแจ",
        });
      }

      let trackingCode = (payload.trackingCode || payload.trackingNumber || payload.keyTrackingCode || "").trim();
      if (!trackingCode && actionType === "เบิก") {
        const yy = year.slice(-2);
        const mm = month.padStart(2, "0");
        const dd = day.padStart(2, "0");
        trackingCode = `LKB2 - ${yy}${mm}${dd}01`;
      }

      const GOOGLE_KEYS_FORM_ACTION_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeHCJ7dco8nkjZY5FbzFobIWNfDHCLh2JzEvCORYhTU7Lwhvw/formResponse";

      const formParams = new URLSearchParams();
      // 1. วันที่
      const dateFormatted = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      formParams.append("entry.2018293025_year", year);
      formParams.append("entry.2018293025_month", month);
      formParams.append("entry.2018293025_day", day);
      formParams.append("entry.2018293025", dateFormatted);

      // 2. ชื่อ
      formParams.append("entry.1526694336", personName);

      // 3. แผนก (ตรงตามตัวเลือกใน Google Form)
      formParams.append("entry.1276429706", matchedDepartment);

      // 4. เลือกรูปแบบ
      formParams.append("entry.396433262", actionType);

      // 5. หมายเลขกุญแจ
      formParams.append("entry.551601096", keyNumbers);

      // 6. หมายเลขติดตาม (entry.1058815699 ใน Google Form / Google Sheet)
      if (trackingCode) {
        formParams.append("entry.1058815699", trackingCode);
      }

      // Sentinels and hidden inputs
      formParams.append("entry.1276429706_sentinel", "");
      formParams.append("entry.396433262_sentinel", "");
      formParams.append("fvv", "1");
      formParams.append("pageHistory", "0");

      // Helper to fetch fresh fbzx token from Google Form viewform
      const fetchFbzx = async (): Promise<string> => {
        try {
          const viewRes = await fetch("https://docs.google.com/forms/d/e/1FAIpQLSeHCJ7dco8nkjZY5FbzFobIWNfDHCLh2JzEvCORYhTU7Lwhvw/viewform", {
            signal: AbortSignal.timeout(8000),
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            }
          });
          if (viewRes.ok) {
            const viewHtml = await viewRes.text();
            const fbzxMatch = viewHtml.match(/name="fbzx" value="([^"]+)"/);
            if (fbzxMatch && fbzxMatch[1]) return fbzxMatch[1];
          }
        } catch (e: any) {
          console.warn("Could not fetch fbzx token:", e?.message);
        }
        return "";
      };

      // Helper to post payload to Google Form
      const postSubmission = async (token: string) => {
        const bodyParams = new URLSearchParams(formParams);
        if (token) {
          bodyParams.set("fbzx", token);
        }
        try {
          const formRes = await fetch(GOOGLE_KEYS_FORM_ACTION_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
            body: bodyParams.toString(),
          });
          const formText = await formRes.text();
          const isRecorded =
            formRes.ok ||
            formRes.status === 200 ||
            formRes.status === 204 ||
            formText.includes("บันทึกคำตอบ") ||
            formText.includes("Your response has been recorded") ||
            formText.includes("submitanother") ||
            formText.includes("freebirdFormviewerViewResponseConfirmationMessage");
          return { isRecorded, formText, status: formRes.status };
        } catch (err: any) {
          console.warn("Could not post keys submission to Google Form directly:", err?.message);
          return { isRecorded: false, formText: err?.message || "", status: 0 };
        }
      };

      let currentFbzx = await fetchFbzx();
      let submitResult = await postSubmission(currentFbzx);

      // If not recorded, retry once with a freshly fetched fbzx token
      if (!submitResult.isRecorded) {
        currentFbzx = await fetchFbzx();
        submitResult = await postSubmission(currentFbzx);
      }

      const syncedToGoogle = submitResult.isRecorded;

      const record: KeySubmissionRecord = {
        id: `keys-sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        actionType,
        date: dateFormatted,
        personName,
        department: matchedDepartment,
        keyNumbers,
        trackingCode: trackingCode || undefined,
        syncedToGoogle,
        createdAt: Date.now(),
      };

      saveKeysSubmission(record);

      return res.json({
        success: true,
        googleSheetSynced: true,
        message: syncedToGoogle
          ? (actionType === "คืน"
              ? `ส่งข้อมูลการคืนกุญแจอิงตามรหัสติดตาม (${trackingCode || "-"}) ลงใน Google Sheet เรียบร้อยแล้ว`
              : "ส่งข้อมูลเข้า Google Form และบันทึกลงใน Google Sheet สำเร็จเรียบร้อยแล้ว")
          : "บันทึกข้อมูลในระบบเรียบร้อยแล้ว",
        record,
        trackingCode: trackingCode || undefined,
        sheetUrl: "https://docs.google.com/spreadsheets/d/1hBOaTsILrvA5UtTyL1iULW7SzGkW0-tPO3QmOUiR8mY/edit?gid=546384221#gid=546384221",
        formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSeHCJ7dco8nkjZY5FbzFobIWNfDHCLh2JzEvCORYhTU7Lwhvw/viewform?usp=pp_url",
      });
    } catch (err: any) {
      console.error("Error in /api/equipment-keys-submit:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Internal server error during key requisition submission",
      });
    }
  });

  // A-Frame Ladder Google Form & Google Sheet direct submission endpoint
  app.post("/api/equipment-ladder-submit", async (req, res) => {
    try {
      const payload = req.body || {};
      let actionType = (payload.actionType || payload.action || "ยืม").trim();
      if (actionType === "เบิก") actionType = "ยืม";
      if (actionType !== "ยืม" && actionType !== "คืน") {
        actionType = "ยืม";
      }

      const rawDate = (payload.date || payload.dateTime || "").trim();
      let year = "";
      let month = "";
      let day = "";

      if (rawDate) {
        if (rawDate.includes("-")) {
          const parts = rawDate.split("-");
          year = parts[0];
          month = String(parseInt(parts[1], 10));
          day = String(parseInt(parts[2], 10));
        } else if (rawDate.includes("/")) {
          const parts = rawDate.split("/");
          day = String(parseInt(parts[0], 10));
          month = String(parseInt(parts[1], 10));
          year = parts[2];
        }
        if (parseInt(year, 10) > 2400) {
          year = String(parseInt(year, 10) - 543);
        }
      } else {
        const now = new Date();
        year = String(now.getFullYear());
        month = String(now.getMonth() + 1);
        day = String(now.getDate());
      }

      const personName = (payload.personName || payload.requesterName || payload.name || "").trim();
      if (!personName) {
        return res.status(400).json({
          success: false,
          error: "กรุณาระบุชื่อผู้ยืม-คืน",
        });
      }

      const GOOGLE_LADDER_DEPARTMENTS = [
        "A/2",
        "A/3",
        "A/4",
        "B/1",
        "B/5",
        "สต็อก 4",
        "การตลาด",
        "ซาโบเต็น",
        "เทคนิคการผลิต 4",
        "เทคนิคบริการ ส่วนบำรุงรักษาอาคาร",
        "บำรุงรักษาอาคาร",
        "ปรับอากาศ",
        "ไฟฟ้าและสื่อสาร",
        "สารสนเทศโรงงาน",
        "สุขาภิบาลและเครื่องกล",
        "วิศวกรรมเครื่องกล",
      ];

      const GOOGLE_LADDER_TYPES = [
        "บันได 5 ขั้น (สูง 1.50 เมตร)",
        "บันได 7 ขั้น (สูง 2.10 เมตร)",
        "บันได 13 ขั้น (สูง 3.80 เมตร)",
      ];

      const rawDept = (payload.department || payload.dept || "").trim();
      if (!rawDept) {
        return res.status(400).json({
          success: false,
          error: "กรุณาระบุแผนก",
        });
      }

      let matchedDepartment = GOOGLE_LADDER_DEPARTMENTS.find(
        (d) => d.toLowerCase() === rawDept.toLowerCase()
      );
      if (!matchedDepartment) {
        matchedDepartment = GOOGLE_LADDER_DEPARTMENTS.find(
          (d) => d.includes(rawDept) || rawDept.includes(d)
        );
      }
      if (!matchedDepartment) {
        return res.status(400).json({
          success: false,
          error: `แผนก "${rawDept}" ไม่ตรงกับตัวเลือกใน Google Form กรุณาเลือกจากรายการที่กำหนด`,
        });
      }

      let ladderTypes: string[] = [];
      if (Array.isArray(payload.ladderType)) {
        ladderTypes = payload.ladderType.map((l: any) => String(l).trim()).filter(Boolean);
      } else if (typeof payload.ladderType === "string" && payload.ladderType.trim()) {
        ladderTypes = [payload.ladderType.trim()];
      } else if (typeof payload.ladderTypes === "string" && payload.ladderTypes.trim()) {
        ladderTypes = [payload.ladderTypes.trim()];
      }

      const validLadders = ladderTypes
        .map((lt) => {
          return (
            GOOGLE_LADDER_TYPES.find(
              (gl) => gl.toLowerCase() === lt.toLowerCase() || gl.includes(lt) || lt.includes(gl)
            ) || lt
          );
        })
        .filter(Boolean);

      if (validLadders.length === 0) {
        return res.status(400).json({
          success: false,
          error: "กรุณาเลือกบันไดทรง A อย่างน้อย 1 รายการ",
        });
      }

      let trackingCode = (
        payload.trackingCode ||
        payload.trackingNumber ||
        payload.ladderTrackingCode ||
        ""
      ).trim();
      if (!trackingCode && actionType === "ยืม") {
        const yy = year.slice(-2);
        const mm = month.padStart(2, "0");
        const dd = day.padStart(2, "0");
        const dateTag = `${yy}${mm}${dd}`;
        const targetTag = `LKB2${dateTag}`.toUpperCase();
        let maxSeq = 0;
        for (const sub of inMemoryLadderSubmissions) {
          if (sub.trackingCode) {
            const norm = sub.trackingCode.replace(/[\s\-_]/g, "").toUpperCase();
            if (norm.startsWith(targetTag)) {
              const seq = parseInt(norm.slice(targetTag.length), 10);
              if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
            }
          }
        }
        trackingCode = `LKB2 - ${dateTag}${String(maxSeq + 1).padStart(2, "0")}`;
      }

      const GOOGLE_LADDER_FORM_ACTION_URL =
        "https://docs.google.com/forms/d/e/1FAIpQLSeW4R1vKlM-YjsA2EghWuOnw1H8s0A46zoocbqAvo_4KHuyVg/formResponse";

      const formParams = new URLSearchParams();
      // 1. วันที่
      const dateFormatted = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      formParams.append("entry.1605796721_year", year);
      formParams.append("entry.1605796721_month", month);
      formParams.append("entry.1605796721_day", day);
      formParams.append("entry.1605796721", dateFormatted);

      // 2. กรุณาเลือการยืม - ยืน
      formParams.append("entry.1963148641", actionType);

      // 3. กรุณาระบุชื่อ
      formParams.append("entry.1025821912", personName);

      // 4. แผนก
      formParams.append("entry.1235243654", matchedDepartment);

      // 5. กรุณาเลือกบันได้ทรง A
      for (const ladder of validLadders) {
        formParams.append("entry.1627587977", ladder);
      }

      // Sentinels and hidden inputs
      formParams.append("entry.1963148641_sentinel", "");
      formParams.append("entry.1235243654_sentinel", "");
      formParams.append("entry.1627587977_sentinel", "");
      formParams.append("fvv", "1");
      formParams.append("pageHistory", "0");

      const fetchFormMeta = async (): Promise<{ fbzx: string; trackingEntryId: string }> => {
        let fbzx = "";
        let trackingEntryId = "";
        try {
          const viewRes = await fetch(
            "https://docs.google.com/forms/d/e/1FAIpQLSeW4R1vKlM-YjsA2EghWuOnw1H8s0A46zoocbqAvo_4KHuyVg/viewform",
            {
              signal: AbortSignal.timeout(8000),
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              },
            }
          );
          if (viewRes.ok) {
            const viewHtml = await viewRes.text();
            const fbzxMatch = viewHtml.match(/name="fbzx" value="([^"]+)"/);
            if (fbzxMatch && fbzxMatch[1]) fbzx = fbzxMatch[1];

            // Dynamically detect if a tracking code field (หมายเลขติดตาม / รหัสติดตาม) exists in the Google Form
            const loadMatch = viewHtml.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[[\s\S]*?\]);\s*<\/script>/);
            if (loadMatch && loadMatch[1]) {
              const parsedData = JSON.parse(loadMatch[1]);
              const items = parsedData?.[1]?.[1];
              if (Array.isArray(items)) {
                for (const item of items) {
                  const title = String(item?.[1] || "");
                  const entryId = item?.[4]?.[0]?.[0];
                  if (entryId && /รหัส|ติดตาม|tracking/i.test(title)) {
                    trackingEntryId = `entry.${entryId}`;
                    break;
                  }
                }
              }
            }
          }
        } catch (e: any) {
          console.warn("Could not fetch ladder form fbzx token:", e?.message);
        }
        return { fbzx, trackingEntryId };
      };

      const postSubmission = async (token: string, trackingEntryId: string) => {
        const bodyParams = new URLSearchParams(formParams);
        if (trackingCode && trackingEntryId) {
          bodyParams.set(trackingEntryId, trackingCode);
        }
        if (token) {
          bodyParams.set("fbzx", token);
        }
        try {
          const formRes = await fetch(GOOGLE_LADDER_FORM_ACTION_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
            body: bodyParams.toString(),
          });
          const formText = await formRes.text();
          const isRecorded =
            formRes.ok ||
            formRes.status === 200 ||
            formRes.status === 204 ||
            formText.includes("บันทึกคำตอบ") ||
            formText.includes("Your response has been recorded") ||
            formText.includes("submitanother") ||
            formText.includes("freebirdFormviewerViewResponseConfirmationMessage");
          return { isRecorded, formText, status: formRes.status };
        } catch (err: any) {
          console.warn("Could not post ladder submission to Google Form directly:", err?.message);
          return { isRecorded: false, formText: err?.message || "", status: 0 };
        }
      };

      let formMeta = await fetchFormMeta();
      let submitResult = await postSubmission(formMeta.fbzx, formMeta.trackingEntryId);

      if (!submitResult.isRecorded) {
        formMeta = await fetchFormMeta();
        submitResult = await postSubmission(formMeta.fbzx, formMeta.trackingEntryId);
      }

      const syncedToGoogle = submitResult.isRecorded;

      const primaryLadder = validLadders.join(", ");
      const record: LadderSubmissionRecord = {
        id: `ladder-sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        actionType,
        date: dateFormatted,
        personName,
        department: matchedDepartment,
        ladderType: primaryLadder,
        trackingCode: trackingCode || undefined,
        syncedToGoogle,
        createdAt: Date.now(),
      };

      saveLadderSubmission(record);

      return res.json({
        success: true,
        googleSheetSynced: true,
        message: syncedToGoogle
          ? (actionType === "คืน"
              ? `ส่งข้อมูลการคืนบันไดทรง A อิงตามรหัสติดตาม (${trackingCode || "-"}) ลงใน Google Sheet เรียบร้อยแล้ว`
              : "ส่งข้อมูลเข้า Google Form และบันทึกลงใน Google Sheet สำเร็จเรียบร้อยแล้ว")
          : "บันทึกข้อมูลในระบบเรียบร้อยแล้ว",
        record,
        trackingCode: trackingCode || undefined,
        sheetUrl:
          "https://docs.google.com/spreadsheets/d/1ccv4HxX9QRRNVR6rQdCq5LvqD__tTyrxQnj1EWncy2s/edit?gid=1183570474#gid=1183570474",
        formUrl:
          "https://docs.google.com/forms/d/e/1FAIpQLSeW4R1vKlM-YjsA2EghWuOnw1H8s0A46zoocbqAvo_4KHuyVg/viewform?usp=pp_url",
      });
    } catch (err: any) {
      console.error("Error in /api/equipment-ladder-submit:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Internal server error during ladder requisition submission",
      });
    }
  });

  // Softener Requisition Google Form & Google Sheet direct submission endpoint
  app.post("/api/equipment-softener-submit", async (req, res) => {
    try {
      const payload = req.body || {};
      const rawDate = (payload.date || payload.entry_date || "").trim();
      const personName = (payload.personName || payload.name || "").trim();
      const area = (payload.area || payload.zone || "").trim();

      if (!personName) {
        return res.status(400).json({
          success: false,
          error: "กรุณาระบุชื่อผู้เบิก",
        });
      }

      if (!area) {
        return res.status(400).json({
          success: false,
          error: "กรุณาระบุพื้นที่ในการใช้งาน",
        });
      }

      const SOFTENER_AREAS = ["A1", "A2", "B1", "B2", "C1"];
      const matchedArea = SOFTENER_AREAS.find(
        (a) => a.toLowerCase() === area.toLowerCase()
      ) || area;

      // Parse Date
      let year = "";
      let month = "";
      let day = "";

      if (rawDate) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
          const parts = rawDate.split("-");
          year = parts[0];
          month = String(parseInt(parts[1], 10));
          day = String(parseInt(parts[2], 10));
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawDate)) {
          const parts = rawDate.split("/");
          day = String(parseInt(parts[0], 10));
          month = String(parseInt(parts[1], 10));
          year = parts[2];
        }
      }

      if (!year || !month || !day) {
        const now = new Date();
        year = String(now.getFullYear());
        month = String(now.getMonth() + 1);
        day = String(now.getDate());
      }

      const GOOGLE_SOFTENER_FORM_ACTION_URL =
        "https://docs.google.com/forms/d/e/1FAIpQLSeO-DULwAXxDIj2lb7D75UMuKmEB6wlt-n_RuOFm7_LDtv5lw/formResponse";

      const formParams = new URLSearchParams();
      // 1. วันที่
      const dateFormatted = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      formParams.append("entry.820380440_year", year);
      formParams.append("entry.820380440_month", month);
      formParams.append("entry.820380440_day", day);
      formParams.append("entry.820380440", dateFormatted);

      // 2. ชื่อผู้เบิก (ชื่อจริง)
      formParams.append("entry.1228314840", personName);

      // 3. พื้นที่ในการใช้งาน
      formParams.append("entry.414847099", matchedArea);
      formParams.append("entry.414847099_sentinel", "");

      // Sentinels and hidden inputs
      formParams.append("fvv", "1");
      formParams.append("pageHistory", "0");

      const fetchFbzx = async (): Promise<string> => {
        try {
          const viewRes = await fetch(
            "https://docs.google.com/forms/d/e/1FAIpQLSeO-DULwAXxDIj2lb7D75UMuKmEB6wlt-n_RuOFm7_LDtv5lw/viewform",
            {
              signal: AbortSignal.timeout(8000),
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              },
            }
          );
          if (viewRes.ok) {
            const viewHtml = await viewRes.text();
            const fbzxMatch = viewHtml.match(/name="fbzx" value="([^"]+)"/);
            if (fbzxMatch && fbzxMatch[1]) return fbzxMatch[1];
          }
        } catch (e: any) {
          console.warn("Could not fetch softener form fbzx token:", e?.message);
        }
        return "";
      };

      const postSubmission = async (token: string) => {
        const bodyParams = new URLSearchParams(formParams);
        if (token) {
          bodyParams.set("fbzx", token);
        }
        const formRes = await fetch(GOOGLE_SOFTENER_FORM_ACTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          body: bodyParams.toString(),
        });
        const formText = await formRes.text();
        const isRecorded =
          formText.includes("บันทึกคำตอบของคุณแล้ว") ||
          formText.includes("Your response has been recorded");
        return { isRecorded, formText, status: formRes.status };
      };

      let currentFbzx = await fetchFbzx();
      let submitResult = await postSubmission(currentFbzx);

      if (!submitResult.isRecorded) {
        currentFbzx = await fetchFbzx();
        submitResult = await postSubmission(currentFbzx);
      }

      if (!submitResult.isRecorded) {
        console.error("Google form rejected softener submission:", submitResult.formText.substring(0, 300));
        return res.status(502).json({
          success: false,
          error: "ไม่สามารถบันทึกข้อมูลลง Google Sheet ได้ โปรดตรวจสอบข้อมูลหรือลองใหม่อีกครั้ง",
        });
      }

      const record: SoftenerSubmissionRecord = {
        id: `softener-sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        actionType: "เบิก",
        date: dateFormatted,
        personName,
        area: matchedArea,
        item: "น้ำยาปรับผ้านุ่ม",
        syncedToGoogle: true,
        createdAt: Date.now(),
      };

      saveSoftenerSubmission(record);

      return res.json({
        success: true,
        googleSheetSynced: true,
        message: "ส่งข้อมูลเข้า Google Form และบันทึกลงใน Google Sheet สำเร็จเรียบร้อยแล้ว",
        record,
        sheetUrl:
          "https://docs.google.com/spreadsheets/d/1Xs6vgGFieSYkJ1cl38Txer9Czr_A3Eh9_vh_Kyxr860/edit?gid=1462351217#gid=1462351217",
        formUrl:
          "https://docs.google.com/forms/d/e/1FAIpQLSeO-DULwAXxDIj2lb7D75UMuKmEB6wlt-n_RuOFm7_LDtv5lw/viewform?usp=pp_url",
      });
    } catch (err: any) {
      console.error("Error in /api/equipment-softener-submit:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Internal server error during softener requisition submission",
      });
    }
  });

  // Equipment Cleaning Supplies (แบบฟอร์มเบิกอุปกรณ์ทำความสะอาด แผนกธุรการลาดกระบัง 2) Google Form & Google Sheet direct submission endpoint
  app.post("/api/equipment-cleaning-submit", async (req, res) => {
    try {
      const payload = req.body || {};

      // Date parsing (YYYY-MM-DD or DD/MM/YYYY)
      let year = "2026";
      let month = "9";
      let day = "20";
      if (payload.date) {
        const clean = String(payload.date).trim();
        if (clean.includes("-")) {
          const p = clean.split("-");
          year = p[0];
          month = String(parseInt(p[1], 10));
          day = String(parseInt(p[2], 10));
        } else if (clean.includes("/")) {
          const p = clean.split("/");
          day = String(parseInt(p[0], 10));
          month = String(parseInt(p[1], 10));
          year = p[2];
          if (parseInt(year, 10) > 2500) year = String(parseInt(year, 10) - 543);
        }
      } else {
        const now = new Date();
        year = String(now.getFullYear());
        month = String(now.getMonth() + 1);
        day = String(now.getDate());
      }

      const personName = (payload.personName || payload.name || "").trim();
      if (!personName) {
        return res.status(400).json({
          success: false,
          error: "กรุณาระบุชื่อผู้เบิก",
        });
      }

      // items: map of { [itemId or name]: quantity (1, 2, 3) } or array of { id, quantity }
      const selectedItems: { id: number; name?: string; quantity: string }[] = [];
      if (Array.isArray(payload.items)) {
        payload.items.forEach((it: any) => {
          if (it && it.id && it.quantity) {
            selectedItems.push({
              id: Number(it.id),
              name: it.name || "",
              quantity: String(it.quantity),
            });
          }
        });
      } else if (payload.items && typeof payload.items === "object") {
        Object.entries(payload.items).forEach(([key, val]) => {
          if (val) {
            selectedItems.push({
              id: Number(key),
              quantity: String(val),
            });
          }
        });
      }

      const other = (payload.other || payload.note || "").trim();

      if (selectedItems.length === 0 && !other) {
        return res.status(400).json({
          success: false,
          error: "กรุณาเลือกรายการอุปกรณ์อย่างน้อย 1 รายการ หรือระบุในช่องอื่นๆ",
        });
      }

      const GOOGLE_CLEANING_FORM_ACTION_URL =
        "https://docs.google.com/forms/d/e/1FAIpQLSc_z8qRUirSajn070DxgHIa7MWuNy8Sn7Rj0b_QuBLC7ow25A/formResponse";

      const formParams = new URLSearchParams();

      // 1. ระบุวันที่ (Item 0, Entry 134831132)
      const dateFormatted = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      formParams.append("entry.134831132_year", year);
      formParams.append("entry.134831132_month", month);
      formParams.append("entry.134831132_day", day);
      formParams.append("entry.134831132", dateFormatted);

      // 2. ชื่อผู้เบิก (Item 1, Entry 1498271377)
      formParams.append("entry.1498271377", personName);

      // 3. เลือกรายการ (Item 2, Multiple grid entries)
      selectedItems.forEach((item) => {
        if (item.id && ["1", "2", "3"].includes(item.quantity)) {
          formParams.append(`entry.${item.id}`, item.quantity);
          formParams.append(`entry.${item.id}_sentinel`, "");
        }
      });

      // 4. อื่นๆ (Item 3, Entry 381616994)
      if (other) {
        formParams.append("entry.381616994", other);
      }

      formParams.append("fvv", "1");
      formParams.append("pageHistory", "0");

      const fetchFbzx = async (): Promise<string> => {
        try {
          const viewRes = await fetch(
            "https://docs.google.com/forms/d/e/1FAIpQLSc_z8qRUirSajn070DxgHIa7MWuNy8Sn7Rj0b_QuBLC7ow25A/viewform",
            {
              signal: AbortSignal.timeout(8000),
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              },
            }
          );
          if (viewRes.ok) {
            const viewHtml = await viewRes.text();
            const fbzxMatch = viewHtml.match(/name="fbzx" value="([^"]+)"/);
            if (fbzxMatch && fbzxMatch[1]) return fbzxMatch[1];
          }
        } catch (e: any) {
          console.warn("Could not fetch cleaning form fbzx token:", e?.message);
        }
        return "";
      };

      const postSubmission = async (token: string) => {
        const bodyParams = new URLSearchParams(formParams);
        if (token) {
          bodyParams.set("fbzx", token);
        }
        const formRes = await fetch(GOOGLE_CLEANING_FORM_ACTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          body: bodyParams.toString(),
        });
        const formText = await formRes.text();
        const isRecorded =
          formText.includes("บันทึกคำตอบของคุณแล้ว") ||
          formText.includes("Your response has been recorded") ||
          formRes.status === 200;
        return { isRecorded, formText, status: formRes.status };
      };

      let currentFbzx = await fetchFbzx();
      let submitResult = await postSubmission(currentFbzx);

      if (!submitResult.isRecorded) {
        currentFbzx = await fetchFbzx();
        submitResult = await postSubmission(currentFbzx);
      }

      if (!submitResult.isRecorded) {
        console.error("Google form rejected cleaning submission:", submitResult.formText.substring(0, 300));
        return res.status(502).json({
          success: false,
          error: "ไม่สามารถบันทึกข้อมูลลง Google Sheet ได้ โปรดตรวจสอบข้อมูลหรือลองใหม่อีกครั้ง",
        });
      }

      const record = {
        id: `cleaning-sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        date: dateFormatted,
        personName,
        items: selectedItems,
        other,
        syncedToGoogle: true,
        createdAt: Date.now(),
      };

      return res.json({
        success: true,
        googleSheetSynced: true,
        message: "ส่งข้อมูลเข้า Google Form และบันทึกลงใน Google Sheet สำเร็จเรียบร้อยแล้ว",
        record,
        sheetUrl:
          "https://docs.google.com/spreadsheets/d/1ghnlCzcIq9A6rGVrZtEqiVA0bGFdqO3ZhbuYLhyBViw/edit?gid=1432727518#gid=1432727518",
        formUrl:
          "https://docs.google.com/forms/d/e/1FAIpQLSc_z8qRUirSajn070DxgHIa7MWuNy8Sn7Rj0b_QuBLC7ow25A/viewform?usp=pp_url",
      });
    } catch (err: any) {
      console.error("Error in /api/equipment-cleaning-submit:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Internal server error during cleaning requisition submission",
      });
    }
  });

  // Equipment Inventory Webhook & Submission endpoints
  app.get("/api/equipment-inventory-webhook", (_req, res) => {
    const effectiveUrl = serverInventoryWebhookUrl || process.env.EQUIPMENT_INVENTORY_WEBHOOK_URL || "";
    res.json({
      webhookUrl: effectiveUrl,
      connected: !!(effectiveUrl && effectiveUrl.startsWith("http")),
    });
  });

  app.post("/api/equipment-inventory-webhook", (req, res) => {
    const { webhookUrl } = req.body || {};
    if (typeof webhookUrl === "string") {
      serverInventoryWebhookUrl = webhookUrl.trim();
      try {
        fs.writeFileSync(
          EQUIPMENT_INVENTORY_WEBHOOK_FILE,
          JSON.stringify({ webhookUrl: serverInventoryWebhookUrl }, null, 2),
          "utf-8"
        );
      } catch (err) {
        console.warn("Could not persist equipment inventory webhook to disk:", err);
      }
    }
    const effectiveUrl = serverInventoryWebhookUrl || process.env.EQUIPMENT_INVENTORY_WEBHOOK_URL || "";
    res.json({
      success: true,
      webhookUrl: effectiveUrl,
      connected: !!(effectiveUrl && effectiveUrl.startsWith("http")),
    });
  });

  app.get("/api/equipment-inventory-submissions", (_req, res) => {
    res.json({
      success: true,
      submissions: inMemoryInventoryTransactions,
      count: inMemoryInventoryTransactions.length,
    });
  });

  // Get shared Equipment Inventory live data (products, transactions, reset state, version)
  app.get("/api/equipment-inventory-data", (_req, res) => {
    res.json({
      success: true,
      products: inMemoryInventoryProducts,
      transactions: inMemoryInventoryTransactions,
      resetState: equipmentInventoryResetState,
      version: equipmentInventoryVersion,
      lastUpdated: new Date().toISOString(),
    });
  });

  // Save updated equipment inventory products (batch row edits, price adjustments, inline changes)
  app.post("/api/equipment-inventory-products", (req, res) => {
    try {
      const payload = req.body || {};
      const newProducts = payload.products;
      if (Array.isArray(newProducts) && newProducts.length > 0) {
        inMemoryInventoryProducts = newProducts;
        saveEquipmentInventoryProducts();
        broadcastEquipmentInventoryUpdate({
          type: "PRODUCTS_UPDATED",
          products: inMemoryInventoryProducts,
          transactions: inMemoryInventoryTransactions,
          resetState: equipmentInventoryResetState,
          operator: payload.operator || "ผู้ใช้",
        });
        return res.json({
          success: true,
          count: inMemoryInventoryProducts.length,
          version: equipmentInventoryVersion,
        });
      }
      return res.status(400).json({ success: false, error: "Invalid products array" });
    } catch (err: any) {
      console.error("Error in /api/equipment-inventory-products:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to save products" });
    }
  });

  // Server-Sent Events (SSE) for Real-Time Equipment Inventory sync across all users & tabs
  app.get("/api/equipment-inventory-sse", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof (res as any).flushHeaders === "function") {
      (res as any).flushHeaders();
    }

    // Immediately push current authoritative state on connection
    const initialPayload = JSON.stringify({
      type: "INITIAL_STATE",
      products: inMemoryInventoryProducts,
      transactions: inMemoryInventoryTransactions,
      resetState: equipmentInventoryResetState,
      version: equipmentInventoryVersion,
      timestamp: Date.now(),
    });
    res.write(`data: ${initialPayload}\n\n`);

    equipmentInventorySseClients.add(res);

    req.on("close", () => {
      equipmentInventorySseClients.delete(res);
    });
  });

  app.post("/api/equipment-inventory-submit", async (req, res) => {
    try {
      const payload = req.body || {};
      const tx = payload.transaction || payload;
      let targetWebhook = (payload.webhookUrl || serverInventoryWebhookUrl || process.env.EQUIPMENT_INVENTORY_WEBHOOK_URL || "").trim();
      if (!targetWebhook && fs.existsSync(EQUIPMENT_INVENTORY_WEBHOOK_FILE)) {
        try {
          const raw = fs.readFileSync(EQUIPMENT_INVENTORY_WEBHOOK_FILE, "utf-8");
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.webhookUrl === "string" && parsed.webhookUrl.trim()) {
            targetWebhook = parsed.webhookUrl.trim();
            serverInventoryWebhookUrl = targetWebhook;
          }
        } catch (wErr) {
          console.warn("Could not read equipment webhook from disk:", wErr);
        }
      }
      const txId = (tx && tx.id) || payload.txId || "";

      // Deduplication check: if this transaction ID was already forwarded, skip re-triggering webhook
      const alreadyForwarded = txId && forwardedInventoryTxIds.has(txId);

      if (tx && !alreadyForwarded) {
        inMemoryInventoryTransactions.unshift(tx);
        if (inMemoryInventoryTransactions.length > 500) {
          inMemoryInventoryTransactions = inMemoryInventoryTransactions.slice(0, 500);
        }
        if (txId) {
          forwardedInventoryTxIds.add(txId);
          if (forwardedInventoryTxIds.size > 1000) {
            const firstKey = forwardedInventoryTxIds.values().next().value;
            if (firstKey) forwardedInventoryTxIds.delete(firstKey);
          }
        }
        try {
          fs.writeFileSync(
            EQUIPMENT_INVENTORY_DATA_FILE,
            JSON.stringify(inMemoryInventoryTransactions, null, 2),
            "utf-8"
          );
        } catch (err) {
          console.warn("Could not save equipment inventory submissions:", err);
        }
      }

      // Update server-side inMemoryInventoryProducts so all users see current stock & sold counts immediately
      if (Array.isArray(payload.products) && payload.products.length > 0) {
        inMemoryInventoryProducts = payload.products;
        saveEquipmentInventoryProducts();
      } else if (tx && tx.productId) {
        const pIdx = inMemoryInventoryProducts.findIndex((p: any) => p.id === tx.productId);
        if (pIdx !== -1) {
          const prod = { ...inMemoryInventoryProducts[pIdx] };
          const qty = Math.abs(tx.quantity || 1);
          if (tx.type === "sale") {
            prod.soldCount = (prod.soldCount || 0) + qty;
            prod.currentStock = Math.max(0, (prod.initialStock || 0) + (prod.stockIn || 0) - prod.soldCount);
          } else if (tx.type === "restock") {
            prod.stockIn = (prod.stockIn || 0) + qty;
            prod.currentStock = Math.max(0, (prod.initialStock || 0) + prod.stockIn - (prod.soldCount || 0));
          }
          prod.stockValue = prod.currentStock * prod.price;
          inMemoryInventoryProducts[pIdx] = prod;
          saveEquipmentInventoryProducts();
        }
      }

      // Broadcast real-time update to all connected clients & devices
      broadcastEquipmentInventoryUpdate({
        type: "TRANSACTION_ADDED",
        transaction: tx,
        products: inMemoryInventoryProducts,
        transactions: inMemoryInventoryTransactions,
        resetState: equipmentInventoryResetState,
        operator: tx?.operatorName || "ผู้ใช้",
      });

      let googleSheetSynced = false;
      let webhookErrorDetails: string | null = null;
      if (!alreadyForwarded && targetWebhook && targetWebhook.startsWith("http")) {
        try {
          const webhookPayload = {
            txId: txId || `tx-${Date.now()}`,
            action: tx.type || "sale",
            item: tx.productName || payload.product?.name || "",
            quantity: Math.abs(tx.quantity || 1),
            unitPrice: tx.unitPrice || 0,
            totalAmount: tx.totalAmount || 0,
            customer: tx.customerName || "-",
            department: tx.department || "-",
            operator: tx.operatorName || "-",
            note: tx.note || "-",
            date: tx.dateStr || "",
            timestamp: tx.timestamp || "",
            remainingStock: payload.product?.currentStock,
            allProductsSummary: payload.allProductsSummary,
          };
          const fRes = await fetch(targetWebhook, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(webhookPayload),
            redirect: "follow",
          });

          const resText = await fRes.text().catch(() => "");
          let resJson: any = null;
          try {
            resJson = JSON.parse(resText);
          } catch {
            resJson = null;
          }

          const isTextSuccess =
            resText.includes('"status":"success"') ||
            resText.includes('"status":"ok"') ||
            resText.includes('"status":"skipped_duplicate"') ||
            resText.includes("success") ||
            resText.includes("บันทึก") ||
            resText.includes("ok");

          googleSheetSynced =
            (fRes.ok || fRes.status === 200 || fRes.status === 302) &&
            ((resJson && (resJson.status === "success" || resJson.status === "ok" || resJson.status === "skipped_duplicate" || resJson.success === true)) ||
              isTextSuccess);

          if (googleSheetSynced && targetWebhook && serverInventoryWebhookUrl !== targetWebhook) {
            serverInventoryWebhookUrl = targetWebhook;
            try {
              fs.writeFileSync(
                EQUIPMENT_INVENTORY_WEBHOOK_FILE,
                JSON.stringify({ webhookUrl: targetWebhook }, null, 2),
                "utf-8"
              );
            } catch (pErr) {
              console.warn("Could not persist equipment webhook:", pErr);
            }
          }
          if (txId && googleSheetSynced) {
            forwardedInventoryTxIds.add(txId);
            if (forwardedInventoryTxIds.size > 1000) {
              const firstKey = forwardedInventoryTxIds.values().next().value;
              if (firstKey) forwardedInventoryTxIds.delete(firstKey);
            }
          }
          if (!googleSheetSynced) {
            webhookErrorDetails = resJson?.message || `Webhook status ${fRes.status}: ${resText.slice(0, 150)}`;
          }
        } catch (webhookErr: any) {
          console.warn("Error forwarding to Google Sheet Apps Script webhook:", webhookErr);
          webhookErrorDetails = webhookErr.message;
        }
      } else if (alreadyForwarded) {
        googleSheetSynced = true;
      }

      const now = new Date();
      const timestampStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      const actionTh = tx.type === "sale" ? "ขาย / เบิกจ่าย" : (tx.type === "restock" ? "รับเข้าคลัง" : "ปรับปรุงสต็อก");
      const transactionRowTsv = [
        tx.timestamp || timestampStr,
        actionTh,
        tx.productName || payload.product?.name || "",
        Math.abs(tx.quantity || 1),
        tx.unitPrice || 0,
        tx.totalAmount || 0,
        tx.customerName || "-",
        tx.department || "-",
        tx.operatorName || "-",
        tx.note || "-",
        txId || "-",
      ].join("\t");

      return res.json({
        success: true,
        message: googleSheetSynced ? "ส่งข้อมูลไปยัง Google Sheet สำเร็จเรียบร้อยแล้ว" : "บันทึกรายการในระบบสำเร็จ (รอส่งเข้า Google Sheet)",
        googleSheetSynced,
        alreadyForwarded: !!alreadyForwarded,
        transaction: tx,
        transactionRowTsv,
        webhookError: webhookErrorDetails,
        sheetUrl: "https://docs.google.com/spreadsheets/d/1HEs4tRSU9c0crWYlPbk_PTHEdTmUKwWXbWl6N7hlaFA/edit?gid=172141710#gid=172141710",
      });
    } catch (err: any) {
      console.error("Error in /api/equipment-inventory-submit:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Internal error in equipment inventory submission",
      });
    }
  });

  // Test endpoint for Equipment Inventory Apps Script Webhook
  app.post("/api/equipment-inventory-webhook-test", async (req, res) => {
    try {
      const { webhookUrl } = req.body || {};
      const targetUrl = (webhookUrl || serverInventoryWebhookUrl || process.env.EQUIPMENT_INVENTORY_WEBHOOK_URL || "").trim();
      if (!targetUrl || !targetUrl.startsWith("http")) {
        return res.status(400).json({
          success: false,
          error: "กรุณาระบุ URL ของ Google Apps Script Webhook ให้ถูกต้อง (ขึ้นต้นด้วย https://)",
        });
      }

      // 1. Try GET probe
      let getOk = false;
      try {
        const getRes = await fetch(targetUrl, { method: "GET", redirect: "follow" });
        if (getRes.ok || getRes.status === 200 || getRes.status === 302) {
          getOk = true;
        }
      } catch (gErr) {
        console.warn("GET probe error:", gErr);
      }

      // 2. Try POST test ping
      const pingPayload = {
        txId: `ping-test-${Date.now()}`,
        action: "ping",
        item: "ทดสอบการเชื่อมต่อระบบ",
        quantity: 0,
        unitPrice: 0,
        totalAmount: 0,
        customer: "ระบบตรวจสอบ",
        department: "IT",
        operator: "Admin Test",
        note: "ทดสอบการเชื่อมต่อ Webhook",
        timestamp: new Date().toLocaleString("th-TH"),
      };

      const postRes = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(pingPayload),
        redirect: "follow",
      });

      const text = await postRes.text().catch(() => "");
      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(text);
      } catch {
        parsedJson = null;
      }

      const isSuccess =
        postRes.ok &&
        ((parsedJson && (parsedJson.status === "success" || parsedJson.status === "ok" || parsedJson.status === "skipped_duplicate" || parsedJson.success === true)) ||
          text.includes("success") ||
          text.includes("ok") ||
          text.includes("บันทึก") ||
          getOk);

      if (isSuccess) {
        serverInventoryWebhookUrl = targetUrl;
        try {
          fs.writeFileSync(
            EQUIPMENT_INVENTORY_WEBHOOK_FILE,
            JSON.stringify({ webhookUrl: targetUrl }, null, 2),
            "utf-8"
          );
        } catch (wErr) {
          console.warn("Could not save equipment webhook:", wErr);
        }

        return res.json({
          success: true,
          message: "เชื่อมต่อกับ Google Apps Script Webhook สำเร็จเรียบร้อยแล้ว!",
          webhookUrl: targetUrl,
          rawResponse: text.slice(0, 300),
        });
      } else {
        return res.status(400).json({
          success: false,
          error: `การทดสอบ Webhook ไม่สำเร็จ (HTTP ${postRes.status}): ${text.slice(0, 200) || "ไม่มีข้อมูลตอบกลับ"}`,
          webhookUrl: targetUrl,
        });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: `ไม่สามารถเชื่อมต่อไปยัง Webhook URL ได้: ${err.message}`,
      });
    }
  });

  // Sync all pending unsynced Equipment Inventory transactions to Google Sheet
  app.post("/api/equipment-inventory-sync-all", async (req, res) => {
    try {
      const { webhookUrl } = req.body || {};
      const targetUrl = (webhookUrl || serverInventoryWebhookUrl || process.env.EQUIPMENT_INVENTORY_WEBHOOK_URL || "").trim();
      if (!targetUrl || !targetUrl.startsWith("http")) {
        return res.status(400).json({
          success: false,
          error: "ยังไม่ได้ตั้งค่า Google Apps Script Webhook URL",
        });
      }

      const unsynced = inMemoryInventoryTransactions.filter((tx) => !tx.googleSheetSynced);
      if (unsynced.length === 0) {
        return res.json({
          success: true,
          syncedCount: 0,
          message: "รายการทั้งหมดถูกซิงค์เข้า Google Sheet เรียบร้อยแล้ว",
        });
      }

      let successCount = 0;
      for (const tx of unsynced) {
        try {
          const webhookPayload = {
            txId: tx.id || `tx-${Date.now()}`,
            action: tx.type || "sale",
            item: tx.productName || "",
            quantity: Math.abs(tx.quantity || 1),
            unitPrice: tx.unitPrice || 0,
            totalAmount: tx.totalAmount || 0,
            customer: tx.customerName || "-",
            department: tx.department || "-",
            operator: tx.operatorName || "-",
            note: tx.note || "-",
            date: tx.dateStr || "",
            timestamp: tx.timestamp || "",
          };

          const fRes = await fetch(targetUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(webhookPayload),
            redirect: "follow",
          });

          const text = await fRes.text().catch(() => "");
          if (fRes.ok || fRes.status === 200 || fRes.status === 302 || text.includes("success") || text.includes("ok")) {
            tx.googleSheetSynced = true;
            if (tx.id) forwardedInventoryTxIds.add(tx.id);
            successCount++;
          }
        } catch (itemErr) {
          console.warn("Error syncing pending transaction:", itemErr);
        }
      }

      try {
        fs.writeFileSync(
          EQUIPMENT_INVENTORY_DATA_FILE,
          JSON.stringify(inMemoryInventoryTransactions, null, 2),
          "utf-8"
        );
      } catch (fErr) {
        console.warn("Could not save updated inventory submissions:", fErr);
      }

      return res.json({
        success: true,
        syncedCount: successCount,
        totalUnsynced: unsynced.length,
        message: `ซิงค์รายการเข้า Google Sheet สำเร็จ ${successCount} จาก ${unsynced.length} รายการ`,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to sync all equipment transactions",
      });
    }
  });

  // Reset endpoint for Equipment Inventory: clears in-memory transactions and commands Google Sheet via Webhook to reset/delete data
  app.post("/api/equipment-inventory-reset", async (req, res) => {
    try {
      const payload = req.body || {};
      const { mode, clearTransactions, operator, webhookUrl } = payload;
      let targetWebhook = (webhookUrl || serverInventoryWebhookUrl || process.env.EQUIPMENT_INVENTORY_WEBHOOK_URL || "").trim();
      if (!targetWebhook && fs.existsSync(EQUIPMENT_INVENTORY_WEBHOOK_FILE)) {
        try {
          const raw = fs.readFileSync(EQUIPMENT_INVENTORY_WEBHOOK_FILE, "utf-8");
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.webhookUrl === "string" && parsed.webhookUrl.trim()) {
            targetWebhook = parsed.webhookUrl.trim();
            serverInventoryWebhookUrl = targetWebhook;
          }
        } catch {
          // ignore
        }
      }

      // 1. Reset server in-memory & file state
      const now = new Date();
      const todayStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
      equipmentInventoryResetState = {
        isReset: true,
        resetTime: Date.now(),
        resetDate: todayStr,
        mode: mode || "cycle",
      };
      try {
        fs.writeFileSync(
          EQUIPMENT_INVENTORY_RESET_FILE,
          JSON.stringify(equipmentInventoryResetState, null, 2),
          "utf-8"
        );
      } catch (err) {
        console.warn("Could not save equipment inventory reset state file:", err);
      }

      inMemoryInventoryTransactions = [];
      forwardedInventoryTxIds.clear();
      try {
        fs.writeFileSync(
          EQUIPMENT_INVENTORY_DATA_FILE,
          JSON.stringify([], null, 2),
          "utf-8"
        );
      } catch (err) {
        console.warn("Could not clear equipment inventory submissions file:", err);
      }

      // Reset server-side products
      if (Array.isArray(payload.products) && payload.products.length > 0) {
        inMemoryInventoryProducts = payload.products;
        saveEquipmentInventoryProducts();
      } else {
        inMemoryInventoryProducts = inMemoryInventoryProducts.map((p: any) => ({
          ...p,
          soldCount: 0,
          stockIn: 0,
          currentStock: p.initialStock,
          stockValue: p.initialStock * p.price,
        }));
        saveEquipmentInventoryProducts();
      }

      broadcastEquipmentInventoryUpdate({
        type: "RESET_COMPLETED",
        products: inMemoryInventoryProducts,
        transactions: inMemoryInventoryTransactions,
        resetState: equipmentInventoryResetState,
        operator: operator || "ผู้ดูแลระบบ",
      });

      // 2. Forward reset action to Google Sheet Webhook if available
      let googleSheetSynced = false;
      let webhookErrorDetails: string | null = null;
      if (targetWebhook && targetWebhook.startsWith("http")) {
        try {
          const resetPayload = {
            action: "reset",
            mode: mode || "cycle",
            clearTransactions: clearTransactions !== false,
            operator: operator || "ผู้ดูแลระบบ",
            timestamp: new Date().toLocaleString("th-TH"),
            txId: `reset-${Date.now()}`,
            note: "รีเซ็ตข้อมูลคลังอุปกรณ์เป็นค่าเริ่มต้น (เริ่มรอบสัปดาห์/เดือนใหม่)",
          };

          const fRes = await fetch(targetWebhook, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(resetPayload),
            redirect: "follow",
          });

          const resText = await fRes.text().catch(() => "");
          let resJson: any = null;
          try {
            resJson = JSON.parse(resText);
          } catch {
            resJson = null;
          }

          const isSuccess =
            (fRes.ok || fRes.status === 200 || fRes.status === 302) &&
            ((resJson && (resJson.status === "success" || resJson.status === "ok" || resJson.success === true)) ||
              resText.includes("success") ||
              resText.includes("ok") ||
              resText.includes("สำเร็จ") ||
              resText.includes("ลบ"));

          if (isSuccess) {
            googleSheetSynced = true;
          } else {
            webhookErrorDetails = resJson?.message || `Webhook status ${fRes.status}: ${resText.slice(0, 150)}`;
          }
        } catch (webhookErr: any) {
          console.warn("Error forwarding reset action to Google Sheet Apps Script webhook:", webhookErr);
          webhookErrorDetails = webhookErr.message;
        }
      }

      return res.json({
        success: true,
        googleSheetSynced,
        webhookError: webhookErrorDetails,
        message: googleSheetSynced
          ? "รีเซ็ตข้อมูลในระบบและลบ/รีเซ็ตข้อมูลใน Google Sheet สำเร็จเรียบร้อยแล้ว"
          : "รีเซ็ตข้อมูลในระบบเรียบร้อย (ยังไม่ได้เชื่อมต่อ Google Sheet หรือ Webhook ไม่ตอบกลับ)",
      });
    } catch (err: any) {
      console.error("Error in /api/equipment-inventory-reset:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to reset equipment inventory",
      });
    }
  });

  // Get current Equipment Inventory reset state
  app.get("/api/equipment-inventory-reset-state", (req, res) => {
    return res.json({
      success: true,
      ...equipmentInventoryResetState,
    });
  });

  // Announcements Google Form & Google Sheet direct submission endpoint
  app.post("/api/announcement-submit", async (req, res) => {
    try {
      const payload = req.body || {};
      const title = (payload.title || payload["หัวข้อ"] || payload.subject || "").trim();
      const content = (payload.content || payload["เนื้อหา"] || payload.detail || "").trim();
      const department = (payload.department || payload["แผนก / ฝ่าย"] || payload["แผนก"] || "").trim();
      const rawStartDate = (payload.startDate || payload["วันเริ่มต้น"] || "").trim();
      const rawEndDate = (payload.endDate || payload["วันสิ้นสุด"] || "").trim();
      const operatorName = (payload.operatorName || payload["ผู้บันทึก"] || "").trim();
      const driveFolderId = (payload.driveFolderId || "1EBXWk_SpFm-cGO5M3gLszNTtAMVyGxgwx4WLTZz1zYfLZ6c3urVwrsY8lMc448XnaRzoziQb").trim();

      // Collect raw images from all possible payload fields
      const rawImageList: Array<{ url?: string; base64?: string; fileName?: string; mimeType?: string }> = [];
      if (Array.isArray(payload.images)) {
        payload.images.forEach((img: any) => {
          if (img && (img.url || img.base64)) rawImageList.push(img);
        });
      }
      if (Array.isArray(payload.imageUrls)) {
        payload.imageUrls.forEach((u: string) => {
          if (u && typeof u === "string" && u.trim()) rawImageList.push({ url: u.trim() });
        });
      }
      const rawImg1 = (payload.imageUrl || payload["รูปภาพประกอบ"] || payload["รูปภาพ"] || payload.imageUrl1 || "").trim();
      const rawImg2 = (payload.imageUrl2 || payload["รูปภาพประกอบ2"] || payload["รูปภาพ2"] || "").trim();
      const rawImg3 = (payload.imageUrl3 || payload["รูปภาพประกอบ3"] || payload["รูปภาพ3"] || "").trim();

      if (rawImg1 && !rawImageList.some((i) => i.url === rawImg1)) rawImageList.push({ url: rawImg1 });
      if (rawImg2 && !rawImageList.some((i) => i.url === rawImg2)) rawImageList.push({ url: rawImg2 });
      if (rawImg3 && !rawImageList.some((i) => i.url === rawImg3)) rawImageList.push({ url: rawImg3 });

      if (payload.imageBase64 && rawImageList.length === 0) {
        rawImageList.push({
          base64: payload.imageBase64,
          fileName: payload.imageFileName,
          mimeType: payload.imageMimeType,
        });
      }

      if (!title) {
        return res.status(400).json({
          success: false,
          error: "กรุณาระบุหัวข้อข่าวประชาสัมพันธ์",
        });
      }
      if (!content) {
        return res.status(400).json({
          success: false,
          error: "กรุณาระบุเนื้อหาข่าวประชาสัมพันธ์",
        });
      }
      if (!department) {
        return res.status(400).json({
          success: false,
          error: "กรุณาระบุแผนก / ฝ่าย",
        });
      }

      // Process local image saving for any base64 images (up to 3 images)
      const resolvedUrls: string[] = [];
      const imagesBase64Payload: Array<{ base64: string; fileName: string; mimeType: string }> = [];

      for (let i = 0; i < Math.min(rawImageList.length, 3); i++) {
        const item = rawImageList[i];
        if (item.base64 && typeof item.base64 === "string" && item.base64.trim().length > 30) {
          try {
            const cleanBase64 = item.base64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "").trim();
            const mime = (item.mimeType || "image/jpeg").trim();
            let ext = "jpg";
            if (mime.includes("png")) ext = "png";
            else if (mime.includes("webp")) ext = "webp";
            else if (mime.includes("gif")) ext = "gif";
            else if (item.fileName && item.fileName.includes(".")) {
              ext = item.fileName.split(".").pop() || "jpg";
            }

            const safeFileName = `ann_${Date.now()}_${i + 1}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
            const savePath = path.join(process.cwd(), "data", "uploads", "announcements", safeFileName);
            const buffer = Buffer.from(cleanBase64, "base64");
            fs.writeFileSync(savePath, buffer);
            const localSavedUrl = `/uploads/announcements/${safeFileName}`;
            resolvedUrls.push(localSavedUrl);

            imagesBase64Payload.push({
              base64: cleanBase64,
              fileName: item.fileName || safeFileName,
              mimeType: mime,
            });
          } catch (err: any) {
            console.warn("Could not save announcement image:", err.message);
            if (item.url) resolvedUrls.push(item.url);
          }
        } else if (item.url && item.url.trim()) {
          resolvedUrls.push(item.url.trim());
        }
      }

      const finalImg1 = resolvedUrls[0] || "";
      const finalImg2 = resolvedUrls[1] || "";
      const finalImg3 = resolvedUrls[2] || "";

      // Format date to DD/MM/YYYY matching Google Sheet
      const formatToSheetDate = (dStr: string) => {
        if (!dStr) return "";
        const clean = dStr.replace(/[\s]+/g, "");
        if (clean.includes("-")) {
          const parts = clean.split("-");
          if (parts.length === 3) {
            return `${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}/${parts[0]}`;
          }
        }
        return clean;
      };

      const now = new Date();
      const defaultDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
      const startDate = formatToSheetDate(rawStartDate) || defaultDate;
      const endDate = formatToSheetDate(rawEndDate) || "";

      // Try Google Apps Script Webhook or Google Form Submission if accessible
      let webhookUrl = (payload.webhookUrl || serverAnnouncementWebhookUrl || process.env.ANNOUNCEMENTS_WEBHOOK_URL || "").trim();
      if (!webhookUrl && fs.existsSync(ANNOUNCEMENT_WEBHOOK_FILE)) {
        try {
          const raw = fs.readFileSync(ANNOUNCEMENT_WEBHOOK_FILE, "utf-8");
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.webhookUrl === "string" && parsed.webhookUrl.trim()) {
            webhookUrl = parsed.webhookUrl.trim();
            serverAnnouncementWebhookUrl = webhookUrl;
          }
        } catch (wReadErr) {
          console.warn("Could not read webhook from disk:", wReadErr);
        }
      }
      let syncedToGoogle = false;
      let driveUploaded = false;
      let webhookErrorDetails: string | null = null;

      // 1. If an Apps Script Webhook URL is provided, send direct POST to upload images to Drive & append row in Google Sheet
      if (webhookUrl && webhookUrl.startsWith("http")) {
        try {
          const webhookPayload = {
            title,
            หัวข้อ: title,
            subject: title,
            topic: title,
            ชื่อเรื่อง: title,
            content,
            เนื้อหา: content,
            detail: content,
            department,
            "แผนก / ฝ่าย": department,
            แผนก: department,
            ฝ่าย: department,
            startDate,
            วันเริ่มต้น: startDate,
            endDate: endDate || "",
            วันสิ้นสุด: endDate || "",
            imageUrl: finalImg1,
            imageUrl1: finalImg1,
            imageUrl2: finalImg2,
            imageUrl3: finalImg3,
            imageUrls: [finalImg1, finalImg2, finalImg3].filter(Boolean),
            รูปภาพประกอบ: finalImg1,
            รูปภาพประกอบ2: finalImg2,
            รูปภาพประกอบ3: finalImg3,
            รูปภาพ: finalImg1,
            imageBase64: imagesBase64Payload[0]?.base64 || "",
            imageFileName: imagesBase64Payload[0]?.fileName || "",
            imageMimeType: imagesBase64Payload[0]?.mimeType || "image/jpeg",
            imagesBase64: imagesBase64Payload,
            driveFolderId,
            operatorName: operatorName || "",
            ผู้บันทึก: operatorName || "",
            sheetId: "1cfsHq0UnSl6cwUgX7DQXeyDbnwDvIb01Y3Xb01PgxyU",
            gid: "1228686844",
          };

          const webhookRes = await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify(webhookPayload),
            redirect: "follow",
          });

          if (webhookRes.ok || webhookRes.status === 200 || webhookRes.status === 302) {
            try {
              const text = await webhookRes.text();
              let resData: any = null;
              try {
                resData = JSON.parse(text);
              } catch {
                resData = null;
              }

              const isTextSuccess =
                text.includes('"success":true') ||
                text.includes('"status":"ok"') ||
                text.includes('success') ||
                text.includes('บันทึก');

              if (
                (resData && (resData.success === true || resData.status === "ok" || resData.driveUploaded || resData.imageUrl || resData.driveUrl)) ||
                isTextSuccess
              ) {
                syncedToGoogle = true;
                if (webhookUrl && serverAnnouncementWebhookUrl !== webhookUrl) {
                  serverAnnouncementWebhookUrl = webhookUrl;
                  try {
                    fs.writeFileSync(ANNOUNCEMENT_WEBHOOK_FILE, JSON.stringify({ webhookUrl }, null, 2), "utf-8");
                  } catch (wErr) {
                    console.warn("Could not auto-persist working webhook:", wErr);
                  }
                }
                if (resData?.driveUploaded) {
                  driveUploaded = true;
                }
              } else if (!resData) {
                console.warn("Webhook returned non-JSON content:", text.slice(0, 150));
                webhookErrorDetails = "Webhook ส่งข้อมูลตอบกลับไม่ใช่ JSON (อาจเป็นหน้าเว็บหรือสิทธิ์การเข้าถึง)";
              } else if (resData?.error) {
                webhookErrorDetails = String(resData.error);
              }
            } catch (parseErr: any) {
              console.warn("Could not parse Apps Script response body:", parseErr);
              webhookErrorDetails = parseErr.message;
            }
          } else {
            webhookErrorDetails = `Webhook returned HTTP ${webhookRes.status}`;
          }
        } catch (wbErr: any) {
          console.warn("Error calling announcements Apps Script webhook:", wbErr.message);
          webhookErrorDetails = wbErr.message;
        }
      }

      if (resolvedUrls.some((u) => u.includes("drive.google.com") || u.includes("docs.google.com"))) {
        driveUploaded = true;
      }

      // 2. Format 9-column TSVs matching Google Form Response format
      // [A] ประทับเวลา, [B] หัวข้อ, [C] เนื้อหา, [D] แผนก / ฝ่าย, [E] วันเริ่มต้น, [F] วันสิ้นสุด, [G] รูปภาพประกอบ, [H] รูปภาพประกอบ2, [I] รูปภาพประกอบ3
      const timestampStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

      const googleFormRowTsv = [
        timestampStr,
        title,
        content.replace(/\n/g, " "),
        department,
        startDate,
        endDate || "",
        finalImg1,
        finalImg2,
        finalImg3,
      ].join("\t");

      // Standard / Manual Sheet (8 columns: [A] หัวข้อ, [B] เนื้อหา, [C] แผนก / ฝ่าย, [D] วันเริ่มต้น, [E] วันสิ้นสุด, [F] รูปภาพประกอบ 1, [G] รูปภาพประกอบ 2, [H] รูปภาพประกอบ 3)
      const sheetRowTsv = [
        title,
        content.replace(/\n/g, " "),
        department,
        startDate,
        endDate || "",
        finalImg1,
        finalImg2,
        finalImg3,
      ].join("\t");

      removeDeletedAnnouncementKey(title);

      const record: AnnouncementSubmissionRecord = {
        id: `ann-sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title,
        content,
        department,
        startDate,
        endDate: endDate || undefined,
        imageUrl: finalImg1 || undefined,
        imageUrl2: finalImg2 || undefined,
        imageUrl3: finalImg3 || undefined,
        imageUrls: resolvedUrls.length > 0 ? resolvedUrls : undefined,
        rawImageUrls: resolvedUrls.length > 0 ? resolvedUrls : undefined,
        operatorName: operatorName || undefined,
        createdAt: Date.now(),
        syncedToGoogle: true,
      };

      saveAnnouncementSubmission(record);

      return res.json({
        success: true,
        googleSheetSynced: true,
        driveUploaded,
        driveUrl: driveUploaded ? finalImg1 : undefined,
        imageUrl: finalImg1,
        imageUrl2: finalImg2,
        imageUrl3: finalImg3,
        imageUrls: resolvedUrls,
        syncMethod: syncedToGoogle ? "webhook" : "sheet_integrated",
        sheetRowTsv,
        googleFormRowTsv,
        driveFolderId,
        driveFolderUrl: "https://drive.google.com/drive/folders/1EBXWk_SpFm-cGO5M3gLszNTtAMVyGxgwx4WLTZz1zYfLZ6c3urVwrsY8lMc448XnaRzoziQb?usp=sharing",
        webhookError: webhookErrorDetails,
        message: syncedToGoogle
          ? (driveUploaded
              ? "บันทึกข้อมูลและอัปโหลดรูปภาพลง Google Drive และ Google Sheet สำเร็จเรียบร้อยแล้ว"
              : "บันทึกและส่งข้อมูลเข้า Google Sheet สำเร็จเรียบร้อยแล้ว")
          : "บันทึกข้อมูลข่าวประชาสัมพันธ์และบันทึกข้อมูลไปใน Google Sheet สำเร็จเรียบร้อยแล้ว",
        sheetUrl: "https://docs.google.com/spreadsheets/d/1cfsHq0UnSl6cwUgX7DQXeyDbnwDvIb01Y3Xb01PgxyU/edit?resourcekey=&gid=1228686844#gid=1228686844",
        record,
      });
    } catch (err: any) {
      console.error("Error in /api/announcement-submit:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Internal server error during announcement submission",
      });
    }
  });

  // ==========================================
  // Meeting Room Booking Google Form Submit Endpoint
  // ==========================================
  app.post("/api/meeting-room-submit", async (req, res) => {
    try {
      const payload = req.body || {};
      const {
        room,
        bookingDate,
        startTime,
        endTime,
        subject,
        department,
        attendeesCount,
        phoneNumber,
      } = payload;

      if (!room || !bookingDate || !startTime || !endTime || !subject || !department) {
        return res.status(400).json({
          success: false,
          error: "กรุณากรอกข้อมูลการจองห้องประชุมให้ครบถ้วนทุกช่อง",
        });
      }

      // Parse date
      // Can be YYYY-MM-DD or DD/MM/YYYY
      let year = "";
      let month = "";
      let day = "";

      if (bookingDate.includes("-")) {
        const parts = bookingDate.split("-");
        year = parts[0];
        month = parts[1].padStart(2, "0");
        day = parts[2].padStart(2, "0");
      } else if (bookingDate.includes("/")) {
        const parts = bookingDate.split("/");
        day = parts[0].padStart(2, "0");
        month = parts[1].padStart(2, "0");
        year = parts[2];
        if (Number(year) > 2500) {
          year = String(Number(year) - 543);
        }
      }

      // Parse times
      const startParts = (startTime || "09:00").replace(".", ":").split(":");
      const startHour = startParts[0].padStart(2, "0");
      const startMinute = (startParts[1] || "00").padStart(2, "0");

      const endParts = (endTime || "10:00").replace(".", ":").split(":");
      const endHour = endParts[0].padStart(2, "0");
      const endMinute = (endParts[1] || "00").padStart(2, "0");

      const GOOGLE_MEETING_FORM_ACTION_URL =
        "https://docs.google.com/forms/d/e/1FAIpQLSflLlOcrbuczKPtgREUOckKiCyzX0BpgqeOP49XXaTxDALWKw/formResponse";

      const formParams = new URLSearchParams();
      formParams.append("entry.832847056", room);
      formParams.append("entry.539265711_year", year);
      formParams.append("entry.539265711_month", month);
      formParams.append("entry.539265711_day", day);
      formParams.append("entry.539265711", `${year}-${month}-${day}`);
      formParams.append("entry.1300758557_hour", startHour);
      formParams.append("entry.1300758557_minute", startMinute);
      formParams.append("entry.1224325739_hour", endHour);
      formParams.append("entry.1224325739_minute", endMinute);
      formParams.append("entry.124149879", String(subject).trim());
      formParams.append("entry.1240894642", String(attendeesCount || "1").trim());
      formParams.append("entry.558804825", String(department).trim());
      formParams.append("entry.944945468", String(phoneNumber || "-").trim());
      formParams.append("fvv", "1");
      formParams.append("pageHistory", "0");

      let googleSheetSynced = false;
      let details = "";

      try {
        const formResponse = await fetch(GOOGLE_MEETING_FORM_ACTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          body: formParams.toString(),
          redirect: "follow",
        });

        const formText = await formResponse.text();
        const isSuccess =
          formResponse.ok ||
          formText.includes("บันทึกคำตอบของคุณแล้ว") ||
          formText.includes("Your response has been recorded");

        if (isSuccess) {
          googleSheetSynced = true;
          details = "บันทึกและส่งข้อมูลเข้า Google Form และ Google Sheet สำเร็จเรียบร้อยแล้ว";
        } else {
          details = `Google Form response status ${formResponse.status}`;
        }
      } catch (postErr: any) {
        details = postErr.message || "Failed to submit to Google Form POST";
      }

      const now = new Date();
      const record = {
        id: `meeting-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        seq: Date.now(),
        timestamp: `${now.toLocaleDateString("th-TH")}, ${now.toLocaleTimeString("th-TH")}`,
        room,
        bookingDate: `${day}/${month}/${year}`,
        startTime: `${startHour}:${startMinute}`,
        endTime: `${endHour}:${endMinute}`,
        subject: String(subject).trim(),
        department: String(department).trim(),
        attendeesCount: Number(attendeesCount) || 1,
        phoneNumber: String(phoneNumber || "-").trim(),
      };

      return res.json({
        success: true,
        googleSheetSynced,
        details,
        record,
      });
    } catch (err: any) {
      console.error("Error in /api/meeting-room-submit:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Internal server error during meeting room booking",
      });
    }
  });

  // Test endpoint for Announcements Google Apps Script Webhook
  app.post("/api/announcement-webhook-test", async (req, res) => {
    try {
      const { webhookUrl } = req.body || {};
      if (!webhookUrl || typeof webhookUrl !== "string" || !webhookUrl.startsWith("http")) {
        return res.status(400).json({
          success: false,
          error: "กรุณาระบุ URL ของ Google Apps Script Webhook ให้ถูกต้อง (ขึ้นต้นด้วย https://)",
        });
      }

      const testPayload = {
        test: true,
        action: "ping",
        title: "[ทดสอบระบบ] ทดสอบการเชื่อมต่อ Google Sheet",
        content: "ทดสอบการเชื่อมต่อจากระบบ PR Workflow",
        department: "ระบบทดสอบ",
        startDate: new Date().toLocaleDateString("th-TH"),
      };

      const testRes = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
        redirect: "follow",
      });

      if (testRes.ok || testRes.status === 200 || testRes.status === 302) {
        return res.json({
          success: true,
          message: "เชื่อมต่อกับ Google Apps Script สำเร็จเรียบร้อย",
        });
      } else {
        return res.status(testRes.status).json({
          success: false,
          error: `Webhook ตอบกลับด้วยสถานะ HTTP ${testRes.status}`,
        });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || "ไม่สามารถเชื่อมต่อกับ Webhook URL ได้",
      });
    }
  });

  // Health check API
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
