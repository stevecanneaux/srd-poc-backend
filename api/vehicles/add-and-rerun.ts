// /api/vehicles/add-and-rerun.ts
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Adds a new vehicle, merges it with the most recent plan,
 * and triggers a fresh optimization run.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body =
      typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    const { newVehicle, lastRun: bodyLastRun } = body;

    if (!newVehicle) {
      return res.status(400).json({ error: "newVehicle object required" });
    }

    // 🧠 Retrieve the last optimization batch
    // Prefer body.lastRun if provided, else recall from global cache
    const cachedRun = (globalThis as any).latestOptimizationRun;
    const lastRun = bodyLastRun || cachedRun;

    if (!lastRun) {
      return res.status(400).json({
        error:
          "No optimization context found. Please run /api/optimize-v2 at least once first.",
      });
    }

    // 🧩 Merge the new vehicle into the list
    const vehicles = [...(lastRun.vehicles || []), newVehicle];

    // 🛰️ Call /api/optimize-v2 to recompute schedule
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `https://${req.headers.host}`;

    const response = await fetch(`${baseUrl}/api/optimize-v2`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        now: new Date().toISOString(),
        jobs: lastRun.jobs,
        vehicles,
        garages: lastRun.garages,
        policies: lastRun.policies,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Optimizer returned ${response.status}: ${text}`);
    }

    const newSchedule = await response.json();

    // 🧾 Update the in-memory cache with the new state
    (globalThis as any).latestOptimizationRun = {
      timestamp: new Date().toISOString(),
      jobs: lastRun.jobs,
      vehicles,
      garages: lastRun.garages,
      policies: lastRun.policies,
    };

    return res.status(200).json({
      message: "✅ New vehicle added and optimizer re-run successfully.",
      newVehicle,
      newSchedule,
    });
  } catch (err: any) {
    console.error("add-and-rerun error", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
}
