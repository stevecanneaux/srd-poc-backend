// api/optimize-v2.ts
type Coord = { lat: number; lng: number };
type VehicleType = "van_only"|"van_tow"|"small_ramp"|"hiab_grabber"|"lorry_recovery"|"moto_recovery"|"moto_repair";
type IssueType = "repair"|"repair_possible_recovery"|"recovery_only";

type Vehicle = {
  id: string;
  type: VehicleType;
  location: Coord;
  shiftEnd: string;
  capabilities?: string[];
  allowOvertime?: boolean;
};

type JobV2 = {
  id: string;
  pickup: Coord;
  issueType: IssueType;
  vehicleSize: "motorcycle"|"small_car"|"standard_car"|"van"|"lorry";
  preferredDropPlaceId?: string;
  secondaryDropPlaceId?: string;
  homeFallback: Coord;
  priority?: number;
};

type Weekly = { day: number; open: string; close: string };
type Garage = {
  placeId: string;
  name?: string;
  coords?: Coord;
  openingHours?: Weekly[];
};

type PoliciesV2 = {
  maxLegMiles?: number;
  noNewJobLastMinutes?: number;
  maxOvertimeMinutes?: number;
  serviceMinutes?: number;
  intakeCutoffMinutesBeforeClose?: number;
  enableMeetAndSwap?: boolean;
};

type RouteLeg = {
  from: Coord;
  to: Coord;
  miles: number;
  etaMinutes: number;
  vehicleId: string;
  note?: string;
};

type AssignmentV2 = {
  jobId: string;
  legs: RouteLeg[];
  dropDecision: "preferred"|"secondary"|"home_fallback";
  willExceedShift: boolean;
  reason: string;
};

function hhmmToDate(base: Date, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}
function todaysCutoff(date: Date, hours?: Weekly[], cutoffMins = 30) {
  const dow = date.getDay();
  const today = hours?.find(h => h.day === dow);
  if (!today) return new Date(date.getTime() - 1);
  const closeAt = hhmmToDate(date, today.close);
  return new Date(closeAt.getTime() - cutoffMins*60000);
}

