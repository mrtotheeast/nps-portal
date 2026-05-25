import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { schedule_id } = await req.json();

    const schedule = await base44.asServiceRole.entities.ScheduledAIReport.get(schedule_id);

    const dataPromises = schedule.data_sources.map(async (source) => {
      switch (source) {
        case 'incidents':
          return { type: 'incidents', data: await base44.asServiceRole.entities.Incident.list() };
        case 'training_analytics':
          return { type: 'training', data: await base44.asServiceRole.entities.TrainingAssignment.list() };
        case 'patrol_data':
          return { type: 'patrols', data: await base44.asServiceRole.entities.PatrolSession.list() };
        default:
          return { type: source, data: [] };
      }
    });

    const gatheredData = await Promise.all(dataPromises);

    const prompt = `Generate a comprehensive ${schedule.frequency} report: ${schedule.report_name}

Data Sources:
${gatheredData.map(d => `- ${d.type}: ${d.data.length} records`).join('\n')}

Provide:
1. Executive Summary
2. Key Metrics and Trends
3. Notable Findings
4. Concerns and Recommendations`;

    const reportContent = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false
    });

    const pending = await base44.asServiceRole.entities.PendingAIReport.create({
      scheduled_report_id: schedule_id,
      generated_at: new Date().toISOString(),
      report_content: reportContent,
      data_sources: schedule.data_sources,
      status: 'completed'
    });

    await base44.asServiceRole.entities.ScheduledAIReport.update(schedule_id, {
      last_generated: new Date().toISOString()
    });

    return Response.json({ success: true, pending_report_id: pending.id });
  } catch (error) {
    console.error('Error generating scheduled report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});