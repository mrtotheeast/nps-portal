import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { shiftId, changeType, affectedEmployees } = await req.json();

    if (!shiftId || !changeType) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const shift = await base44.asServiceRole.entities.Shift.get(shiftId);
    const site = await base44.asServiceRole.entities.Site.get(shift.site_id);

    const messages = {
      created: 'A new shift is available for bidding',
      updated: 'Your assigned shift has been updated',
      cancelled: 'Your assigned shift has been cancelled',
      assigned: 'You have been assigned to a new shift'
    };

    const message = messages[changeType] || 'Schedule change notification';

    const employees = affectedEmployees || (shift.employee_id ? [shift.employee_id] : []);

    for (const empId of employees) {
      await base44.asServiceRole.functions.invoke('sendNotification', {
        user_id: empId,
        title: 'Schedule Update',
        message: `${message} - ${site.name} on ${shift.date} at ${shift.start_time}`,
        type: 'schedule_change',
        priority: changeType === 'cancelled' ? 'high' : 'normal',
        send_email: true
      });
    }

    if (changeType === 'created' && !shift.employee_id) {
      const allEmployees = await base44.asServiceRole.entities.Employee.filter({ 
        status: 'active'
      });

      for (const emp of allEmployees.slice(0, 20)) {
        await base44.asServiceRole.functions.invoke('sendNotification', {
          user_id: emp.id,
          title: 'New Shift Available',
          message: `Open shift at ${site.name} on ${shift.date}. Bid now!`,
          type: 'open_shift',
          priority: 'normal'
        });
      }
    }

    return Response.json({ 
      success: true,
      notified: employees.length 
    });

  } catch (error) {
    console.error('Notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});