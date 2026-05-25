import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { employee_ids } = await req.json();

    if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
      return Response.json(
        { error: 'Missing or invalid employee_ids array' },
        { status: 400 }
      );
    }

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const credentials = await base44.asServiceRole.entities.Credential.filter({
      employee_id: { $in: employee_ids }
    });

    const employees = await base44.asServiceRole.entities.Employee.list();
    const employeeMap = {};
    employees.forEach(emp => {
      employeeMap[emp.id] = emp;
    });

    let sentCount = 0;
    let errorCount = 0;

    for (const cred of credentials) {
      const emp = employeeMap[cred.employee_id];
      if (!emp || !emp.email) continue;

      try {
        await base44.asServiceRole.entities.Notification.create({
          user_id: cred.employee_id,
          title: `Credential Expiration Reminder: ${cred.credential_name}`,
          message: `Your ${cred.credential_name} credential expires on ${cred.expiry_date}. Please renew it promptly.`,
          type: 'credential',
          priority: 'high',
          action_url: '/EmployeeProfile?tab=credentials',
          read: false
        });

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: emp.email,
          subject: `Action Required: ${cred.credential_name} Expires on ${cred.expiry_date}`,
          body: `Hi ${emp.firstName},\n\nThis is a reminder that your ${cred.credential_name} credential expires on ${cred.expiry_date}.\n\nPlease take action to renew your credential.\n\nThank you,\nNPS HR Team`
        });

        sentCount++;
      } catch (err) {
        console.error(`Failed to send reminder to ${emp.email}:`, err);
        errorCount++;
      }
    }

    return Response.json({
      success: true,
      message: `Sent ${sentCount} reminders`,
      sentCount,
      errorCount
    });
  } catch (error) {
    console.error('Credential reminder error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});