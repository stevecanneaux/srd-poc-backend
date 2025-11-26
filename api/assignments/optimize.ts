// /backend/api/assignments/optimize.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Allow CORS
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
    // 1️⃣ Load jobs + vehicles from Redis
    const [jobs, vehicles] = await Promise.all([
      redis.get("jobs:list").then((v) => (Array.isArray(v) ? v : [])),
      redis.get("vehicles:list").then((v) => (Array.isArray(v) ? v : [])),
    ]);

    if (jobs.length === 0 || vehicles.length === 0) {
      return res.status(400).json({
        error: "Missing data",
        message: "Jobs or vehicles list is empty in Redis.",
      });
    }

    // 2️⃣ Call internal /api/optimize-v2
    const backendBase = process.env.SRD_BACKEND_URL || "https://srd-poc-backend.vercel.app";

    const response = await fetch(`${backendBase}/api/optimize-v2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ now: new Date().toISOString(), jobs, vehicles }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`optimize-v2 failed: ${response.status} ${detail}`);
    }

    const result = await response.json();

    // 3️⃣ Save assignments to Redis
    await redis.set("assignments:list", result.assignments || []);

    // 4️⃣ Return result to frontend
    res.status(200).json({
      success: true,
      ...result,
      message: "Optimization completed successfully and assignments saved to Redis.",
    });
  } catch (err: any) {
    console.error("Assignment optimization error:", err);
    res.status(500).json({
      error: "Optimization failed",
      detail: err.message || String(err),
    });
  }
}
