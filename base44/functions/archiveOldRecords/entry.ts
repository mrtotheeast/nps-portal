import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Moves Incidents (resolved/closed) and Timesheets (approved/rejected) older than 90 days into an archived state.
// Called by a daily scheduled automation.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffISO = cutoff.toISOString();

    // Archive completed/closed incidents
    const incidents = await base44.asServiceRole.entities.Incident.list();
    const incidentsToArchive = incidents.filter(i =>
      ["resolved", "closed"].includes(i.status) &&
      !i.archived &&
      i.updated_date && i.updated_date < cutoffISO
    );

    for (const incident of incidentsToArchive) {
      await base44.asServiceRole.entities.Incident.update(incident.id, { archived: true });
    }

    // Archive approved/rejected timesheets
    const timesheets = await base44.asServiceRole.entities.Timesheet.list();
    const timesheetsToArchive = timesheets.filter(t =>
      ["approved", "rejected"].includes(t.status) &&
      !t.archived &&
      t.date && new Date(t.date) < cutoff
    );

    for (const timesheet of timesheetsToArchive) {
      await base44.asServiceRole.entities.Timesheet.update(timesheet.id, { archived: true });
    }

    console.log(`Archived ${incidentsToArchive.length} incidents, ${timesheetsToArchive.length} timesheets`);

    return Response.json({
      success: true,
      archived_incidents: incidentsToArchive.length,
      archived_timesheets: timesheetsToArchive.length,
    });
  } catch (error) {
    console.error("Archive job error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});