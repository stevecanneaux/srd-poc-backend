// api/dispatch-proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

// Your internal optimizer URL
const OPTIMIZE_URL = 'https://srd-poc-backend.vercel.app/api/optimize-v2';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Retrieve secret from environment (configured in Vercel settings)
    const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    if (!bypass) {
      return res.status(500).json({ error: 'Bypass secret not set' });
    }

    // Forward request to optimize-v2 with the bypass param
    const url = `${OPTIMIZE_URL}?x-vercel-protection-bypass=${bypass}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err: any) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Internal proxy error', details: err.message });
  }
}
