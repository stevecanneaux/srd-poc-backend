// /backend/api/vehicles/update.ts
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
    const { vehicles } = req.body;

    if (!vehicles || !Array.isArray(vehicles)) {
      return res.status(400).json({ error: "Invalid vehicle data" });
    }

    // ✅ Save vehicles list to Redis
    await redis.set("vehicles:list", vehicles);

    console.log(`🚚 Updated vehicles list (${vehicles.length} total)`);

    res.status(200).json({
      success: true,
      count: vehicles.length,
      message: "Vehicles updated and saved successfully",
    });
  } catch (err: any) {
    console.error("Vehicle update failed:", err);
    res.status(500).json({ error: "Internal Server Error", detail: err.message });
  }
}
