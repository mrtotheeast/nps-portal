import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.role_type !== 'manager') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { reportType, period, data } = await req.json();

    const reportPrompts = {
      comprehensive: `Generate a comprehensive operational summary report for the last ${period} days with the following data:

- Total Users: ${data.users}
- Active Users: ${data.activeUsers}
- Incidents Reported: ${data.incidents}
- Training Assignments: ${data.assignments}
- Training Completion Rate: ${data.completionRate}%
- Average Training Score: ${data.avgScore}%
- Completed Patrols: ${data.completedPatrols}

Provide:
1. Executive Summary
2. Key Highlights and Achievements
3. Areas of Concern
4. Actionable Recommendations
5. Performance Trends Analysis

Format as a professional report.`,

      anomaly: `Analyze the following security metrics for anomalies and unusual patterns:

- Incident Count: ${data.incidents} (last ${period} days)
- Active Users: ${data.activeUsers} / ${data.users}
- Patrol Completion: ${data.completedPatrols}

Identify:
1. Statistical anomalies or unusual spikes
2. Potential security concerns
3. Patterns that deviate from normal operations
4. Recommended actions for investigation

Be specific and data-driven in your analysis.`,

      training: `Generate a training effectiveness report with this data:

- Total Assignments: ${data.assignments}
- Completion Rate: ${data.completionRate}%
- Average Score: ${data.avgScore}%

Analyze:
1. Training program effectiveness
2. Knowledge retention indicators
3. Areas for curriculum improvement
4. Recommendations for training optimization`,

      performance: `Create an employee and site performance analysis:

- Active Users: ${data.activeUsers}
- Completed Patrols: ${data.completedPatrols}
- Incidents: ${data.incidents}

Provide:
1. Performance benchmarks
2. Top performers and best practices
3. Areas needing improvement
4. Resource allocation recommendations`
    };

    const prompt = reportPrompts[reportType] || reportPrompts.comprehensive;

    const report = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false
    });

    return Response.json({
      success: true,
      report,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating AI report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});