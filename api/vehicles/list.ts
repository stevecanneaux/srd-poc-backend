// api/vehicles/list.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import fs from "fs";
import path from "path";

const filePath = path.join("/tmp", "vehicles.json");

// ✅ Enable CORS
function setCORS(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    let vehicles: any[] = [];
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      vehicles = JSON.parse(data);
    }

    res.status(200).json({
      success: true,
      count: vehicles.length,
      vehicles,
    });
  } catch (err: any) {
    console.error("Vehicle list error:", err);
    res.status(500).json({ error: "Failed to load vehicles", detail: err.message });
  }
}