// Updated matrix helper — forwards Bearer token from the incoming request
async function matrix(origins: Coord[], destinations: Coord[], authHeader?: string) {
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (authHeader) headers['authorization'] = authHeader;

  const r = await fetch(`${base}/api/eta/matrix`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ origins, destinations })
  });

  if (!r.ok) throw new Error(`matrix ${r.status}`);
  const data = await r.json();
  return { minutes: data.minutes as number[][], miles: data.miles as number[][] };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const authHeader = req.headers?.authorization || '';
    const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
    const now = new Date(body?.now || new Date().toISOString());
    const jobs: JobV2[] = body?.jobs ?? [];
    const vehicles: Vehicle[] = body?.vehicles ?? [];
    const garages: Garage[] = body?.garages ?? [];
    const policies: PoliciesV2 = {
      maxLegMiles: 30,
      noNewJobLastMinutes: 60,
      maxOvertimeMinutes: 0,
      serviceMinutes: 10,
      intakeCutoffMinutesBeforeClose: 30,
      enableMeetAndSwap: true,
      ...(body?.policies || {})
    };

    const garageMap: Record<string, Garage> = {};
    for (const g of garages) garageMap[g.placeId] = g;

    const assignments: AssignmentV2[] = [];
    const unassigned: string[] = [];

    for (const job of jobs) {
      // Choose drop site per garage cutoff; else home
      let drop: Coord | null = null;
      let dropDecision: "preferred"|"secondary"|"home_fallback" = "home_fallback";
      const preferred = job.preferredDropPlaceId ? garageMap[job.preferredDropPlaceId] : undefined;
      const secondary = job.secondaryDropPlaceId ? garageMap[job.secondaryDropPlaceId] : undefined;

      if (preferred?.coords) {
        const cutoff = todaysCutoff(now, preferred.openingHours, policies.intakeCutoffMinutesBeforeClose);
        if (now <= cutoff) { drop = preferred.coords; dropDecision = "preferred"; }
      }
      if (!drop && secondary?.coords) {
        const cutoff = todaysCutoff(now, secondary.openingHours, policies.intakeCutoffMinutesBeforeClose);
        if (now <= cutoff) { drop = secondary.coords; dropDecision = "secondary"; }
      }
      if (!drop) { drop = job.homeFallback; dropDecision = "home_fallback"; }

      const needsRecovery = job.issueType !== "repair";
      const eligible = vehicles.filter(v => {
        if (!needsRecovery) return true;
        return ["van_tow","small_ramp","hiab_grabber","lorry_recovery"].includes(v.type);
      });

      let best: AssignmentV2 | null = null;

      for (const v of eligible) {
        // Last-hour rule
        const shiftEnd = new Date(v.shiftEnd);
        const minsLeft = (shiftEnd.getTime() - now.getTime()) / 60000;
        if (minsLeft <= (policies.noNewJobLastMinutes ?? 60) && !v.allowOvertime) continue;

        // Leg 1: v -> pickup
        const m1 = await matrix([v.location], [job.pickup], authHeader);
        const leg1Min = m1.minutes[0][0];
        const leg1Miles = m1.miles[0][0];
        if (leg1Miles > (policies.maxLegMiles ?? 30)) continue;

        // Leg 2: pickup -> drop
        const m2 = await matrix([job.pickup], [drop!], authHeader);
        const leg2Min = m2.minutes[0][0];
        const leg2Miles = m2.miles[0][0];

        let legs: RouteLeg[] = [];
        let totalMin = leg1Min + (policies.serviceMinutes ?? 10) + leg2Min;
        let willExceedShift = new Date(now.getTime() + totalMin*60000) > new Date(shiftEnd.getTime() + (policies.maxOvertimeMinutes ?? 0)*60000);

        if (leg2Miles <= (policies.maxLegMiles ?? 30)) {
          legs = [
            { from: v.location, to: job.pickup, miles: leg1Miles, etaMinutes: leg1Min, vehicleId: v.id, note: "to pickup" },
            { from: job.pickup, to: drop!, miles: leg2Miles, etaMinutes: leg2Min, vehicleId: v.id, note: "pickup to drop" }
          ];
        } else if (policies.enableMeetAndSwap) {
          const mid: Coord = { lat: (job.pickup.lat + drop!.lat)/2, lng: (job.pickup.lng + drop!.lng)/2 };

          // second vehicle to midpoint
          let best2: { veh: Vehicle, toMidMin: number, toMidMiles: number } | null = null;
          for (const v2 of eligible) {
            if (v2.id === v.id) continue;
            const mA = await matrix([v2.location], [mid], authHeader);
            const toMidMin = mA.minutes[0][0];
            const toMidMiles = mA.miles[0][0];
            if (toMidMiles <= (policies.maxLegMiles ?? 30)) {
              if (!best2 || toMidMin < best2.toMidMin) best2 = { veh: v2, toMidMin, toMidMiles };
            }
          }
          if (best2) {
            const v2 = best2.veh;
            const mB = await matrix([job.pickup], [mid], authHeader);
            const p2midMin = mB.minutes[0][0];
            const p2midMiles = mB.miles[0][0];
            const mC = await matrix([mid], [drop!], authHeader);
            const mid2dropMin = mC.minutes[0][0];
            const mid2dropMiles = mC.miles[0][0];

            if (p2midMiles <= (policies.maxLegMiles ?? 30) && mid2dropMiles <= (policies.maxLegMiles ?? 30)) {
              const totalMinSwap =
                leg1Min + (policies.serviceMinutes ?? 10) + p2midMin +
                best2.toMidMin + (policies.serviceMinutes ?? 10) + mid2dropMin;

              const exceed1 = new Date(now.getTime() + (leg1Min + (policies.serviceMinutes ?? 10) + p2midMin)*60000)
                > new Date(new Date(v.shiftEnd).getTime() + (policies.maxOvertimeMinutes ?? 0)*60000);
              const exceed2 = new Date(now.getTime() + (best2.toMidMin + (policies.serviceMinutes ?? 10) + mid2dropMin)*60000)
                > new Date(new Date(v2.shiftEnd).getTime() + (policies.maxOvertimeMinutes ?? 0)*60000);

              willExceedShift = exceed1 || exceed2;

              legs = [
                { from: v.location, to: job.pickup, miles: leg1Miles, etaMinutes: leg1Min, vehicleId: v.id, note: "to pickup" },
                { from: job.pickup, to: mid, miles: p2midMiles, etaMinutes: p2midMin, vehicleId: v.id, note: "to rendezvous" },
                { from: v2.location, to: mid, miles: best2.toMidMiles, etaMinutes: best2.toMidMin, vehicleId: v2.id, note: "second vehicle to rendezvous" },
                { from: mid, to: drop!, miles: mid2dropMiles, etaMinutes: mid2dropMin, vehicleId: v2.id, note: "to drop (swap)" }
              ];
              totalMin = totalMinSwap;
            } else {
              continue;
            }
          } else {
            continue;
          }
        } else {
          continue;
        }

        const assign: AssignmentV2 = {
          jobId: job.id,
          legs,
          dropDecision,
          willExceedShift,
          reason:
            dropDecision === "home_fallback"
              ? "Garage cut-off passed; defaulting to customer home."
              : (policies.enableMeetAndSwap && legs.length > 2
                  ? "Meet-and-swap planned to keep legs ≤ allowed miles."
                  : "Direct within per-leg miles limit.")
        };

        if (!best || legs.reduce((a,l)=>a+l.etaMinutes,0) < best.legs.reduce((a,l)=>a+l.etaMinutes,0)) {
          best = assign;
        }
      }

      if (best) assignments.push(best); else unassigned.push(job.id);
    }

    res.status(200).json({ assignments, unassigned, notes: "optimize-v2 using real miles from Google DM" });
  } catch (e: any) {
    console.error("optimize-v2 error", e);
    res.status(500).json({ error: "Internal error", detail: String(e?.message || e) });
  }
}
