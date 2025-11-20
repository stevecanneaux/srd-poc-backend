// api/jobs/clear.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

// ✅ Connect to Upstash Redis using current Vercel KV environment variables
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// ✅ Enable CORS
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
    // ✅ Delete the jobs key in Redis
    await redis.del("jobs:list");

    console.log("🧹 Cleared all stored jobs from Redis");

    res.status(200).json({
      success: true,
      message: "All jobs cleared successfully",
    });
  } catch (err: any) {
    console.error("Job clear failed:", err);
    res.status(500).json({
      error: "Internal Server Error",
      detail: err.message,
    });
  }
}
