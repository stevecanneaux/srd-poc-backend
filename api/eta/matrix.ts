// api/eta/matrix.ts
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY as string;

type Coord = { lat: number; lng: number };

function joinLatLng(arr: Coord[]) {
  return arr.map(c => `${c.lat},${c.lng}`).join('|');
}
function metersToMiles(m: number) {
  return m / 1609.344;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    if (!GOOGLE_MAPS_KEY) return res.status(500).json({ error: 'Missing GOOGLE_MAPS_KEY' });

    const body = req.body || {};
    const origins: Coord[] = body.origins || [];
    const destinations: Coord[] = body.destinations || [];
    if (!origins.length || !destinations.length) {
      return res.status(400).json({ error: 'origins and destinations required' });
    }

    const params = new URLSearchParams({
      origins: joinLatLng(origins),
      destinations: joinLatLng(destinations),
      departure_time: 'now',
      key: GOOGLE_MAPS_KEY
    });

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;
    const resp = await fetch(url);
    const text = await resp.text();
    if (!resp.ok) {
      return res.status(resp.status).json({
        error: 'Google Distance Matrix error',
        detail: text
      });
    }
    const data = JSON.parse(text);

    const minutes: number[][] = [];
    const miles: number[][] = [];

    for (const row of data.rows || []) {
      const rowMins: number[] = [];
      const rowMiles: number[] = [];
      for (const el of row.elements || []) {
        const secs = el?.duration_in_traffic?.value ?? el?.duration?.value ?? null;
        const meters = el?.distance?.value ?? null;
        rowMins.push(secs == null ? 9999 : Math.max(1, Math.round(secs / 60)));
        rowMiles.push(meters == null ? 9999 : Math.max(0.1, Math.round(metersToMiles(meters) * 10) / 10));
      }
      minutes.push(rowMins);
      miles.push(rowMiles);
    }

    res.status(200).json({ minutes, miles });
  } catch (e: any) {
    res.status(500).json({ error: 'Internal error', detail: String(e?.message || e) });
  }
}
