import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const now = new Date();
  const windowStart = new Date(now.getTime() + (1 * 60 + 55) * 60 * 1000);
  const windowEnd = new Date(now.getTime() + (2 * 60 + 5) * 60 * 1000);

  const todayStr = now.toISOString().slice(0, 10);
  const tomorrowStr = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const shifts = await base44.asServiceRole.entities.Shift.filter({
    status: 'scheduled'
  });

  if (!shifts || shifts.length === 0) {
    return Response.json({ sent: 0, message: 'No upcoming shifts found' });
  }

  const users = await base44.asServiceRole.entities.User.list();
  const userMap = {};
  for (const u of users) {
    userMap[u.id] = u;
  }

  const sites = await base44.asServiceRole.entities.Site.list();
  const siteMap = {};
  for (const s of sites) {
    siteMap[s.id] = s;
  }

  let sent = 0;
  const formatTime = (t) => {
    if (!t) return t;
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  for (const shift of shifts) {
    if (shift.date !== todayStr && shift.date !== tomorrowStr) continue;

    const shiftDateTime = new Date(`${shift.date}T${shift.start_time}`);
    if (shiftDateTime < windowStart || shiftDateTime > windowEnd) continue;

    const user = userMap[shift.employee_id];
    if (!user || !user.email) continue;

    const site = siteMap[shift.site_id];
    const siteName = site?.name || 'your assigned site';

    const body = `Hi ${user.full_name || 'Officer'},

Shift Reminder: You're on duty in 2 hours.

📍 Site: ${siteName}
🕐 Start Time: ${formatTime(shift.start_time)}
🕔 End Time: ${formatTime(shift.end_time)}
📅 Date: ${shift.date}

Please arrive on time and prepared.

— NPS Scheduling Team`;

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: `Shift Reminder: You're on duty in 2 hours`,
        body
      });
      sent++;
    } catch (err) {
      console.log(`Failed to notify ${shift.employee_id}:`, err.message);
    }
  }

  return Response.json({ sent, checked: shifts.length });
});