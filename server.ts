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
