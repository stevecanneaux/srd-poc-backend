// api/vehicles/list.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

// 🔧 Ensure same structure used by /api/vehicles/update
type Coord = { lat: number; lng: number };
type VehicleType =
  | "van_only"
  | "van_tow"
  | "small_ramp"
  | "hiab_grabber"
  | "lorry_recovery"
  | "moto_recovery"
  | "moto_repair";

type Vehicle = {
  id: string;
  type: VehicleType;
  postcode: string;
  shiftStart: string;
  shiftEnd: string;
  location?: Coord;
};

// ✅ Enable CORS so frontend can connect
function setCORS(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  // 🧠 Stored in-memory so frontend can poll updates
  const vehicles: Vehicle[] = (globalThis as any).pendingVehicles ?? [];

  res.status(200).json({
    success: true,
    count: vehicles.length,
    vehicles,
  });
}
