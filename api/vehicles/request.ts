// /api/vehicles/request.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { parse } from "postcode"; // optional small util, or use regex

type VehicleNeed = {
  jobId: string;
  coords: { lat: number; lng: number };
  reason: string;
  suggestedType: string;
  postcodeArea?: string;
  overdueRisk?: boolean;
};

const requests: VehicleNeed[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { jobId, coords, reason, vehicleHint, shiftRisk } = req.body;

    // Derive a postcode region (if known) using Google Reverse Geocode or simple regex fallback
    let postcodeArea = "";
    try {
      const geo = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${process.env.GOOGLE_API_KEY}`
      ).then(r => r.json());
      const pc = geo.results?.[0]?.address_components?.find((c: any) =>
        c.types.includes("postal_code")
      )?.long_name;
      if (pc) postcodeArea = pc.slice(0, 3).toUpperCase();
    } catch {
      postcodeArea = "Unknown";
    }

    // Infer vehicle type need
    const suggestedType =
      /hiab/i.test(reason) || vehicleHint === "hiab_grabber"
        ? "HIAB"
        : /tow|recovery/i.test(reason)
        ? "Tow Van"
        : "Van";

    const overdueRisk = !!shiftRisk;

    requests.push({ jobId, coords, reason, suggestedType, postcodeArea, overdueRisk });

    // --- Group and summarise for admin alert ---
    const summary = requests
      .map(
        (r) =>
          `${r.suggestedType} in ${r.postcodeArea}${r.overdueRisk ? " (shift risk)" : ""}`
      )
      .join("; ");

    const message = `⚠️ Vehicle Requests:\n${requests.length} vehicle(s) needed:\n${summary}`;

    console.log(message); // local log for Vercel console

    // Example: send alert to Slack, Teams, or email
    await fetch(process.env.DISPATCH_ALERT_WEBHOOK!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });

    return res.status(200).json({ ok: true, summary: message });
  } catch (err: any) {
    console.error("Vehicle request error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
