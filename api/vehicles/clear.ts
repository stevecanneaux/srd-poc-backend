// api/vehicles/clear.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

// ✅ Connect to Upstash Redis using Vercel environment variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
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
    // ✅ Delete the vehicles key in Redis
    await redis.del("vehicles:list");

    console.log("🧹 Cleared all stored vehicles from Redis");

    res.status(200).json({
      success: true,
      message: "All vehicles cleared successfully",
    });
  } catch (err: any) {
    console.error("Vehicle clear failed:", err);
    res.status(500).json({
      error: "Internal Server Error",
      detail: err.message,
    });
  }
}
