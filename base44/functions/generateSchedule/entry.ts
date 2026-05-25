import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role_type !== 'admin')) {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { schedule_id, start_date, end_date, site_ids } = await req.json();

    const [sites, employees, availability] = await Promise.all([
      base44.asServiceRole.entities.Site.filter({ status: 'active' }),
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.EmployeeAvailability.list()
    ]);

    const targetSites = site_ids?.length > 0 
      ? sites.filter(s => site_ids.includes(s.id))
      : sites;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an advanced scheduling AI for a security company. Generate an optimal schedule.

SITES REQUIRING COVERAGE:
${targetSites.slice(0, 5).map(s => `- ${s.name}`).join('\n')}

EMPLOYEES:
${employees.slice(0, 10).map(e => `- ${e.full_name}`).join('\n')}

SCHEDULE PERIOD: ${start_date} to ${end_date}

Generate suggested shifts with reasoning and confidence scores.`,
      response_json_schema: {
        type: "object",
        properties: {
          suggested_shifts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                employee_name: { type: "string" },
                site_name: { type: "string" },
                date: { type: "string" },
                start_time: { type: "string" },
                end_time: { type: "string" },
                reasoning: { type: "string" }
              }
            }
          },
          summary: { type: "string" },
          coverage_gaps: { type: "array", items: { type: "object" } }
        }
      }
    });

    return Response.json({
      success: true,
      ...result
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});