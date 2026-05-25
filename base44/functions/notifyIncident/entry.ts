/**
 * Triggered by entity automation on Incident create.
 * Notifies the reporter's direct supervisor and all admins — both in-app and email.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPPORT_URL = 'https://nationwidepolice.com/nps-portal';

async function sendEmail(to, subject, bodyLines, ctaLabel, ctaUrl) {
  if (!RESEND_API_KEY || !to) return;
  const bodyHtml = bodyLines
    .map(l => l === '' ? '<br/>' : `<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">${l}</p>`)
    .join('\n');
  const ctaHtml = ctaLabel
    ? `<div style="margin:24px 0;"><a href="${ctaUrl}" style="display:inline-block;background:#1a2b4a;color:#c9a227;padding:11px 26px;border-radius:4px;text-decoration:none;font-weight:bold;font-size:14px;">${ctaLabel}</a></div>`
    : '';
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
  <tr><td style="background:#1a2b4a;padding:24px 32px;"><p style="margin:0;color:#c9a227;font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;">NPS PORTAL</p><p style="margin:6px 0 0;color:#fff;font-size:18px;font-weight:bold;">${subject}</p></td></tr>
  <tr><td style="padding:32px 32px 24px;">${bodyHtml}${ctaHtml}</td></tr>
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;"><p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">Nationwide Police Services | Support: <a href="${SUPPORT_URL}" style="color:#1a2b4a;">${SUPPORT_URL}</a></p></td></tr>
  </table></td></tr></table></body></html>`;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Nationwide Police Services <noreply@npsportal.app>', to: [to], subject, html }),
  }).catch(e => console.warn('Email failed:', e.message));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data } = payload;

    if (event?.entity_name !== 'Incident' || event?.type !== 'create') {
      return Response.json({ success: true, message: 'No action taken' });
    }

    const incident = data;

    // Gather lookup data in parallel
    const [allUsers, sites] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      incident.site_id ? base44.asServiceRole.entities.Site.filter({ id: incident.site_id }) : Promise.resolve([]),
    ]);

    const siteName = sites[0]?.name || 'Unknown Site';
    const reporter = allUsers.find(u => u.id === incident.reporter_id);
    const reporterName = reporter?.full_name || incident.reporter_name || 'An officer';

    // Find reporter's employee record to get supervisor
    let supervisorUser = null;
    if (reporter?.email) {
      const empRecords = await base44.asServiceRole.entities.Employee.filter({ email: reporter.email });
      const emp = empRecords[0];
      if (emp?.supervisor_id) {
        const supEmps = await base44.asServiceRole.entities.Employee.filter({ id: emp.supervisor_id });
        if (supEmps[0]?.email) {
          supervisorUser = allUsers.find(u => u.email === supEmps[0].email);
        }
      }
    }

    const severityLabel = (incident.severity || 'unknown').toUpperCase();
    const incidentType = incident.incident_type || 'incident';
    const description = incident.description ? incident.description.substring(0, 200) : '';

    // Build list of people to notify: admins + supervisors + direct supervisor
    const toNotify = allUsers.filter(u =>
      ['admin', 'manager', 'supervisor'].includes(u.role) ||
      ['admin', 'manager', 'supervisor'].includes(u.role_type)
    );
    if (supervisorUser && !toNotify.find(u => u.id === supervisorUser.id)) {
      toNotify.push(supervisorUser);
    }

    const notifTitle = `Incident Reported: ${severityLabel} ${incidentType}`;
    const notifMessage = `${reporterName} reported a ${severityLabel} ${incidentType} at ${siteName}.${description ? ' ' + description.substring(0, 120) + '...' : ''}`;
    const emailSubject = `Incident Report Submitted - ${severityLabel} at ${siteName}`;

    const emailBody = [
      'An incident report has been submitted and requires your attention.',
      '',
      `Reporter: ${reporterName}`,
      `Location: ${siteName}`,
      `Type: ${incidentType}`,
      `Severity: ${severityLabel}`,
      incident.date_time ? `Date/Time: ${new Date(incident.date_time).toLocaleString('en-US', { timeZone: 'America/New_York' })}` : '',
      description ? `Description: ${description}` : '',
      '',
      'Please log in to the NPS Portal to review the full report.',
    ].filter(l => l !== undefined);

    for (const user of toNotify) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: user.id,
        title: notifTitle,
        message: notifMessage,
        notification_type: 'incident_submitted',
        destination_page: 'IncidentReports',
        destination_id: incident.id,
        is_read: false,
      }).catch(() => {});

      if (user.email) {
        await sendEmail(user.email, emailSubject, emailBody, 'Review Incident Report', 'https://npsportal.app/IncidentReports');
      }
    }

    return Response.json({ success: true, notified: toNotify.length });
  } catch (error) {
    console.error('notifyIncident error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});