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
    if (!s.trackingCode) continue;
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

// Google Form dynamic entry detection for itemTitle (ชื่อเอกสาร / พัสดุ)
let cachedItemTitleEntryId: string | null = null;
let lastFormCheckTime = 0;

async function getOrDetectItemTitleEntryId(formId: string): Promise<string | null> {
  if (process.env.GOOGLE_PARCEL_ITEM_TITLE_ENTRY_ID) {
    return process.env.GOOGLE_PARCEL_ITEM_TITLE_ENTRY_ID.trim();
  }
  const now = Date.now();
  if (cachedItemTitleEntryId && now - lastFormCheckTime < 30000) {
    return cachedItemTitleEntryId;
  }

  try {
    const res = await fetch(`https://docs.google.com/forms/d/e/${formId}/viewform`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) return cachedItemTitleEntryId;
    const html = await res.text();
    const match = html.match(/FB_PUBLIC_LOAD_DATA_ = (\[.*?\]);\s*<\/script>/s);
    if (!match) return cachedItemTitleEntryId;
    const data = JSON.parse(match[1]);
    const items = data[1]?.[1];
    if (Array.isArray(items)) {
      const knownEntries = ["1879722225", "645686724", "1066148556", "222826518", "600874339"];
      for (const item of items) {
        const title = (item[1] || "").trim();
        const entryId = item[4]?.[0]?.[0];
        if (!entryId) continue;
        const entryStr = `entry.${entryId}`;
        if (knownEntries.includes(String(entryId))) {
          continue;
        }
        if (/เอกสาร|พัสดุ|ชื่อ|รายการ|item|title|parcel/i.test(title) || items.length > 5) {
          cachedItemTitleEntryId = entryStr;
          lastFormCheckTime = now;
          console.log(`[Google Form] Detected item title entry ID: ${entryStr} (Title: ${title})`);
          return entryStr;
        }
      }
    }
    lastFormCheckTime = now;
  } catch (err) {
    console.warn("[Google Form] Error detecting entry ID:", err);
  }
  return cachedItemTitleEntryId;
}

// Clean and normalize strings for matching
function normalizeText(text: string): string {
  return (text || "").replace(/\s+/g, "").trim().toLowerCase();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Google Sheet proxy endpoint for streaming raw CSV with intelligent parcel itemTitle enrichment
  app.get("/api/sheet-csv", async (req, res) => {
    try {
      const sheetId = (req.query.sheetId as string) || "1qbKEbnjIPb2eM-DOLAkFZv3hDl2cioKeUqiLcdYqjos";
      const gid = req.query.gid as string | undefined;
      const sheetName = req.query.sheet as string | undefined;

      let exportUrl = "";
      if (sheetName) {
        exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
      } else {
        const targetGid = gid || "1278573396";
        exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${targetGid}`;
      }

      const response = await fetch(exportUrl, {
        headers: {
          Accept: "text/csv, text/plain, */*",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Google Sheets export returned ${response.status}` });
      }

      let csvText = await response.text();

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

            const senderColIdx = header.findIndex((h) => h.includes("ชื่อผู้ส่ง"));
            const recipientColIdx = header.findIndex((h) => h.includes("ชื่อผู้รับ"));
            const actionColIdx = header.findIndex((h) => h.includes("ประเภท"));

            if (titleColIdx >= 0) {
              // Ensure header exists
              if (!rows[0][titleColIdx] || !rows[0][titleColIdx].trim()) {
                rows[0][titleColIdx] = "ชื่อเอกสาร / พัสดุ";
              }

              for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue;

                // If column is missing or empty string
                const currentVal = (row[titleColIdx] || "").trim();
                if (!currentVal) {
                  const sName = senderColIdx >= 0 ? normalizeText(row[senderColIdx]) : "";
                  const rName = recipientColIdx >= 0 ? normalizeText(row[recipientColIdx]) : "";
                  const aType = actionColIdx >= 0 ? normalizeText(row[actionColIdx]) : "";

                  // Find best matching saved submission
                  const match = inMemorySubmissions.find((sub) => {
                    const matchSender = !sName || normalizeText(sub.senderName) === sName;
                    const matchRecipient = !rName || normalizeText(sub.recipientName) === rName;
                    const matchAction = !aType || normalizeText(sub.actionType) === aType;
                    return matchSender && matchRecipient && matchAction && sub.itemTitle;
                  });

                  if (match && match.itemTitle) {
                    while (row.length <= titleColIdx) {
                      row.push("");
                    }
                    row[titleColIdx] = match.itemTitle;
                  }
                }
              }
              csvText = stringifyCsv(rows);
            }
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
        cachedItemTitleEntryId = null;
        lastFormCheckTime = 0;
      }
      const detectedItemTitleEntry = await getOrDetectItemTitleEntryId(GOOGLE_PARCEL_FORM_ID);
      return res.json({
        formId: GOOGLE_PARCEL_FORM_ID,
        hasItemTitleQuestion: !!detectedItemTitleEntry,
        detectedEntryId: detectedItemTitleEntry,
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

      const GOOGLE_PARCEL_FORM_ID = "1FAIpQLSfhL7tVwlJ7aYMt7fCWkBnMk1hS7ZJePsjYDRxnSDxmwsqq_g";
      const GOOGLE_FORM_ACTION_URL = `https://docs.google.com/forms/d/e/${GOOGLE_PARCEL_FORM_ID}/formResponse`;

      // 1. Prepare Google Form POST parameters
      const formParams = new URLSearchParams();
      // Required Google Form entry mappings
      formParams.append("entry.1879722225", payload.actionType || "รับ");
      formParams.append("entry.645686724", payload.senderName || "");
      formParams.append("entry.1066148556", payload.senderDepartment || "");
      formParams.append("entry.222826518", payload.recipientName || "");
      formParams.append("entry.600874339", payload.recipientDepartment || "");

      // Check dynamically if the user has added a question in Google Form for "ชื่อเอกสาร / พัสดุ"
      const detectedItemTitleEntry = await getOrDetectItemTitleEntryId(GOOGLE_PARCEL_FORM_ID);
      if (detectedItemTitleEntry) {
        formParams.append(detectedItemTitleEntry, payload.itemTitle || "");
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
          if (detectedItemTitleEntry) {
            statusDetails = `ส่งข้อมูลครบถ้วนรวมทั้งชื่อเอกสาร/พัสดุ (${detectedItemTitleEntry}) ไปยัง Google Form และ Google Sheet สำเร็จเรียบร้อยแล้ว`;
          } else {
            statusDetails = "ส่งข้อมูล 5 รายการพื้นฐานเข้า Google Form สำเร็จ (หมายเหตุ: ใน Google Form ยังไม่ได้เพิ่มคำถาม 'ชื่อเอกสาร / พัสดุ' ทำให้ Google Form ยังไม่ลงข้อมูลในคอลัมน์ชื่อเอกสารของ Sheet จนกว่าจะกดเพิ่มคำถามใน Google Form)";
          }
        } else {
          statusDetails = `Google Form response status ${formResponse.status}`;
        }
      } catch (formErr: any) {
        statusDetails = formErr.message || "Failed to submit to Google Form POST";
      }

      // 3. Save to persistent storage so the app always preserves itemTitle and trackingCode
      const actionType = payload.actionType || "รับ";
      const trackingCode = payload.trackingCode || (actionType === "ส่ง" ? generateServerParcelTrackingCode(payload.timestamp) : undefined);

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
        detectedItemTitleEntry: detectedItemTitleEntry || null,
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
