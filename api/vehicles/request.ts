// /pages/api/vehicles/request.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { jobId, reason, coords } = req.body;

    // Log or forward to fleet control system (Slack, dispatch API, etc.)
    console.log(`⚠️ Vehicle request for job ${jobId}: ${reason}`);
    
    // Example: send Slack alert or message queue event
    await fetch(process.env.DISPATCH_ALERT_WEBHOOK!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `New van required for ${jobId}. Pickup near ${coords.lat}, ${coords.lng}. Reason: ${reason}`
      })
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Vehicle request error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}
