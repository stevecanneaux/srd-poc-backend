function parseJSON(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      if (req.body && typeof req.body === 'object') return resolve(req.body);
      let data = '';
      req.on('data', (c: any) => (data += c));
      req.on('end', () => {
        try { resolve(data ? JSON.parse(data) : {}); }
        catch (e) { reject(e); }
      });
    } catch (e) { reject(e); }
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = await parseJSON(req);
    const now = new Date(body?.now || new Date().toISOString());
    const jobs = body?.jobs ?? [];
    const vehicles = body?.vehicles ?? [];
    const policies = body?.policies ?? { noNewJobLastMinutes: 60, maxOvertimeMinutes: 0 };

    // Minimal greedy assignment (demo only)
    const assignments: any[] = [];
    const unassigned: string[] = [];

    for (const job of jobs) {
      let best: any = null;

      for (const v of vehicles) {
        // last-hour rule
        const shiftEnd = new Date(v.shiftEnd || now);
        const minutesLeft = (shiftEnd.getTime() - now.getTime()) / 60000;
        const allowOvertime = !!v.allowOvertime;

        if (minutesLeft <= (policies.noNewJobLastMinutes ?? 60) && !allowOvertime) {
          continue;
        }

        // Fake ETAs just for PoC testing (replace later with real matrix)
        const pickupEtaMinutes = 8;
        const dropoffEtaMinutes = 22;

        // Intake cutoff (assume 30 min before 17:00 for demo)
        const close = new Date(now); close.setHours(17, 0, 0, 0);
        const cutoff = new Date(close.getTime() - 30 * 60000);
        const arrivalAtDrop = new Date(now.getTime() + (pickupEtaMinutes + dropoffEtaMinutes + 10) * 60000);

        const willMissCutoff = arrivalAtDrop > cutoff;
        const willExceedShift = arrivalAtDrop > new Date(shiftEnd.getTime() + (policies.maxOvertimeMinutes ?? 0) * 60000);
        if (willMissCutoff) continue;

        const candidate = {
          jobId: job.id,
          vehicleId: v.id,
          dropoffPlaceId: job.dropoffPlaceId,
          pickupEtaMinutes,
          dropoffEtaMinutes,
          willMissCutoff,
          willExceedShift,
          reason: `Within shift and intake window. ETA ~${pickupEtaMinutes + dropoffEtaMinutes} mins.`
        };

        if (!best) best = candidate;
      }

      if (best) assignments.push(best); else unassigned.push(job.id);
    }

    return res.status(200).json({ assignments, unassigned, notes: 'v0-plain-handler' });
  } catch (err: any) {
    console.error('optimize error', err);
    return res.status(500).json({ error: 'Internal error', detail: String(err?.message || err) });
  }
}
