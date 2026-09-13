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
  itemTitleEntry: "entry.1686437864",
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
