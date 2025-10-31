// api/optimize-v2.ts

type Coord = { lat: number; lng: number };
type VehicleType =
  | "van_only"
  | "van_tow"
  | "small_ramp"
  | "hiab_grabber"
  | "lorry_recovery"
  | "moto_recovery"
  | "moto_repair";
type IssueType = "repair" | "repair_possible_recovery" | "recovery_only";

type Vehicle = {
  id: string;
  type: VehicleType;
  location: Coord;
  shiftEnd: string; // ISO
  capabilities?: string[];
  allowOvertime?: boolean;
};

type JobV2 = {
  id: string;
  pickup: Coord;
  issueType: IssueType;
  vehicleSize: "motorcycle" | "small_car" | "standard_car" | "van" | "lorry";
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
  intakeCutoffMinutesBeforeClose?: number;
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
  dropDecision: "preferred" | "secondary" | "home_fallback";
  willExceedShift: boolean;
  reason: string;
};

// -------------------- helpers --------------------

function hhmmToDate(base: Date, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

function todaysCutoff(date: Date, hours?: Weekly[], cutoffMins = 30) {
  const dow = date.getDay();
  const today = hours?.find((h) => h.day === dow);
  if (!today) return new Date(date.getTime() - 1);
  const closeAt = hhmmToDate(date, today.close);
  return new Date(closeAt.getTime() - cutoffMins * 60000);
}

function resolveOrigin(req: any) {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const host = req?.headers?.host;
  if (host) return `https://${host}`;
  return "https://srd-poc-backend.vercel.app";
}

async function matrix(req: any, origins: Coord[], destinations: Coord[]) {
  const base = resolveOrigin(req);
  const headers: Record<string, string> = { "content-type": "application/json" };
  const authHeader = req.headers?.authorization;
  if (authHeader) headers["authorization"] = authHeader;

  const r = await fetch(`${base}/api/eta/matrix`, {
    method: "POST",
    headers,
    body: JSON.stringify({ origins, destinations }),
  });

  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    throw new Error(`matrix ${r.status}${detail ? `: ${detail}` : ""}`);
  }
  const data = await r.json();
  return { minutes: data.minutes || [], miles: data.miles || [] };
}

// 🪵 Debug helper
function logDebug(...args: any[]) {
  if (process.env.NODE_ENV !== "production") console.log("[optimize-v2]", ...args);
}

// -------------------- main handler --------------------

