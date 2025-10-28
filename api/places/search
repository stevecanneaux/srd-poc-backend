// api/places/search.ts
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY as string;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    if (!GOOGLE_MAPS_KEY) return res.status(500).json({ error: 'Missing GOOGLE_MAPS_KEY' });

    const body = req.body || {};
    const query = body.query || body.name || '';
    const locationBias = body.locationBias || null; // optional: {lat, lng, radiusMeters}

    if (!query) return res.status(400).json({ error: 'query required' });

    // Build parameters
    const params = new URLSearchParams({
      input: query,
      inputtype: 'textquery',
      fields: 'place_id,name,geometry,formatted_address,types',
      key: GOOGLE_MAPS_KEY
    });

    // Optional location bias (to bias results near vehicle/job area)
    if (locationBias?.lat && locationBias?.lng && locationBias?.radiusMeters) {
      params.set(
        'locationbias',
        `circle:${locationBias.radiusMeters}@${locationBias.lat},${locationBias.lng}`
      );
    }

    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params.toString()}`;

    const resp = await fetch(url);
    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: 'Google Places search error', detail: text });
    }

    const data = await resp.json();
    const cands = data?.candidates ?? [];

    const results = cands.map((c: any) => ({
      placeId: c.place_id,
      name: c.name,
      address: c.formatted_address,
      coords: c.geometry?.location
        ? { lat: c.geometry.location.lat, lng: c.geometry.location.lng }
        : undefined,
      types: c.types
    }));

    return res.status(200).json({ results });
  } catch (e: any) {
    res.status(500).json({ error: 'Internal error', detail: String(e?.message || e) });
  }
}
