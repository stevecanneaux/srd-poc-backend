// api/places/hours.ts
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY as string;

type Weekly = { day: number; open: string; close: string };

function pad2(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function secToHHMM(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${pad2(h)}:${pad2(m)}`;
}

// Google Places "periods" -> our weekly array (0=Sun..6=Sat)
// periods example: [{ open:{day:0,time:"0900"}, close:{day:0,time:"1700"}}, ...]
function periodsToWeekly(periods?: any[]): Weekly[] | undefined {
  if (!Array.isArray(periods)) return undefined;
  const out: Weekly[] = [];
  for (const p of periods) {
    const od = typeof p?.open?.day === 'number' ? p.open.day : undefined; // 0..6 (Sun..Sat)
    const cd = typeof p?.close?.day === 'number' ? p.close.day : od;
    const ot: string | undefined = p?.open?.time;  // "HHMM"
    const ct: string | undefined = p?.close?.time; // "HHMM"
    if (od == null || !ot || !ct) continue;

    // If close.day rolls to next day, we’ll still store it under the open day.
    const openHHMM = `${ot.slice(0,2)}:${ot.slice(2,4)}`;
    const closeHHMM = `${ct.slice(0,2)}:${ct.slice(2,4)}`;
    out.push({ day: od, open: openHHMM, close: closeHHMM });
  }
  return out.length ? out : undefined;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    if (!GOOGLE_MAPS_KEY) return res.status(500).json({ error: 'Missing GOOGLE_MAPS_KEY' });

    const body = req.body || {};
    const placeIds: string[] = body.placeIds || [];
    if (!placeIds.length) return res.status(400).json({ error: 'placeIds required' });

    const results: any[] = [];

    for (const pid of placeIds) {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(pid)}&fields=opening_hours,utc_offset_minutes,name,geometry&key=${encodeURIComponent(GOOGLE_MAPS_KEY)}`;
      const r = await fetch(url);
      if (!r.ok) {
        results.push({
          placeId: pid,
          openingHours: [{ day: 1, open: '09:00', close: '17:00' }],
          intakeCutoffMinutesBeforeClose: 30
        });
        continue;
      }
      const data = await r.json();
      const resu = data?.result;

      const weekly = periodsToWeekly(resu?.opening_hours?.periods);
      const coords = resu?.geometry?.location
        ? { lat: resu.geometry.location.lat, lng: resu.geometry.location.lng }
        : undefined;

      results.push({
        placeId: pid,
        name: resu?.name,
        coords,
        openingHours: weekly ?? [{ day: 1, open: '09:00', close: '17:00' }],
        intakeCutoffMinutesBeforeClose: 30
      });
    }

    res.status(200).json({ hours: results });
  } catch (e: any) {
    res.status(500).json({ error: 'Internal error', detail: String(e?.message || e) });
  }
}
