import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    // 30-day window: notify when expiry is between today+29 and today+31
    const windowStart = new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const windowEnd = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [credentials, trainingAssignments, allUsers, allCourses] = await Promise.all([
      base44.asServiceRole.entities.Credential.list(),
      base44.asServiceRole.entities.TrainingAssignment.list(),
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.TrainingCourse.list(),
    ]);

    const userMap = Object.fromEntries(allUsers.map(u => [u.id, u]));
    const courseMap = Object.fromEntries(allCourses.map(c => [c.id, c]));
    const admins = allUsers.filter(u => ['admin', 'manager'].includes(u.role_type) && u.email);

    const alerts = [];

    // --- Check credentials expiring in 30 days ---
    const expiringCreds = credentials.filter(c =>
      c.expiration_date >= windowStart && c.expiration_date <= windowEnd
    );

    for (const cred of expiringCreds) {
      const employee = userMap[cred.employee_id];
      if (!employee) continue;

      alerts.push({
        type: 'credential',
        employee_name: employee.full_name,
        employee_email: employee.email,
        item_name: cred.credential_name,
        expiration_date: cred.expiration_date,
        detail: `${cred.credential_type} — issued by ${cred.issuing_authority || 'N/A'}`,
      });

      // Notify the employee themselves
      if (employee.email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: employee.email,
          subject: `⚠️ Credential Expiring in 30 Days: ${cred.credential_name}`,
          body: `Hi ${employee.full_name},\n\nYour credential <strong>${cred.credential_name}</strong> is set to expire on <strong>${cred.expiration_date}</strong> (30 days from today).\n\nPlease take action to renew it before it expires to avoid service disruptions.\n\nThank you,\nNPS HR Team`,
        }).catch(() => null);
      }

      // Update credential status
      await base44.asServiceRole.entities.Credential.update(cred.id, { status: 'expiring' }).catch(() => null);
    }

    // --- Check completed training assignments with due_date expiring in 30 days ---
    const expiringTraining = trainingAssignments.filter(a =>
      a.due_date && a.due_date.slice(0, 10) >= windowStart && a.due_date.slice(0, 10) <= windowEnd &&
      a.status !== 'completed'
    );

    for (const assignment of expiringTraining) {
      const employee = userMap[assignment.assigned_to];
      const course = courseMap[assignment.training_course_id];
      if (!employee || !course) continue;

      alerts.push({
        type: 'training',
        employee_name: employee.full_name,
        employee_email: employee.email,
        item_name: course.title,
        expiration_date: assignment.due_date.slice(0, 10),
        detail: `Training assignment — status: ${assignment.status}`,
      });

      // Notify the employee
      if (employee.email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: employee.email,
          subject: `⚠️ Training Due in 30 Days: ${course.title}`,
          body: `Hi ${employee.full_name},\n\nYour training assignment <strong>${course.title}</strong> is due on <strong>${assignment.due_date.slice(0, 10)}</strong> (30 days from today).\n\nPlease complete it before the deadline.\n\nThank you,\nNPS Training Team`,
        }).catch(() => null);
      }
    }

    if (alerts.length === 0) {
      return Response.json({ success: true, message: 'No expiring credentials or training in the 30-day window.', alerts: 0 });
    }

    // --- Send a consolidated admin digest ---
    const credRows = alerts.filter(a => a.type === 'credential').map(a => `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px;">${a.employee_name}</td>
        <td style="padding:8px;">${a.item_name}</td>
        <td style="padding:8px;">${a.detail}</td>
        <td style="padding:8px;color:#dc2626;font-weight:600;">${a.expiration_date}</td>
      </tr>`).join('');

    const trainingRows = alerts.filter(a => a.type === 'training').map(a => `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px;">${a.employee_name}</td>
        <td style="padding:8px;">${a.item_name}</td>
        <td style="padding:8px;">${a.detail}</td>
        <td style="padding:8px;color:#d97706;font-weight:600;">${a.expiration_date}</td>
      </tr>`).join('');

    const emailBody = `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:24px;">
  <div style="max-width:700px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#1a2b4a;color:#fff;padding:20px 24px;">
      <h1 style="margin:0;font-size:20px;">⚠️ 30-Day Expiry Alert</h1>
      <p style="margin:6px 0 0;opacity:0.7;font-size:14px;">${alerts.length} item(s) expiring within 30 days</p>
    </div>

    ${credRows ? `
    <div style="padding:20px 24px;">
      <h2 style="font-size:16px;color:#1a2b4a;margin:0 0 12px;">Credentials Expiring</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px;text-align:left;color:#64748b;">Officer</th>
            <th style="padding:8px;text-align:left;color:#64748b;">Credential</th>
            <th style="padding:8px;text-align:left;color:#64748b;">Details</th>
            <th style="padding:8px;text-align:left;color:#64748b;">Expires</th>
          </tr>
        </thead>
        <tbody>${credRows}</tbody>
      </table>
    </div>` : ''}

    ${trainingRows ? `
    <div style="padding:0 24px 20px;">
      <h2 style="font-size:16px;color:#1a2b4a;margin:0 0 12px;">Training Assignments Due</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px;text-align:left;color:#64748b;">Officer</th>
            <th style="padding:8px;text-align:left;color:#64748b;">Training</th>
            <th style="padding:8px;text-align:left;color:#64748b;">Status</th>
            <th style="padding:8px;text-align:left;color:#64748b;">Due Date</th>
          </tr>
        </thead>
        <tbody>${trainingRows}</tbody>
      </table>
    </div>` : ''}

    <p style="text-align:center;color:#94a3b8;font-size:12px;padding:12px 24px;border-top:1px solid #e2e8f0;">NPS Portal — Automated Credential & Training Alert</p>
  </div>
</body>
</html>`;

    await Promise.allSettled(
      admins.map(admin =>
        base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: `⚠️ 30-Day Expiry Alert — ${alerts.length} credential(s)/training(s) expiring`,
          body: emailBody,
        })
      )
    );

    return Response.json({ success: true, alerts_found: alerts.length, credentials_expiring: expiringCreds.length, training_expiring: expiringTraining.length, admins_notified: admins.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});