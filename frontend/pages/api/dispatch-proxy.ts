// /frontend/pages/api/dispatch-proxy.ts
import type { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";

// Your backend optimizer endpoint
const OPTIMIZE_URL = "https://srd-poc-backend.vercel.app/api/optimize-v2";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests from the frontend
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Grab the bypass secret from environment variables
    const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    if (!bypass) {
      return res.status(500).json({ error: "Bypass secret not set" });
    }

    // Forward the request to the backend optimizer, including the bypass token
    const url = `${OPTIMIZE_URL}?x-vercel-protection-bypass=${bypass}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // Mirror backend response to the frontend
    return res.status(response.status).json(data);
  } catch (err: any) {
    console.error("Proxy error:", err);
    return res.status(500).json({
      error: "Internal proxy error",
      details: err.message || "Unknown error",
    });
  }
}
