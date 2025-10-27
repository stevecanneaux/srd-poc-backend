import { Hono } from 'hono';
const vehicleEtaToPickup = new Date(now.getTime() + pickupMins*60000);


// last-hour rule
const shiftEnd = new Date(v.shiftEnd);
const minutesLeft = (shiftEnd.getTime() - now.getTime())/60000;
if (minutesLeft <= (policies.noNewJobLastMinutes||60) && !v.allowOvertime) continue;


// check dropoff feasibility (use job.dropoffPlaceId)
// resolve dropoff coords (not needed for ETA mock) and hours
const hours = await getPlaceHours(job.dropoffPlaceId, now);
const { openAt, cutoffAt } = cutoffDateTimeFor(now, hours.open, hours.close, hours.cutoffMins);
// assume pickup 10 mins, then drive pickup->dropoff with fake 20 mins
const pickupToDropoffMins = Math.max(10, await getEtaMinutes(job.pickup, v.location));
const arrivalAtDrop = new Date(vehicleEtaToPickup.getTime() + (10 + pickupToDropoffMins)*60000);


const willMissCutoff = arrivalAtDrop > cutoffAt;
const willExceedShift = arrivalAtDrop > new Date(shiftEnd.getTime() + (policies.maxOvertimeMinutes||0)*60000);
if (willMissCutoff && job.dropoffFallbackPlaceIds?.length){
// try first fallback quickly (MVP)
const fbHours = await getPlaceHours(job.dropoffFallbackPlaceIds[0], now);
const { cutoffAt: fbCutoff } = cutoffDateTimeFor(now, fbHours.open, fbHours.close, fbHours.cutoffMins);
const fbArrival = arrivalAtDrop; // same ETA assumption for MVP
if (fbArrival <= fbCutoff){
best = { jobId: job.id, vehicleId: v.id, dropoffPlaceId: job.dropoffFallbackPlaceIds[0],
pickupEtaMinutes: pickupMins, dropoffEtaMinutes: (10 + pickupToDropoffMins),
willMissCutoff: false, willExceedShift,
reason: `Fallback drop-off chosen to meet intake cut-off. ETA ${Math.round((fbArrival.getTime()-now.getTime())/60000)} mins.` };
break;
}
}
if (!willMissCutoff){
const candidate = { jobId: job.id, vehicleId: v.id, dropoffPlaceId: job.dropoffPlaceId,
pickupEtaMinutes: pickupMins, dropoffEtaMinutes: (10 + pickupToDropoffMins),
willMissCutoff, willExceedShift,
reason: `Within shift window; intake before cut-off.` };
if (!best || candidate.pickupEtaMinutes < best.pickupEtaMinutes) best = candidate;
}
}
if (best) assignments.push(best); else unassigned.push(job.id);
}
return { assignments, unassigned, notes: 'v1-greedy' };
}


app.post('/optimize', async (c) => {
const body = await c.req.json();
const parsed = OptimizeRequest.safeParse(body);
if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
const { now, jobs, vehicles, policies } = parsed.data;
const res = await plan(new Date(now), jobs, vehicles, policies||{});
return c.json(res);
});


app.post('/eta/matrix', async (c) => {
const { origins, destinations } = await c.req.json();
// TODO: call real distance matrix; here we just return symmetric fake values
const minutes = origins.map((o:any)=>destinations.map((d:any)=>Math.round(Math.random()*25)+5));
return c.json({ minutes });
});


app.post('/places/hours', async (c) => {
const { placeIds } = await c.req.json();
const hours = (placeIds||[]).map((p:string)=>({ placeId: p, openingHours: [{day:1,open:'09:00',close:'17:00'}], intakeCutoffMinutesBeforeClose: 30 }));
return c.json({ hours });
});


app.get('/health', (c)=> c.text('ok'));


export default app;
