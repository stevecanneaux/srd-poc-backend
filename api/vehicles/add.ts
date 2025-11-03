// api/vehicles/add.ts

/**
 * This endpoint allows admins to manually add vehicles into the active pool.
 * These vehicles are stored temporarily (in-memory) and can be accessed
 * by optimize-v2 in the next scheduling run.
 *
 * Example request:
 * POST /api/vehicles/add
 * {
 *   "vehicles": [
 *     {
 *       "id": "TEMP_TOW1",
 *       "type": "van_tow",
 *       "location": { "lat": 51.41, "lng": -0.37 },
 *       "shiftEnd": "2025-11-01T22:00Z",
 *       "allowOvertime": true
 *     }
 *   ]
 * }
 */

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
  location: Coord;
  shiftEnd: string;
  capabilities?: string[];
  allowOvertime?: boolean;
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    const newVehicles: Vehicle[] = body?.vehicles ?? [];

    if (!Array.isArray(newVehicles) || newVehicles.length === 0) {
      return res.status(400).json({ error: "No vehicles provided" });
    }

    // Initialize global storage if not present
    (globalThis as any).pendingVehicles = (globalThis as any).pendingVehicles || [];

    // Merge (and deduplicate by ID)
    const existing: Vehicle[] = (globalThis as any).pendingVehicles;
    const updated = [
      ...existing.filter((v) => !newVehicles.some((nv) => nv.id === v.id)),
      ...newVehicles,
    ];

    (globalThis as any).pendingVehicles = updated;

    res.status(200).json({
      message: `${newVehicles.length} new vehicle${newVehicles.length > 1 ? "s" : ""} added.`,
      totalAvailable: updated.length,
      vehicles: updated,
      note: "These vehicles will be used in the next optimization run.",
    });
  } catch (e: any) {
    console.error("vehicles/add error", e);
    res.status(500).json({ error: "Internal server error", detail: String(e?.message || e) });
  }
}
