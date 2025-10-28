export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const body = req.body || {};
    const placeIds: string[] = body.placeIds || [];
    const hours = placeIds.map((p) => ({
      placeId: p,
      openingHours: [{ day: 1, open: '09:00', close: '17:00' }],
      intakeCutoffMinutesBeforeClose: 30
    }));
    res.status(200).json({ hours });
  } catch (e: any) {
    res.status(500).json({ error: 'Internal error', detail: String(e?.message || e) });
  }
}
