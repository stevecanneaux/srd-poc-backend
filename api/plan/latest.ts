// /api/plan/latest.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const latest = (globalThis as any).latestOptimizationRun;
  if (!latest) {
    return res.status(404).json({ error: "No plan cached yet." });
  }
  res.status(200).json(latest);
}
