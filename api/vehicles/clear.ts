// api/vehicles/clear.ts

/**
 * Clears all temporarily added vehicles that were stored via /api/vehicles/add.
 * Useful for resetting the schedule between planning cycles or days.
 *
 * Example:
 * POST /api/vehicles/clear
 *
 * Response:
 * {
 *   "message": "Cleared 3 pending vehicles.",
 *   "totalRemaining": 0
 * }
 */

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const existing: any[] = (globalThis as any).pendingVehicles || [];
    const clearedCount = existing.length;

    (globalThis as any).pendingVehicles = [];

    res.status(200).json({
      message: `Cleared ${clearedCount} pending vehicle${clearedCount !== 1 ? "s" : ""}.`,
      totalRemaining: 0,
      note: "The temporary vehicle pool is now empty.",
    });
  } catch (e: any) {
    console.error("vehicles/clear error", e);
    res.status(500).json({ error: "Internal server error", detail: String(e?.message || e) });
  }
}
