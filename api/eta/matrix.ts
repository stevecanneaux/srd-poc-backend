export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const body = req.body || {};
    const origins = body.origins || [];
    const destinations = body.destinations || [];
    const minutes = origins.map(() => destinations.map(() => Math.floor(Math.random() * 20) + 5));
    res.status(200).json({ minutes });
  } catch (e: any) {
    res.status(500).json({ error: 'Internal error', detail: String(e?.message || e) });
  }
}
