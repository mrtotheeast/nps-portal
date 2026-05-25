import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['super_admin', 'admin', 'manager'].includes(user.role_type)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { reportType, startDate, endDate } = await req.json();

    let data = {};
    let promptContext = "";

    if (reportType === 'timesheets') {
      const timesheets = await base44.asServiceRole.entities.Timesheet.filter({
        date: { $gte: startDate, $lte: endDate }
      });
      data.timesheets = timesheets;
      
      const late = timesheets.filter(t => {
        if (!t.clock_in) return false;
        const clockIn = new Date(t.clock_in);
        const scheduled = new Date(t.date + ' 00:00:00');
        return clockIn > scheduled;
      });
      
      promptContext = `Analyze ${timesheets.length} timesheet entries from ${startDate} to ${endDate}.
- Total entries: ${timesheets.length}
- Late clock-ins: ${late.length}
- Pending approval: ${timesheets.filter(t => t.status === 'pending').length}
- Total hours: ${timesheets.reduce((sum, t) => sum + (t.total_hours || 0), 0).toFixed(2)}

Provide insights on attendance patterns, punctuality trends, and recommendations.`;
    }

    if (reportType === 'patrols') {
      const patrols = await base44.asServiceRole.entities.PatrolSession.filter({
        start_time: { $gte: startDate, $lte: endDate }
      });
      data.patrols = patrols;
      
      const completed = patrols.filter(p => p.status === 'completed');
      
      promptContext = `Analyze ${patrols.length} patrol sessions from ${startDate} to ${endDate}.
- Total patrols: ${patrols.length}
- Completed: ${completed.length}
- Average completion rate: ${completed.length > 0 ? (completed.reduce((sum, p) => sum + ((p.scanned_checkpoints || 0) / (p.total_checkpoints || 1)), 0) / completed.length * 100).toFixed(1) : 0}%

Provide insights on patrol effectiveness, checkpoint compliance, and officer performance trends.`;
    }

    if (reportType === 'incidents') {
      const incidents = await base44.asServiceRole.entities.Incident.filter({
        incident_date: { $gte: startDate, $lte: endDate }
      });
      data.incidents = incidents;
      
      promptContext = `Analyze ${incidents.length} incidents from ${startDate} to ${endDate}.
- Total incidents: ${incidents.length}
- By severity: High: ${incidents.filter(i => i.severity === 'high').length}, Medium: ${incidents.filter(i => i.severity === 'medium').length}, Low: ${incidents.filter(i => i.severity === 'low').length}

Provide insights on incident trends, risk areas, and preventive recommendations.`;
    }

    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a business intelligence analyst specializing in security operations.

${promptContext}

Provide a comprehensive executive report including:
1. Executive Summary
2. Key Metrics and Trends
3. Notable Findings
4. Areas of Concern
5. Recommendations
6. Action Items

Be specific, data-driven, and actionable.`,
      response_json_schema: {
        type: "object",
        properties: {
          executive_summary: { type: "string" },
          key_metrics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                metric: { type: "string" },
                value: { type: "string" },
                trend: { type: "string" }
              }
            }
          },
          notable_findings: {
            type: "array",
            items: { type: "string" }
          },
          areas_of_concern: {
            type: "array",
            items: { type: "string" }
          },
          recommendations: {
            type: "array",
            items: { type: "string" }
          },
          action_items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item: { type: "string" },
                priority: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({ 
      success: true, 
      report: analysis,
      data: {
        reportType,
        startDate,
        endDate,
        recordCount: Object.values(data)[0]?.length || 0
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});