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

const KEYS_DATA_FILE = path.join(process.cwd(), "keys-submissions.json");

interface KeySubmissionRecord {
  id: string;
  actionType: string;
  date: string;
  personName: string;
  department: string;
  keyNumbers: string;
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
  app.use("/uploads", express.static(path.join(process.cwd(), "data", "uploads")));

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
        exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${targetGid}&_t=${nowTs}`;
      }

      const response = await fetch(exportUrl, {
        headers: {
          Accept: "text/csv, text/plain, */*",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

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
          sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit?gid=${gid || "1327805432"}#gid=${gid || "1327805432"}`,
        });
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
        syncedToGoogle,
        createdAt: Date.now(),
      };

      saveGownSubmission(record);

      return res.json({
        success: true,
        googleSheetSynced: syncedToGoogle,
        message: syncedToGoogle
          ? "ส่งข้อมูลเข้า Google Form และบันทึกลงใน Google Sheet สำเร็จเรียบร้อยแล้ว"
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
      if (!matchedDepartment) {
        return res.status(400).json({
          success: false,
          error: `แผนก "${rawDept}" ไม่ตรงกับตัวเลือกใน Google Form กรุณาเลือกจากรายการที่กำหนด`,
        });
      }

      const keyNumbers = (payload.keyNumbers || payload.keys || payload.keyNumber || "").trim();
      if (!keyNumbers) {
        return res.status(400).json({
          success: false,
          error: "กรุณาระบุหมายเลขกุญแจ",
        });
      }

      const note = (payload.note || payload.remarks || "").trim();

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

      // 6. หมายเหตุ
      if (note) {
        formParams.append("entry.1058815699", note);
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
        const formRes = await fetch(GOOGLE_KEYS_FORM_ACTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          body: bodyParams.toString(),
        });
        const formText = await formRes.text();
        const isRecorded = formText.includes("บันทึกคำตอบของคุณแล้ว") || formText.includes("Your response has been recorded");
        return { isRecorded, formText, status: formRes.status };
      };

      let currentFbzx = await fetchFbzx();
      let submitResult = await postSubmission(currentFbzx);

      // If not recorded, retry once with a freshly fetched fbzx token
      if (!submitResult.isRecorded) {
        currentFbzx = await fetchFbzx();
        submitResult = await postSubmission(currentFbzx);
      }

      if (!submitResult.isRecorded) {
        console.error("Google form rejected keys submission:", submitResult.formText.substring(0, 300));
        return res.status(502).json({
          success: false,
          error: "ไม่สามารถบันทึกข้อมูลลง Google Sheet ได้ โปรดตรวจสอบว่าแผนกตรงกับตัวเลือกใน Google Form หรือลองใหม่อีกครั้ง",
        });
      }

      const record: KeySubmissionRecord = {
        id: `keys-sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        actionType,
        date: dateFormatted,
        personName,
        department: matchedDepartment,
        keyNumbers,
        note: note || undefined,
        syncedToGoogle: true,
        createdAt: Date.now(),
      };

      saveKeysSubmission(record);

      return res.json({
        success: true,
        googleSheetSynced: true,
        message: "ส่งข้อมูลเข้า Google Form และบันทึกลงใน Google Sheet สำเร็จเรียบร้อยแล้ว",
        record,
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

      const fetchFbzx = async (): Promise<string> => {
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
            if (fbzxMatch && fbzxMatch[1]) return fbzxMatch[1];
          }
        } catch (e: any) {
          console.warn("Could not fetch ladder form fbzx token:", e?.message);
        }
        return "";
      };

      const postSubmission = async (token: string) => {
        const bodyParams = new URLSearchParams(formParams);
        if (token) {
          bodyParams.set("fbzx", token);
        }
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
        console.error("Google form rejected ladder submission:", submitResult.formText.substring(0, 300));
        return res.status(502).json({
          success: false,
          error: "ไม่สามารถบันทึกข้อมูลลง Google Sheet ได้ โปรดตรวจสอบข้อมูลหรือลองใหม่อีกครั้ง",
        });
      }

      const primaryLadder = validLadders.join(", ");
      const record: LadderSubmissionRecord = {
        id: `ladder-sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        actionType,
        date: dateFormatted,
        personName,
        department: matchedDepartment,
        ladderType: primaryLadder,
        syncedToGoogle: true,
        createdAt: Date.now(),
      };

      saveLadderSubmission(record);

      return res.json({
        success: true,
        googleSheetSynced: true,
        message: "ส่งข้อมูลเข้า Google Form และบันทึกลงใน Google Sheet สำเร็จเรียบร้อยแล้ว",
        record,
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

  // Announcements Google Form & Google Sheet direct submission endpoint
  app.post("/api/announcement-submit", async (req, res) => {
    try {
      const payload = req.body || {};
      const title = (payload.title || payload["หัวข้อ"] || payload.subject || "").trim();
      const content = (payload.content || payload["เนื้อหา"] || payload.detail || "").trim();
      const department = (payload.department || payload["แผนก / ฝ่าย"] || payload["แผนก"] || "").trim();
      const rawStartDate = (payload.startDate || payload["วันเริ่มต้น"] || "").trim();
      const rawEndDate = (payload.endDate || payload["วันสิ้นสุด"] || "").trim();
      let imageUrl = (payload.imageUrl || payload["รูปภาพประกอบ"] || payload["รูปภาพ"] || "").trim();
      const operatorName = (payload.operatorName || payload["ผู้บันทึก"] || "").trim();
      const imageBase64 = (payload.imageBase64 || "").trim();
      const imageFileName = (payload.imageFileName || "").trim();
      const imageMimeType = (payload.imageMimeType || "image/jpeg").trim();
      const driveFolderId = (payload.driveFolderId || "1EBXWk_SpFm-cGO5M3gLszNTtAMVyGxgwx4WLTZz1zYfLZ6c3urVwrsY8lMc448XnaRzoziQb").trim();

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

      // Handle local image attachment if provided
      let localSavedImageUrl = "";
      let cleanBase64 = "";
      if (imageBase64) {
        try {
          cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
          let ext = "jpg";
          if (imageMimeType.includes("png")) ext = "png";
          else if (imageMimeType.includes("webp")) ext = "webp";
          else if (imageMimeType.includes("gif")) ext = "gif";
          else if (imageFileName.includes(".")) {
            ext = imageFileName.split(".").pop() || "jpg";
          }

          const safeFileName = `ann_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
          const savePath = path.join(process.cwd(), "data", "uploads", "announcements", safeFileName);
          const buffer = Buffer.from(cleanBase64, "base64");
          fs.writeFileSync(savePath, buffer);
          localSavedImageUrl = `/uploads/announcements/${safeFileName}`;
          if (!imageUrl) {
            imageUrl = localSavedImageUrl;
          }
        } catch (imgErr: any) {
          console.warn("Could not save local image attachment:", imgErr.message);
        }
      }

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
      const webhookUrl = (payload.webhookUrl || process.env.ANNOUNCEMENTS_WEBHOOK_URL || "").trim();
      let syncedToGoogle = false;
      let driveUploaded = false;
      let resolvedImageUrl = imageUrl;
      let webhookErrorDetails: string | null = null;

      // 1. If an Apps Script Webhook URL is provided, send direct POST to upload image to Drive & append row in Google Sheet
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
            imageUrl: imageUrl || "",
            รูปภาพประกอบ: imageUrl || "",
            รูปภาพ: imageUrl || "",
            imageBase64: cleanBase64,
            imageFileName: imageFileName || `announcement_${Date.now()}.${imageMimeType.includes("png") ? "png" : "jpg"}`,
            imageMimeType,
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

              if (resData && (resData.success === true || resData.status === "ok" || resData.driveUploaded || resData.imageUrl || resData.driveUrl)) {
                syncedToGoogle = true;
                const driveLink = resData.imageUrl || resData.driveUrl || resData.fileUrl || resData.url;
                if (driveLink && typeof driveLink === "string" && (driveLink.includes("drive.google.com") || driveLink.includes("docs.google.com") || driveLink.startsWith("http"))) {
                  resolvedImageUrl = driveLink;
                  driveUploaded = true;
                } else if (resData.fileId || resData.driveFileId) {
                  const id = resData.fileId || resData.driveFileId;
                  resolvedImageUrl = `https://drive.google.com/file/d/${id}/view?usp=sharing`;
                  driveUploaded = true;
                } else if (resData.driveUploaded) {
                  driveUploaded = true;
                }
              } else if (!resData) {
                console.warn("Webhook returned non-JSON content (likely HTML or redirect):", text.slice(0, 150));
                webhookErrorDetails = "Webhook ส่งข้อมูลตอบกลับไม่ใช่ JSON (อาจเป็นหน้าเว็บหรือสิทธิ์การเข้าถึง)";
              } else if (resData.error) {
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

      // If the image URL provided by the user is already a Google Drive link, mark driveUploaded as true
      if (resolvedImageUrl && (resolvedImageUrl.includes("drive.google.com") || resolvedImageUrl.includes("docs.google.com"))) {
        driveUploaded = true;
      }

      // 2. Format TSVs for 1-click clipboard paste
      const finalImageLink = resolvedImageUrl || imageUrl || "";
      const timestampStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

      // Google Form Response Sheet (7 columns: [A] ประทับเวลา, [B] หัวข้อ, [C] เนื้อหา, [D] แผนก / ฝ่าย, [E] วันเริ่มต้น, [F] วันสิ้นสุด, [G] รูปภาพประกอบ)
      const googleFormRowTsv = [
        timestampStr,
        title,
        content.replace(/\n/g, " "),
        department,
        startDate,
        endDate || "",
        finalImageLink,
      ].join("\t");

      // Standard / Manual Sheet (6 columns: [A] หัวข้อ, [B] เนื้อหา, [C] แผนก / ฝ่าย, [D] วันเริ่มต้น, [E] วันสิ้นสุด, [F] รูปภาพประกอบ)
      const sheetRowTsv = [
        title,
        content.replace(/\n/g, " "),
        department,
        startDate,
        endDate || "",
        finalImageLink,
      ].join("\t");

      const record: AnnouncementSubmissionRecord = {
        id: `ann-sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title,
        content,
        department,
        startDate,
        endDate: endDate || undefined,
        imageUrl: finalImageLink || undefined,
        operatorName: operatorName || undefined,
        createdAt: Date.now(),
        syncedToGoogle,
      };

      saveAnnouncementSubmission(record);

      return res.json({
        success: true,
        googleSheetSynced: syncedToGoogle,
        driveUploaded,
        driveUrl: driveUploaded ? resolvedImageUrl : undefined,
        imageUrl: finalImageLink,
        syncMethod: syncedToGoogle ? "webhook" : "local_prepared",
        sheetRowTsv,
        googleFormRowTsv,
        driveFolderId,
        driveFolderUrl: "https://drive.google.com/drive/folders/1EBXWk_SpFm-cGO5M3gLszNTtAMVyGxgwx4WLTZz1zYfLZ6c3urVwrsY8lMc448XnaRzoziQb?usp=sharing",
        webhookError: webhookErrorDetails,
        message: syncedToGoogle
          ? (driveUploaded
              ? "บันทึกข้อมูลและอัปโหลดรูปภาพลง Google Drive และ Google Sheet สำเร็จเรียบร้อยแล้ว"
              : "บันทึกและส่งข้อมูลเข้า Google Sheet สำเร็จเรียบร้อยแล้ว")
          : "บันทึกข้อมูลในระบบเรียบร้อยแล้ว พร้อมแถวข้อมูลสำหรับนำไปวางลง Google Sheet ได้ทันที",
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
