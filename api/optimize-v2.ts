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
  shiftStart?: string;
  shiftEnd: string;
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
  postcodeHint?: string;
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

function setCORS(res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

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
  const backend = process.env.SRD_BACKEND_URL || "https://srd-poc-backend.vercel.app";
  try {
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    const host = req?.headers?.host;
    if (host) return `https://${host}`;
    return backend;
  } catch {
    return backend;
  }
}

async function matrix(req: any, origins: Coord[], destinations: Coord[]) {
  try {
    const base = resolveOrigin(req);
    const headers: Record<string, string> = { "content-type": "application/json" };
    const authHeader = req?.headers?.authorization;
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
  } catch (err) {
    console.error("Matrix fetch failed", err);
    return { minutes: [[9999]], miles: [[9999]] };
  }
}

function logDebug(...args: any[]) {
  if (process.env.NODE_ENV !== "production") console.log("[optimize-v2]", ...args);
}

// -------------------- main handler --------------------

export default async function handler(req: any, res: any) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    const now = body?.now ? new Date(body.now) : new Date();

    const manualVehicles: Vehicle[] = (globalThis as any).pendingVehicles ?? [];
    const vehicles: Vehicle[] = [...(body?.vehicles ?? []), ...manualVehicles];
    const jobs: JobV2[] = body?.jobs ?? [];
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

    logDebug(`Starting optimization at ${now.toISOString()}`);
    logDebug(`Jobs: ${jobs.length}, Vehicles: ${vehicles.length}`);

    for (const job of jobs) {
      await new Promise((r) => setTimeout(r, 25));

      let drop: Coord | null = null;
      let dropDecision: "preferred" | "secondary" | "home_fallback" = "home_fallback";

      const preferred = job.preferredDropPlaceId ? garageMap[job.preferredDropPlaceId] : undefined;
      const secondary = job.secondaryDropPlaceId ? garageMap[job.secondaryDropPlaceId] : undefined;

      if (preferred?.coords) {
        const cutoff = todaysCutoff(
          now,
          preferred.openingHours,
          preferred.intakeCutoffMinutesBeforeClose ??
            policies.intakeCutoffMinutesBeforeClose ?? 30
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
            policies.intakeCutoffMinutesBeforeClose ?? 30
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
        return ["van_tow", "small_ramp", "hiab_grabber", "lorry_recovery"].includes(v.type);
      });

      let best: AssignmentV2 | null = null;

      for (const v of eligible) {
        const shiftStart = new Date(v.shiftStart || now);
        const shiftEnd = new Date(v.shiftEnd);
        const minsLeft = (shiftEnd.getTime() - now.getTime()) / 60000;

        if (now < shiftStart) continue;
        if (minsLeft <= (policies.noNewJobLastMinutes ?? 60) && !v.allowOvertime) continue;

        const m1 = await matrix(req, [v.location], [job.pickup]);
        const leg1Min = m1.minutes?.[0]?.[0] ?? 9999;
        const leg1Miles = m1.miles?.[0]?.[0] ?? 9999;
        if (!isFinite(leg1Miles) || leg1Miles > (policies.maxLegMiles ?? 30)) continue;

        const m2 = await matrix(req, [job.pickup], [drop!]);
        const leg2Min = m2.minutes?.[0]?.[0] ?? 9999;
        const leg2Miles = m2.miles?.[0]?.[0] ?? 9999;
        if (!isFinite(leg2Miles) || leg2Miles > (policies.maxLegMiles ?? 30)) continue;

        const legs: RouteLeg[] = [
          { from: v.location, to: job.pickup, miles: leg1Miles, etaMinutes: leg1Min, vehicleId: v.id, note: "to pickup" },
          { from: job.pickup, to: drop!, miles: leg2Miles, etaMinutes: leg2Min, vehicleId: v.id, note: "pickup to drop" },
        ];

        const totalMin = leg1Min + (policies.serviceMinutes ?? 10) + leg2Min;
        const willExceedShift =
          new Date(now.getTime() + totalMin * 60000) >
          new Date(shiftEnd.getTime() + (policies.maxOvertimeMinutes ?? 0) * 60000);

        const assign: AssignmentV2 = {
          jobId: job.id,
          legs,
          dropDecision,
          willExceedShift,
          reason:
            dropDecision === "home_fallback"
              ? "Garage cut-off passed; defaulting to customer home."
              : "Direct within per-leg miles limit.",
        };

        if (
          !best ||
          legs.reduce((a, l) => a + l.etaMinutes, 0) <
            best.legs.reduce((a, l) => a + l.etaMinutes, 0)
        ) {
          best = assign;
        }
      }

      if (best) assignments.push(best);
      else unassigned.push(job.id);
    }

    const missingVehicles = unassigned
      .map((jobId) => {
        const job = jobs.find((j) => j.id === jobId);
        if (!job) return null;
        const typeNeeded =
          job.issueType === "recovery_only"
            ? "hiab_grabber"
            : job.issueType === "repair_possible_recovery"
            ? "van_tow"
            : "van_only";
        return {
          jobId: job.id,
          vehicleType: typeNeeded,
          pickupHint: job.postcodeHint || "near pickup area",
          coords: job.pickup,
        };
      })
      .filter(Boolean);

    const adminPrompt =
      missingVehicles.length > 0
        ? `${missingVehicles.length} additional vehicle${missingVehicles.length > 1 ? "s" : ""} required to complete all jobs.`
        : "All jobs covered.";

    res.status(200).json({
      assignments,
      unassigned,
      missingVehicles,
      adminPrompt,
      notes: "optimize-v2 safe version (added validation for empty ETA arrays)",
    });
  } catch (e: any) {
    console.error("optimize-v2 error", e);
    res.status(500).json({ error: "Internal error", detail: String(e?.message || e) });
  }
}
