// api/vehicles/update.ts

import type { VercelRequest, VercelResponse } from "@vercel/node";

type Coord = { lat: number; lng: number };
type VehicleType =
  | "van_only"
  | "van_tow"
  | "small_ramp"
  | "hiab_grabber"
  | "lorry_recovery";

type Vehicle = {
  id: string;
  type: VehicleType;
  postcode: string;
  shiftStart: string;
  shiftEnd: string;
  location?: Coord;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { vehicles } = req.body;

    if (!Array.isArray(vehicles)) {
      return res.status(400).json({ error: "Invalid payload: expected { vehicles: [...] }" });
    }

    // Temporary placeholder for coordinates (until geocode integration)
    const enriched = vehicles.map((v) => ({
      ...v,
      location: { lat: 51.5 + Math.random() * 0.1, lng: -0.12 + Math.random() * 0.1 },
    }));

    // Store the new list in memory for optimizer access
    (globalThis as any).pendingVehicles = enriched;

    console.log(`[vehicles/update] Stored ${enriched.length} vehicles with shifts`);
    res.status(200).json({
      ok: true,
      count: enriched.length,
      note: "Vehicles with shift start & end stored for optimizer runs",
    });
  } catch (err) {
    console.error("[vehicles/update] error", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
