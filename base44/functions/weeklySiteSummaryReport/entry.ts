import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const endDate = now.toISOString().slice(0, 10);
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [sites, allIncidents, allShifts, allUsers] = await Promise.all([
      base44.asServiceRole.entities.Site.list(),
      base44.asServiceRole.entities.Incident.list('-incident_date', 500),
      base44.asServiceRole.entities.Shift.list('-date', 500),
      base44.asServiceRole.entities.User.list(),
    ]);

    const activeSites = sites.filter(s => s.status === 'active');
    const admins = allUsers.filter(u => ['admin', 'manager'].includes(u.role_type) && u.email);

    if (admins.length === 0) {
      return Response.json({ success: false, message: 'No admins to notify' });
    }

    const weekIncidents = allIncidents.filter(i => i.incident_date >= startDate && i.incident_date <= endDate);
    const weekShifts = allShifts.filter(s => s.date >= startDate && s.date <= endDate);

    const siteSummaries = activeSites.map(site => {
      const siteIncidents = weekIncidents.filter(i => i.site_id === site.id);
      const siteShifts = weekShifts.filter(s => s.site_id === site.id);

      const bySeverity = { low: 0, medium: 0, high: 0, critical: 0 };
      siteIncidents.forEach(i => {
        if (i.severity) bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
      });

      return { site, siteIncidents, siteShifts, bySeverity };
    }).filter(s => s.siteIncidents.length > 0 || s.siteShifts.length > 0);

    const totalIncidents = weekIncidents.length;
    const weekLabel = `${startDate} to ${endDate}`;

    const body = `Weekly Site Summary Report
${weekLabel}

Total Incidents: ${totalIncidents}
Sites Reported: ${siteSummaries.length}

${siteSummaries.map(({ site, siteIncidents, siteShifts, bySeverity }) => `
${site.name}
Incidents: ${siteIncidents.length}
Shifts: ${siteShifts.length}
By Severity: Low=${bySeverity.low} Medium=${bySeverity.medium} High=${bySeverity.high} Critical=${bySeverity.critical}
`).join('\n')}

NPS Portal — Auto-generated Weekly Report`;

    const emailPromises = admins.map(admin =>
      base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: `📊 Weekly Site Summary — ${weekLabel}`,
        body
      })
    );

    const results = await Promise.allSettled(emailPromises);
    const sent = results.filter(r => r.status === 'fulfilled').length;

    return Response.json({ 
      success: true, 
      week: weekLabel, 
      sites_reported: siteSummaries.length, 
      total_incidents: totalIncidents, 
      admins_notified: sent 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});