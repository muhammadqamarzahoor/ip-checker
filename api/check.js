import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: "IP address required" });

  const { data: existing } = await supabase
    .from("ips")
    .select("*")
    .eq("ip", ip);

  if (existing.length > 0) {
    await supabase
      .from("ips")
      .update({ duplicate_count: existing[0].duplicate_count + 1 })
      .eq("ip", ip);
    return res.json({ status: "duplicate" });
  }

  await supabase.from("ips").insert([{ ip }]);
  res.json({ status: "added" });
}
