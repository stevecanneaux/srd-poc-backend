// /backend/api/assignments/list.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

// ✅ Connect to Upstash Redis using environment variables
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// ✅ Set CORS headers for API access
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
    // ✅ Retrieve assignments from Redis
    const assignments = (await redis.get("assignments:list")) || [];
    const unassigned = (await redis.get("assignments:unassigned")) || [];

    res.status(200).json({
      success: true,
      assignments,
      unassigned,
      count: Array.isArray(assignments) ? assignments.length : 0,
      message: "Assignments loaded successfully from Redis.",
    });
  } catch (err: any) {
    console.error("Assignment list error:", err);
    res.status(500).json({
      error: "Failed to load assignments",
      detail: err.message,
    });
  }
}
