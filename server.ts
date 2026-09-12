import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Google Sheet proxy endpoint for streaming raw CSV without gviz type stripping or CORS issues
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

      const csvText = await response.text();
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      return res.send(csvText);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to fetch sheet proxy" });
    }
  });

  // Parcel & Document Google Form & Google Sheet direct submission endpoint
  app.post("/api/parcel-submit", async (req, res) => {
    try {
      const payload = req.body || {};

      // บังคับให้กรอกข้อมูลทุกช่อง หากไม่ครบไม่สามารถทำรายการได้
      if (
        !payload.senderName?.trim() ||
        !payload.senderDepartment?.trim() ||
        !payload.recipientName?.trim() ||
        !payload.recipientDepartment?.trim() ||
        !payload.itemTitle?.trim()
      ) {
        return res.status(400).json({
          success: false,
          error: "กรุณากรอกข้อมูลให้ครบทุกช่องก่อนทำรายการ (บังคับกรอกทุกช่อง)",
        });
      }

      const GOOGLE_FORM_ACTION_URL =
        "https://docs.google.com/forms/d/e/1FAIpQLSfhL7tVwlJ7aYMt7fCWkBnMk1hS7ZJePsjYDRxnSDxmwsqq_g/formResponse";

      // 1. Prepare Google Form POST parameters
      const formParams = new URLSearchParams();
      // Required Google Form entry mappings
      formParams.append("entry.1879722225", payload.actionType || "รับ");
      formParams.append("entry.645686724", payload.senderName || "");
      formParams.append("entry.1066148556", payload.senderDepartment || "");
      formParams.append("entry.222826518", payload.recipientName || "");
      formParams.append("entry.600874339", payload.recipientDepartment || "");
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
          statusDetails = "ส่งข้อมูลไปยัง Google Form / Google Sheets สำเร็จเรียบร้อยแล้ว";
        } else {
          statusDetails = `Google Form response status ${formResponse.status}`;
        }
      } catch (formErr: any) {
        statusDetails = formErr.message || "Failed to submit to Google Form POST";
      }

      // 3. If a custom external webhook is also configured, mirror asynchronously
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
        details: statusDetails,
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
