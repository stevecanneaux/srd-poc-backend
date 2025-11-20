// api/jobs/list.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

// ✅ Connect to Upstash Redis using Vercel KV environment variables
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// ✅ CORS setup
function setCORS(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    // ✅ Get jobs from Redis
    const jobs = (await redis.get("jobs:list")) || [];

    res.status(200).json({
      success: true,
      count: Array.isArray(jobs) ? jobs.length : 0,
      jobs,
    });
  } catch (err: any) {
    console.error("Job list error:", err);
    res.status(500).json({ error: "Failed to load jobs", detail: err.message });
  }
}
