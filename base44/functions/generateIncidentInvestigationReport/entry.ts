import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.role_type !== 'admin' && user?.role_type !== 'super_admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { incident_ids, template_id, automated_report_id, save_to_docs = false } = await req.json();

    if (!incident_ids || !Array.isArray(incident_ids) || incident_ids.length === 0) {
      return Response.json({ error: 'incident_ids array is required' }, { status: 400 });
    }

    // Fetch incidents
    const incidents = await Promise.all(
      incident_ids.map(id => base44.asServiceRole.entities.Incident.get(id))
    );

    // Fetch related entities
    const siteIds = [...new Set(incidents.map(i => i.site_id).filter(Boolean))];
    const reporterIds = [...new Set(incidents.map(i => i.reporter_id).filter(Boolean))];

    const [sites, reporters] = await Promise.all([
      siteIds.length > 0 ? Promise.all(siteIds.map(id => base44.asServiceRole.entities.Site.get(id).catch(() => null))) : [],
      reporterIds.length > 0 ? Promise.all(reporterIds.map(id => base44.asServiceRole.entities.Employee.get(id).catch(() => null))) : []
    ]);

    const siteMap = Object.fromEntries(sites.filter(Boolean).map(s => [s.id, s]));
    const reporterMap = Object.fromEntries(reporters.filter(Boolean).map(r => [r.id, r]));

    // Prepare incident data for AI
    const incidentDetails = incidents.map(incident => {
      const site = siteMap[incident.site_id];
      const reporter = reporterMap[incident.reporter_id];
      
      return {
        incident_id: incident.id,
        date: incident.incident_date,
        time: incident.incident_time,
        type: incident.incident_type,
        severity: incident.severity,
        description: incident.description,
        site_name: site?.name || 'Unknown',
        reporter_name: reporter ? `${reporter.firstName} ${reporter.lastName}` : 'Unknown',
        status: incident.status
      };
    });

    // Generate report using AI
    const prompt = `You are a professional security incident analyst creating detailed investigation reports.

Analyze these incidents:
${JSON.stringify(incidentDetails, null, 2)}

Create a comprehensive investigation report with the following sections:
1. Executive Summary
2. Incident Overview (summary table)
3. Detailed Analysis (for each incident)
4. Findings and Patterns
5. Recommendations
6. Conclusion

Format the report in markdown. Be thorough, professional, and objective.`;

    const reportContent = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false
    });

    // Extract summary
    const summaryMatch = reportContent.match(/## Executive Summary\n\n([\s\S]+?)(?=\n##|$)/);
    const summary = summaryMatch ? summaryMatch[1].trim().substring(0, 500) : reportContent.substring(0, 500);

    // Create report title
    const reportTitle = incidents.length === 1
      ? `Incident Investigation Report - ${incidents[0].incident_type} - ${incidents[0].incident_date}`
      : `Multi-Incident Investigation Report - ${incidents.length} Incidents`;

    // Save report to database
    const generatedReport = await base44.asServiceRole.entities.GeneratedReport.create({
      automated_report_id: automated_report_id || null,
      report_type: 'incident_investigation',
      title: reportTitle,
      content: reportContent,
      summary: summary,
      metadata: {
        incident_count: incidents.length,
        entities_included: incident_ids
      },
      generation_status: 'completed'
    });

    return Response.json({
      success: true,
      report_id: generatedReport.id,
      title: reportTitle,
      summary: summary,
      content: reportContent
    });

  } catch (error) {
    console.error("Error generating report:", error);
    return Response.json({ 
      error: 'Failed to generate report', 
      details: error.message 
    }, { status: 500 });
  }
});