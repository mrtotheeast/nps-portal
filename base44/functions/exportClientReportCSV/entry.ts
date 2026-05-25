import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filters, incidents, checkIns, patrols } = await req.json();

    // Create CSV content
    let csv = 'Type,Date,Site,Description,Severity,Status\n';

    incidents.forEach((incident) => {
      const row = [
        'Incident',
        incident.incident_date,
        incident.site_id || 'N/A',
        `"${incident.description?.replace(/"/g, '""') || ''}"`,
        incident.severity,
        incident.status
      ];
      csv += row.join(',') + '\n';
    });

    checkIns.forEach((checkIn) => {
      const row = [
        'Check-in',
        checkIn.checkInTime,
        checkIn.siteId || 'N/A',
        '',
        '',
        ''
      ];
      csv += row.join(',') + '\n';
    });

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=report.csv'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});