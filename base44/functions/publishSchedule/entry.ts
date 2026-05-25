import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['admin', 'manager'].includes(user.role_type)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { shifts, site_id, date_range } = await req.json();

    if (!shifts || !Array.isArray(shifts) || shifts.length === 0) {
      return Response.json({ error: 'No shifts to publish' }, { status: 400 });
    }

    const affectedEmployees = [...new Set(shifts.map(s => s.employee_id))];
    const employees = await base44.asServiceRole.entities.User.list();

    const shiftsByEmployee = {};
    shifts.forEach(shift => {
      if (!shiftsByEmployee[shift.employee_id]) {
        shiftsByEmployee[shift.employee_id] = [];
      }
      shiftsByEmployee[shift.employee_id].push(shift);
    });

    for (const employeeId of affectedEmployees) {
      const emp = employees.find(e => e.id === employeeId);
      if (!emp) continue;

      const empShifts = shiftsByEmployee[employeeId];
      const shiftCount = empShifts.length;
      const startDate = empShifts[0].date;
      const endDate = empShifts[empShifts.length - 1].date;

      const message = `Your schedule has been updated. You have ${shiftCount} shift${shiftCount > 1 ? 's' : ''} scheduled for ${startDate}${startDate !== endDate ? ` through ${endDate}` : ''}. Tap to view your schedule.`;

      try {
        await base44.functions.invoke('sendNotification', {
          user_id: employeeId,
          title: 'Your Schedule Has Been Published',
          message: message,
          type: 'info',
          actionUrl: '/Schedule'
        });

        await base44.integrations.Core.SendEmail({
          to: emp.email,
          subject: 'Your Schedule Has Been Published',
          body: `Hi ${emp.full_name},\n\n${message}\n\nShifts:\n${empShifts.map(s => `- ${s.date}: ${s.start_time} - ${s.end_time}`).join('\n')}\n\nRegards,\nNPS Portal`
        });
      } catch (err) {
        console.log(`Failed to notify ${emp.full_name}:`, err.message);
      }
    }

    const site = await base44.asServiceRole.entities.Site.get(site_id);
    if (site && site.client_id) {
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_id: site.client_id,
          type: 'schedule_updated',
          title: 'Schedule Updated',
          message: `Schedule Updated — Tap to Refresh`,
          related_entity: 'Schedule',
          related_id: site_id,
          is_read: false,
          silent: true
        });
      } catch (err) {
        console.log('Failed to create client notification:', err.message);
      }
    }

    return Response.json({
      status: 'success',
      employees_notified: affectedEmployees.length,
      shifts_published: shifts.length
    });

  } catch (error) {
    console.error('Error publishing schedule:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});