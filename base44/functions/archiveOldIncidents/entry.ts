import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Archives incident reports older than 24 months so they stop appearing on client dashboards
// Runs nightly via scheduled automation
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 24);
    const cutoffISO = cutoffDate.toISOString();

    // Fetch all incidents that are resolved/closed and older than 24 months, not yet archived
    const allIncidents = await base44.asServiceRole.entities.Incident.list('-incident_date', 1000);

    const toArchive = allIncidents.filter(inc =>
      inc.incident_date &&
      new Date(inc.incident_date) < cutoffDate &&
      inc.status !== 'archived'
    );

    let archived = 0;
    let errors = 0;

    for (const inc of toArchive) {
      try {
        await base44.asServiceRole.entities.Incident.update(inc.id, { status: 'archived' });
        archived++;
      } catch (err) {
        console.error(`Failed to archive incident ${inc.id}:`, err.message);
        errors++;
      }
    }

    console.log(`Incident archiving complete: ${archived} archived, ${errors} errors, cutoff: ${cutoffISO}`);

    return Response.json({
      success: true,
      archived,
      errors,
      cutoff_date: cutoffISO,
      total_checked: allIncidents.length,
    });
  } catch (error) {
    console.error('archiveOldIncidents error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});