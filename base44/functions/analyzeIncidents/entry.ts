import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role_type !== 'admin')) {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { dateRange = 90 } = await req.json();

    // Fetch incidents
    const incidents = await base44.asServiceRole.entities.Incident.list('-incident_date', 500);

    // Filter by date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dateRange);
    const filteredIncidents = incidents.filter(i => 
      new Date(i.incident_date) >= cutoffDate
    );

    // Prepare data for AI analysis
    const incidentSummary = filteredIncidents.map(i => ({
      type: i.incident_type,
      severity: i.severity,
      date: i.incident_date,
      description: i.description,
      location: i.site_id,
      time: i.incident_time
    }));

    // Use AI to analyze patterns
    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analyze these security incidents from the past ${dateRange} days and provide:
1. Common patterns and trends
2. Risk categories and their frequency
3. Time-based patterns (day of week, time of day)
4. Location-based insights
5. Specific preventative measures and policy recommendations
6. Severity trend analysis

Incidents data:
${JSON.stringify(incidentSummary, null, 2)}

Provide actionable insights for a security management team.`,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          patterns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                pattern: { type: "string" },
                frequency: { type: "number" },
                severity: { type: "string" }
              }
            }
          },
          time_patterns: {
            type: "object",
            properties: {
              peak_hours: { type: "array", items: { type: "string" } },
              peak_days: { type: "array", items: { type: "string" } }
            }
          },
          risk_categories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                count: { type: "number" },
                trend: { type: "string" }
              }
            }
          },
          preventative_measures: {
            type: "array",
            items: {
              type: "object",
              properties: {
                measure: { type: "string" },
                priority: { type: "string" },
                expected_impact: { type: "string" }
              }
            }
          },
          policy_recommendations: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    // Calculate basic statistics
    const stats = {
      total_incidents: filteredIncidents.length,
      by_type: filteredIncidents.reduce((acc, i) => {
        acc[i.incident_type] = (acc[i.incident_type] || 0) + 1;
        return acc;
      }, {}),
      by_severity: filteredIncidents.reduce((acc, i) => {
        acc[i.severity] = (acc[i.severity] || 0) + 1;
        return acc;
      }, {}),
      by_status: filteredIncidents.reduce((acc, i) => {
        acc[i.status] = (acc[i.status] || 0) + 1;
        return acc;
      }, {})
    };

    return Response.json({
      success: true,
      analysis,
      stats,
      date_range: dateRange,
      analyzed_at: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});