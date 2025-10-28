// api/optimize.ts
type Coord = { lat: number; lng: number };
type Job = {
  id: string;
  pickup: Coord;
  dropoffPlaceId: string;
  dropoffFallbackPlaceIds?: string[];
  vehicleType?: string;
  priority?: number;
};
type Vehicle = {
  id: string;
  location: Coord;
  shiftEnd: string;
  capabilities?: string[];
  allowOvertime?: boolean;
};
type Policies = {
  noNewJobLastMinutes?: number;
  maxOvertimeMinutes?: number;
  preferBrandMatch?: boolean;
};
type Weekly = { day: number; open: string; close: string };
type Garage = {
  placeId: string;
  name?: string;
  coords?: Coord;
  openingHours?: Weekly[];
  intakeCutoffMinutesBeforeClose?: number;
};

function hhmmToDate(base: Date, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}
function cutoffFor(date: Date, hours: Weekly[] | undefined, cutoffMins: number) {
  const dow = date.getDay(); // 0..6 Sun..Sat
  const today = hours?.find(h => h.day === dow);
  if (!today) {
    // closed today: return cutoff in the past to force "miss"
    return new Date(date.getTime() - 1);
  }
  const closeAt = hhmmToDate(date, today.close);
  return new Date(closeAt.getTime() - cutoffMins * 60000);
}

async function callMatrix(origins: Coord[], destinations: Coord[]) {
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
  const resp = await fetch(`${base}/api/eta/matrix`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ origins, destinations })
  });
  if (!resp.ok) throw new Error(`matrix ${resp.status}`);
  const data = await resp.json();
  return data.minutes as number[][];
}

async function fetchHours(placeIds: string[]): Promise<Record<string, Garage>> {
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
  const resp = await fetch(`${base}/api/places/hours`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ placeIds })
  });
  if (!resp.ok) throw new Error(`hours ${resp.status}`);
  const data = await resp.json();
  const map: Record<string, Garage> = {};
  for (const g of data.hours || []) map[g.placeId] = g;
  return map;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
    const now = new Date(body?.now || new Date().toISOString());
    const jobs: Job[] = body?.jobs ?? [];
    const vehicles: Vehicle[] = body?.vehicles ?? [];
    const policies: Policies = body?.policies ?? { noNewJobLastMinutes: 60, maxOvertimeMinutes: 0 };

    const assignments: any[] = [];
    const unassigned: string[] = [];

    // Preload garage hours for all unique placeIds
    const placeIds = Array.from(new Set(jobs.flatMap(j => [j.dropoffPlaceId, ...(j.dropoffFallbackPlaceIds || [])])));
    const garageMap = await fetchHours(placeIds);

    for (const job of jobs) {
      let best: any = null;

      for (const v of vehicles) {
        // Last-hour rule
        const shiftEnd = new Date(v.shiftEnd || now);
        const minutesLeft = (shiftEnd.getTime() - now.getTime()) / 60000;
        if (minutesLeft <= (policies.noNewJobLastMinutes ?? 60) && !v.allowOvertime) continue;

        // ETAs: vehicle->pickup, pickup->dropoff
        const m1 = await callMatrix([v.location], [job.pickup]);
        const pickupEta = m1[0][0];
        // choose dropoff coords (from places/hours if present; otherwise skip feasibility)
        const primaryGarage = garageMap[job.dropoffPlaceId];
        const dropCoords = primaryGarage?.coords;
        let dropoffEta = 9999;
        if (dropCoords) {
          const m2 = await callMatrix([job.pickup], [dropCoords]);
          dropoffEta = m2[0][0];
        }

        // serviceTime (on-site hook/load) — PoC constant 10 mins
        const serviceMins = 10;
        const arrivalAtDrop = new Date(now.getTime() + (pickupEta + dropoffEta + serviceMins) * 60000);

        // intake cutoff check
        const cutoffMins = primaryGarage?.intakeCutoffMinutesBeforeClose ?? 30;
        const willMissCutoff = dropCoords
          ? (arrivalAtDrop > cutoffFor(now, primaryGarage?.openingHours, cutoffMins))
          : false;

        const willExceedShift = arrivalAtDrop > new Date(shiftEnd.getTime() + (policies.maxOvertimeMinutes ?? 0) * 60000);

        // If primary will miss cutoff, try first fallback (simple PoC)
        let chosenPlaceId = job.dropoffPlaceId;
        if (willMissCutoff && job.dropoffFallbackPlaceIds?.length) {
          const fbId = job.dropoffFallbackPlaceIds[0];
          const fb = garageMap[fbId];
          if (fb?.coords) {
            const m3 = await callMatrix([job.pickup], [fb.coords]);
            const fbEta = m3[0][0];
            const fbArrival = new Date(now.getTime() + (pickupEta + fbEta + serviceMins) * 60000);
            const fbCutoff = cutoffFor(now, fb.openingHours, fb.intakeCutoffMinutesBeforeClose ?? 30);
            if (fbArrival <= fbCutoff) {
              chosenPlaceId = fbId;
              dropoffEta = fbEta;
            } else {
              // still miss; leave chosen as primary and mark willMissCutoff
            }
          }
        }

        if (dropoffEta >= 9999) continue; // no route
        if (willExceedShift) continue;     // violates shift policy

        const candidate = {
          jobId: job.id,
          vehicleId: v.id,
          dropoffPlaceId: chosenPlaceId,
          pickupEtaMinutes: pickupEta,
          dropoffEtaMinutes: dropoffEta,
          willMissCutoff: chosenPlaceId === job.dropoffPlaceId ? willMissCutoff : false,
          willExceedShift,
          reason: `Pickup ~${pickupEta}m, drop-off ~${dropoffEta}m. ${chosenPlaceId===job.dropoffPlaceId ? (willMissCutoff?'Primary near cutoff—monitor.':'Within intake window.') : 'Fallback chosen to meet intake cutoff.'}`
        };

        if (!best || (candidate.pickupEtaMinutes + candidate.dropoffEtaMinutes) < (best.pickupEtaMinutes + best.dropoffEtaMinutes)) {
          best = candidate;
        }
      }

      if (best) assignments.push(best); else unassigned.push(job.id);
    }

    return res.status(200).json({ assignments, unassigned, notes: 'v1-google-live' });
  } catch (err: any) {
    console.error('optimize error', err);
    return res.status(500).json({ error: 'Internal error', detail: String(err?.message || err) });
  }
}
