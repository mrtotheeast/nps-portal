import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['admin', 'manager'].includes(user.role_type)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { schedule_id, shifts, period_name, start_date, end_date, site_id } = await req.json();

    if (!shifts || !Array.isArray(shifts)) {
      return Response.json({ error: 'Invalid shifts data' }, { status: 400 });
    }

    try {
      let schedule;
      if (schedule_id) {
        schedule = await base44.asServiceRole.entities.Schedule.update(schedule_id, {
          period_name,
          start_date,
          end_date,
          status: 'draft',
          sites: [site_id]
        });
      } else {
        schedule = await base44.asServiceRole.entities.Schedule.create({
          period_name,
          start_date,
          end_date,
          status: 'draft',
          sites: [site_id]
        });
      }

      return Response.json({
        status: 'success',
        message: 'Schedule saved as draft',
        schedule_id: schedule.id,
        shifts_count: shifts.length
      });

    } catch (err) {
      console.error('Failed to save draft schedule:', err);
      return Response.json({ error: 'Failed to save draft: ' + err.message }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in saveDraftSchedule:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});