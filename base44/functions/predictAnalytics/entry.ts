import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['admin', 'super_admin', 'manager'].includes(user.role_type)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { metric_type } = await req.json();

    const timesheets = await base44.asServiceRole.entities.Timesheet.list("-date", 1000);
    const users = await base44.asServiceRole.entities.User.list();
    const shifts = await base44.asServiceRole.entities.Shift.list("-date", 500);

    let predictions = {};

    if (metric_type === 'turnover' || metric_type === 'all') {
      const prompt = `Analyze employee turnover risk based on this data:
      
Total employees: ${users.filter(u => u.employee_status === 'active').length}
Terminated in last 90 days: ${users.filter(u => u.employee_status === 'terminated').length}
Average hours per employee: ${timesheets.reduce((sum, t) => sum + (t.total_hours || 0), 0) / users.length}

Provide a JSON response with:
- turnover_risk_score (0-100)
- high_risk_factors (array of strings)
- recommendations (array of strings)
- predicted_turnover_next_quarter (number)`;

      const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            turnover_risk_score: { type: "number" },
            high_risk_factors: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            predicted_turnover_next_quarter: { type: "number" }
          }
        }
      });

      predictions.turnover = analysis;
    }

    if (metric_type === 'overtime' || metric_type === 'all') {
      const overtimeData = timesheets.filter(t => (t.total_hours || 0) > 40);
      const avgOvertime = overtimeData.reduce((sum, t) => sum + ((t.total_hours || 0) - 40), 0) / overtimeData.length;

      const prompt = `Analyze overtime trends:
      
Timesheets with overtime: ${overtimeData.length}
Average overtime hours: ${avgOvertime.toFixed(2)}
Total employees: ${users.length}

Provide JSON with:
- overtime_trend (increasing/stable/decreasing)
- predicted_overtime_next_month (hours)
- cost_projection (estimated additional cost)
- recommendations (array)`;

      const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overtime_trend: { type: "string" },
            predicted_overtime_next_month: { type: "number" },
            cost_projection: { type: "number" },
            recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });

      predictions.overtime = analysis;
    }

    return Response.json({ 
      success: true, 
      predictions 
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});