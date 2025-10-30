// /api/vehicles/add-and-rerun.ts
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Accepts a new vehicle, merges it with the last job run,
 * and re-runs the optimizer to update the schedule.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    const { newVehicle, lastRun } = body;

    if (!newVehicle) {
      return res.status(400).json({ error: "newVehicle object required" });
    }

    // 1️⃣ Retrieve or accept the last optimization batch (jobs, vehicles, garages, policies)
    // In production, store the latest run JSON in Redis or DB for recall.
    if (!lastRun) {
      return res.status(400).json({ error: "lastRun (jobs, vehicles, garages, policies) required" });
    }

    // 2️⃣ Merge the new vehicle
    const vehicles = [...(lastRun.vehicles || []), newVehicle];

    // 3️⃣ Call /api/optimize-v2 to recompute schedule
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `https://${req.headers.host}`;

    const r = await fetch(`${baseUrl}/api/optimize-v2`, {
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

    if (!r.ok) {
      const text = await r.text();
      throw new Error(`Optimizer returned ${r.status}: ${text}`);
    }

    const data = await r.json();
    return res.status(200).json({
      message: "New vehicle added and optimizer re-run successfully.",
      newSchedule: data,
    });
  } catch (err: any) {
    console.error("add-and-rerun error", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
}
