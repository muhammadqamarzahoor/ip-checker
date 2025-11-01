import { DateTime } from "luxon";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function removeExpiredIPs() {
  const thirtyDaysAgo = DateTime.now().minus({ days: 30 }).toISO();
  await supabase.from("ips").delete().lt("created_at", thirtyDaysAgo);
}

export default async function handler(req, res) {
  await removeExpiredIPs();

  const { data: ips } = await supabase.from("ips").select("*");
  const successful = ips?.length || 0;
  const duplicateCount = ips?.reduce((a, b) => a + (b.duplicate_count || 0), 0);

  res.json({ successful, duplicateCount });
}
