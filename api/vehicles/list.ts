// api/vehicles/list.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

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
    // ✅ Get vehicles from Redis
    const vehicles = (await redis.get("vehicles:list")) || [];

    res.status(200).json({
      success: true,
      count: Array.isArray(vehicles) ? vehicles.length : 0,
      vehicles,
    });
  } catch (err: any) {
    console.error("Vehicle list error:", err);
    res.status(500).json({ error: "Failed to load vehicles", detail: err.message });
  }
}
