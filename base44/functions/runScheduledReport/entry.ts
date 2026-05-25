import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { automated_report_id } = await req.json();

    if (!automated_report_id) {
      return Response.json({ error: 'automated_report_id is required' }, { status: 400 });
    }

    const reportConfig = await base44.asServiceRole.entities.AutomatedReport.get(automated_report_id);

    if (!reportConfig || reportConfig.status !== 'active') {
      return Response.json({ error: 'Report automation not found or inactive' }, { status: 404 });
    }

    const now = new Date();
    let dateRangeStart = new Date();
    
    switch (reportConfig.schedule_frequency) {
      case 'daily':
        dateRangeStart.setDate(now.getDate() - 1);
        break;
      case 'weekly':
        dateRangeStart.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        dateRangeStart.setMonth(now.getMonth() - 1);
        break;
      default:
        if (reportConfig.filters?.date_range_days) {
          dateRangeStart.setDate(now.getDate() - reportConfig.filters.date_range_days);
        } else {
          dateRangeStart.setDate(now.getDate() - 7);
        }
    }

    let entityIds = [];

    if (reportConfig.report_type === 'incident_investigation') {
      const incidents = await base44.asServiceRole.entities.Incident.list();
      
      entityIds = incidents
        .filter(incident => {
          const incidentDate = new Date(incident.incident_date);
          const matchesDate = incidentDate >= dateRangeStart && incidentDate <= now;
          const matchesSite = !reportConfig.filters?.site_ids?.length || 
                             reportConfig.filters.site_ids.includes(incident.site_id);
          return matchesDate && matchesSite;
        })
        .map(i => i.id);

      if (entityIds.length === 0) {
        return Response.json({ 
          success: true, 
          message: 'No incidents found in date range',
          report_id: null 
        });
      }

      const reportResult = await base44.asServiceRole.functions.invoke('generateIncidentInvestigationReport', {
        incident_ids: entityIds,
        template_id: reportConfig.template_id,
        automated_report_id: reportConfig.id,
        save_to_docs: reportConfig.delivery_method === 'google_docs'
      });

      if (reportConfig.delivery_method === 'email' && reportConfig.recipients?.length > 0) {
        for (const recipient of reportConfig.recipients) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: recipient,
            subject: `Automated Report: ${reportConfig.name}`,
            body: `Report generated on ${now.toLocaleDateString()}`
          });
        }
      }

      return Response.json({
        success: true,
        report_id: reportResult.data.report_id,
        incidents_processed: entityIds.length
      });
    }

    return Response.json({ 
      error: 'Report type not yet implemented',
      report_type: reportConfig.report_type 
    }, { status: 400 });

  } catch (error) {
    console.error("Error running scheduled report:", error);
    return Response.json({ 
      error: 'Failed to run scheduled report', 
      details: error.message 
    }, { status: 500 });
  }
});