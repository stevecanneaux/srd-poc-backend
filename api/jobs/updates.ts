// /backend/api/jobs/update.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

// ✅ Connect to Upstash Redis using current Vercel KV env vars
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// ✅ CORS setup
function setCORS(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { jobs } = req.body;

    if (!jobs || !Array.isArray(jobs)) {
      return res.status(400).json({ error: "Invalid job data" });
    }

    // ✅ Save jobs list to Redis
    await redis.set("jobs:list", jobs);

    console.log(`🧾 Updated jobs list (${jobs.length} total)`);

    res.status(200).json({
      success: true,
      count: jobs.length,
      message: "Jobs updated and saved successfully",
    });
  } catch (err: any) {
    console.error("Job update failed:", err);
    res.status(500).json({ error: "Internal Server Error", detail: err.message });
  }
}
