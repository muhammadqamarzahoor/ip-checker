import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import { DateTime } from "luxon";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const app = express();

// Path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// 🧠 Connect to Supabase (using Environment Variables)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 🕒 Helper function: Remove IPs older than 30 days
async function removeExpiredIPs() {
  const thirtyDaysAgo = DateTime.now().minus({ days: 30 }).toISO();
  await supabase.from("ips").delete().lt("created_at", thirtyDaysAgo);
}

// 📊 API: Stats
app.get("/api/stats", async (req, res) => {
  await removeExpiredIPs();

  const { data: ips } = await supabase.from("ips").select("*");
  const successful = ips?.length || 0;
  const duplicateCount = ips?.reduce((a, b) => a + (b.duplicate_count || 0), 0);

  res.json({ successful, duplicateCount });
});

// 🧩 API: Check IP
app.post("/api/check", async (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: "IP address required" });

  try {
    const { data: existing, error: selectError } = await supabase
      .from("ips")
      .select("*")
      .eq("ip", ip);

    if (selectError) {
      console.error("Select Error:", selectError);
      return res.status(500).json({ error: "Database select failed" });
    }

    if (existing && existing.length > 0) {
      const { error: updateError } = await supabase
        .from("ips")
        .update({ duplicate_count: existing[0].duplicate_count + 1 })
        .eq("ip", ip);

      if (updateError) console.error("Update Error:", updateError);
      return res.json({ status: "duplicate" });
    }

    const { error: insertError } = await supabase.from("ips").insert([{ ip }]);

    if (insertError) {
      console.error("Insert Error:", insertError);
      return res.status(500).json({ error: "Insert failed" });
    }

    res.json({ status: "added" });
  } catch (err) {
    console.error("General Error:", err);
    res.status(500).json({ error: "Unexpected error" });
  }
});

// ✅ Port for local dev or Vercel
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () =>
    console.log(`✅ Server running at http://localhost:${PORT}`)
  );
}

// Export for Vercel
export default app;
