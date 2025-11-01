import express from "express";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import bodyParser from "body-parser";
import cors from "cors";
import { DateTime } from "luxon";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// 🧩 Support for ES modules path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Database setup
const adapter = new JSONFile("/tmp/db.json");

const db = new Low(adapter, { ips: [], duplicates: {}, lastReset: "" });
await db.read();

function resetDailyIfNeeded() {
  const now = DateTime.now().setZone("Asia/Karachi");
  const resetTime = now.set({ hour: 6, minute: 0, second: 0, millisecond: 0 });
  const lastReset = db.data.lastReset
    ? DateTime.fromISO(db.data.lastReset)
    : null;

  if (!lastReset || (now > resetTime && lastReset < resetTime)) {
    db.data.duplicates = {};
    db.data.lastReset = now.toISO();
    db.write();
  }
}

function removeExpiredIPs() {
  const now = DateTime.now();
  db.data.ips = db.data.ips.filter((entry) => {
    const added = DateTime.fromISO(entry.date);
    return now.diff(added, "days").days <= 30;
  });
}

// API routes
app.get("/api/stats", async (req, res) => {
  resetDailyIfNeeded();
  removeExpiredIPs();
  const successful = db.data.ips.length;
  const duplicateCount = Object.values(db.data.duplicates).reduce(
    (a, b) => a + b,
    0
  );
  res.json({ successful, duplicateCount });
});

app.post("/api/check", async (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: "IP address required" });

  resetDailyIfNeeded();
  removeExpiredIPs();

  const now = DateTime.now().toISO();
  const exists = db.data.ips.some((entry) => entry.ip === ip);

  if (exists) {
    db.data.duplicates[ip] = (db.data.duplicates[ip] || 0) + 1;
    await db.write();
    res.json({ status: "duplicate" });
  } else {
    db.data.ips.push({ ip, date: now });
    await db.write();
    res.json({ status: "added" });
  }
});

// Serve frontend for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Correct port handling for both local & Vercel
const PORT = process.env.PORT || 3000;

// Start server locally
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () =>
    console.log(`✅ Server running at http://localhost:${PORT}`)
  );
}

// ✅ Export app for Vercel serverless function
export default app;
