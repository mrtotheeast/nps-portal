import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mark the user's Employee record as deactivation-requested
    const employees = await base44.asServiceRole.entities.Employee.filter({ email: user.email });
    for (const emp of employees) {
      await base44.asServiceRole.entities.Employee.update(emp.id, {
        isActive: false,
        employee_status: 'Deactivated — Deletion Requested',
        deactivation_requested_at: new Date().toISOString(),
        deactivation_requested_by: user.id
      });
    }

    // Mark the User record itself as deactivation-requested
    await base44.auth.updateMe({
      account_status: 'deactivation_requested',
      deactivation_requested_at: new Date().toISOString()
    });

    // Log audit trail
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      action: 'deactivation_requested',
      entity_type: 'User',
      entity_id: user.id,
      severity: 'high',
      metadata: {
        reason: 'User requested account deletion via app',
        note: 'Employment records retained per legal requirements'
      }
    });

    // Notify all admins
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    for (const admin of admins) {
      if (admin.email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: `Account Deletion Request — ${user.full_name}`,
          body: `
            <p>An employee has requested account deletion in the NPS Portal.</p>
            <br/>
            <p><strong>Employee:</strong> ${user.full_name}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Requested at:</strong> ${new Date().toLocaleString()}</p>
            <br/>
            <p>Their account access has been deactivated. Employment records have been retained as required by law.</p>
            <p>If you wish to permanently remove their employee record from the system, you can do so from the Employee Directory.</p>
            <br/>
            <p>— NPS Portal</p>
          `
        });
      }
    }

    // Sign the user out / revoke their session
    await base44.auth.logout();

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error processing account deletion request:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});