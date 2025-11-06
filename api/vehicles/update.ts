// api/vehicles/update.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import fs from "fs";
import path from "path";

const filePath = path.join("/tmp", "vehicles.json");

// ✅ Enable CORS
function setCORS(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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

    // Write vehicles to file (Vercel allows /tmp)
    fs.writeFileSync(filePath, JSON.stringify(vehicles, null, 2));

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