export default async function handler(req: any, res: any) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const body =
      typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    const now = body?.now ? new Date(body.now) : new Date();

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
      ...(body?.policies || {}),
    };

    const garageMap: Record<string, Garage> = {};
    for (const g of garages) garageMap[g.placeId] = g;

    const assignments: AssignmentV2[] = [];
    const unassigned: string[] = [];

    logDebug(`Starting optimization run at ${now.toISOString()}`);
    logDebug(`Jobs: ${jobs.length}, Vehicles: ${vehicles.length}`);

    // -------------------- optimization loop --------------------
    for (const job of jobs) {
      let drop: Coord | null = null;
      let dropDecision: "preferred" | "secondary" | "home_fallback" =
        "home_fallback";

      const preferred = job.preferredDropPlaceId
        ? garageMap[job.preferredDropPlaceId]
        : undefined;
      const secondary = job.secondaryDropPlaceId
        ? garageMap[job.secondaryDropPlaceId]
        : undefined;

      if (preferred?.coords) {
        const cutoff = todaysCutoff(
          now,
          preferred.openingHours,
          preferred.intakeCutoffMinutesBeforeClose ??
            policies.intakeCutoffMinutesBeforeClose ??
            30
        );
        if (now <= cutoff) {
          drop = preferred.coords;
          dropDecision = "preferred";
        }
      }

      if (!drop && secondary?.coords) {
        const cutoff = todaysCutoff(
          now,
          secondary.openingHours,
          secondary.intakeCutoffMinutesBeforeClose ??
            policies.intakeCutoffMinutesBeforeClose ??
            30
        );
        if (now <= cutoff) {
          drop = secondary.coords;
          dropDecision = "secondary";
        }
      }

      if (!drop) {
        drop = job.homeFallback;
        dropDecision = "home_fallback";
      }

      const needsRecovery = job.issueType !== "repair";
      const eligible = vehicles.filter((v) => {
        if (!needsRecovery) return true;
        return [
          "van_tow",
          "small_ramp",
          "hiab_grabber",
          "lorry_recovery",
        ].includes(v.type);
      });

      let best: AssignmentV2 | null = null;

      for (const v of eligible) {
        const shiftEnd = new Date(v.shiftEnd);
        const minsLeft = (shiftEnd.getTime() - now.getTime()) / 60000;
        if (
          minsLeft <= (policies.noNewJobLastMinutes ?? 60) &&
          !v.allowOvertime
        )
          continue;

        const m1 = await matrix(req, [v.location], [job.pickup]);
        const leg1Min = m1.minutes[0][0];
        const leg1Miles = m1.miles[0][0];
        if (leg1Miles > (policies.maxLegMiles ?? 30)) continue;

        const m2 = await matrix(req, [job.pickup], [drop!]);
        const leg2Min = m2.minutes[0][0];
        const leg2Miles = m2.miles[0][0];

        const maxMiles = policies.maxLegMiles ?? 30;
        const needsSwap = leg1Miles > maxMiles || leg2Miles > maxMiles;

        let legs: RouteLeg[] = [];

        if (!needsSwap) {
          // direct route
          legs = [
            {
              from: v.location,
              to: job.pickup,
              miles: leg1Miles,
              etaMinutes: leg1Min,
              vehicleId: v.id,
              note: "to pickup",
            },
            {
              from: job.pickup,
              to: drop!,
              miles: leg2Miles,
              etaMinutes: leg2Min,
              vehicleId: v.id,
              note: "pickup to drop",
            },
          ];
        } else if (policies.enableMeetAndSwap) {
          // meet and swap logic
          const mid: Coord = {
            lat: (job.pickup.lat + drop!.lat) / 2,
            lng: (job.pickup.lng + drop!.lng) / 2,
          };

          let best2: { veh: Vehicle; toMidMin: number; toMidMiles: number } | null =
            null;

          for (const v2 of eligible) {
            if (v2.id === v.id) continue;
            const mA = await matrix(req, [v2.location], [mid]);
            const toMidMin = mA.minutes[0][0];
            const toMidMiles = mA.miles[0][0];
            if (toMidMiles <= maxMiles) {
              if (!best2 || toMidMin < best2.toMidMin)
                best2 = { veh: v2, toMidMin, toMidMiles };
            }
          }

          if (best2) {
            const v2 = best2.veh;
            const mB = await matrix(req, [job.pickup], [mid]);
            const p2midMin = mB.minutes[0][0];
            const p2midMiles = mB.miles[0][0];
            const mC = await matrix(req, [mid], [drop!]);
            const mid2dropMin = mC.minutes[0][0];
            const mid2dropMiles = mC.miles[0][0];

            if (p2midMiles <= maxMiles && mid2dropMiles <= maxMiles) {
              legs = [
                {
                  from: v.location,
                  to: job.pickup,
                  miles: leg1Miles,
                  etaMinutes: leg1Min,
                  vehicleId: v.id,
                  note: "to pickup",
                },
                {
                  from: job.pickup,
                  to: mid,
                  miles: p2midMiles,
                  etaMinutes: p2midMin,
                  vehicleId: v.id,
                  note: "to rendezvous",
                },
                {
                  from: v2.location,
                  to: mid,
                  miles: best2.toMidMiles,
                  etaMinutes: best2.toMidMin,
                  vehicleId: v2.id,
                  note: "second vehicle to rendezvous",
                },
                {
                  from: mid,
                  to: drop!,
                  miles: mid2dropMiles,
                  etaMinutes: mid2dropMin,
                  vehicleId: v2.id,
                  note: "to drop (swap)",
                },
              ];
            }
          }
        }

        const totalMin =
          leg1Min + (policies.serviceMinutes ?? 10) + leg2Min;
        const willExceedShift =
          new Date(now.getTime() + totalMin * 60000) >
          new Date(
            shiftEnd.getTime() +
              (policies.maxOvertimeMinutes ?? 0) * 60000
          );

        const assign: AssignmentV2 = {
          jobId: job.id,
          legs,
          dropDecision,
          willExceedShift,
          reason:
            dropDecision === "home_fallback"
              ? "Garage cut-off passed; defaulting to customer home."
              : policies.enableMeetAndSwap && legs.length > 2
              ? "Meet-and-swap planned to keep legs ≤ allowed miles."
              : "Direct within per-leg miles limit.",
        };

        if (
          !best ||
          legs.reduce((a, l) => a + l.etaMinutes, 0) <
            best.legs.reduce((a, l) => a + l.etaMinutes, 0)
        )
          best = assign;
      }

      if (best) {
        assignments.push(best);
        logDebug(
          `Job ${job.id} assigned: ${best.legs.length} legs (${best.reason})`
        );
      } else {
        unassigned.push(job.id);
        logDebug(`Job ${job.id} could not be assigned`);
      }
    }

    logDebug(
      `Optimization complete. Assigned: ${assignments.length}, Unassigned: ${unassigned.length}`
    );

    // -------------------- respond --------------------
    res.status(200).json({
      assignments,
      unassigned,
      notes: "optimize-v2 using real miles (auth forwarded)",
    });
  } catch (e: any) {
    console.error("optimize-v2 error", e);
    res.status(500).json({
      error: "Internal error",
      detail: String(e?.message || e),
    });
  }
}
