
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY as string;

type Coord = { lat: number; lng: number };

function joinLatLng(arr: Coord[]) {
  // "lat,lng|lat,lng|..."
  return arr.map(c => `${c.lat},${c.lng}`).join('|');
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

    // Build request
    const params = new URLSearchParams({
      origins: joinLatLng(origins),
      destinations: joinLatLng(destinations),
      departure_time: 'now',    // enables traffic-based travel time
      key: GOOGLE_MAPS_KEY
    });

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: 'Google Distance Matrix error', detail: text });
    }
    const data = await resp.json();

    // Parse into minutes[][]
    // data.rows[i].elements[j].duration_in_traffic.value (seconds) if available; fallback to duration.value
    const minutes: number[][] = (data.rows || []).map((row: any) =>
      (row.elements || []).map((el: any) => {
        const secs =
          el?.duration_in_traffic?.value ??
          el?.duration?.value ??
          null;
        if (secs == null) return 9999; // unreachable
        return Math.max(1, Math.round(secs / 60));
      })
    );

    res.status(200).json({ minutes });
  } catch (e: any) {
    res.status(500).json({ error: 'Internal error', detail: String(e?.message || e) });
  }
}
