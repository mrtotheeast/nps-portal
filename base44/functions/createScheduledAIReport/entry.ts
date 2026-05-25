import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if ((user?.role !== 'admin' && user?.role_type !== 'admin' && user?.role_type !== 'manager')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const config = await req.json();

    // Create scheduled report record
    const schedule = await base44.asServiceRole.entities.ScheduledAIReport.create({
      ...config,
      last_generated: null,
      next_scheduled: calculateNextRun(config.frequency),
      status: 'active'
    });

    // Create automation for recurring execution
    const automation = await fetch(`${Deno.env.get('BASE44_API_URL')}/automations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('BASE44_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        automation_type: 'scheduled',
        name: `AI Report: ${config.report_name}`,
        function_name: 'generateScheduledAIReport',
        function_args: { schedule_id: schedule.id },
        schedule_type: 'simple',
        repeat_interval: config.frequency === 'daily' ? 1 : config.frequency === 'weekly' ? 1 : 1,
        repeat_unit: config.frequency === 'daily' ? 'days' : config.frequency === 'weekly' ? 'weeks' : 'months',
        is_active: true
      })
    });

    const automationData = await automation.json();

    // Update schedule with automation ID
    await base44.asServiceRole.entities.ScheduledAIReport.update(schedule.id, {
      automation_id: automationData.id
    });

    return Response.json({ success: true, schedule_id: schedule.id });
  } catch (error) {
    console.error('Error creating scheduled report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateNextRun(frequency) {
  const now = new Date();
  if (frequency === 'daily') {
    now.setDate(now.getDate() + 1);
  } else if (frequency === 'weekly') {
    now.setDate(now.getDate() + 7);
  } else if (frequency === 'monthly') {
    now.setMonth(now.getMonth() + 1);
  }
  return now.toISOString();
}