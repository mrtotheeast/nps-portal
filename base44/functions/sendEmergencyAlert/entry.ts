import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { siteId, message, severity = 'critical' } = await req.json();

    if (!siteId || !message) {
      return Response.json({ error: 'siteId and message are required' }, { status: 400 });
    }

    const site = await base44.asServiceRole.entities.Site.get(siteId);
    if (!site) {
      return Response.json({ error: 'Site not found' }, { status: 404 });
    }

    const alert = await base44.asServiceRole.entities.EmergencyAlert.create({
      client_id: user.client_id,
      site_id: siteId,
      message,
      severity,
      triggered_at: new Date().toISOString(),
      status: 'active'
    });

    const today = new Date().toISOString().split('T')[0];
    const allShifts = await base44.asServiceRole.entities.Shift.list();
    const todayShifts = allShifts.filter(s => 
      s.site_id === siteId && 
      s.date === today &&
      s.status !== 'cancelled'
    );

    const officerIds = [...new Set(todayShifts.map(s => s.employee_id))];
    
    const notificationPromises = officerIds.map(officerId => 
      base44.asServiceRole.entities.Notification.create({
        user_id: officerId,
        title: '🚨 EMERGENCY ALERT',
        message: `${site.name}: ${message}`,
        type: 'general',
        priority: 'urgent',
        action_url: '/Patrol'
      })
    );

    await Promise.all(notificationPromises);

    const allUsers = await base44.asServiceRole.entities.User.list();
    const admins = allUsers.filter(u => ['super_admin', 'admin', 'manager'].includes(u.role_type));
    
    const adminNotifications = admins.map(admin =>
      base44.asServiceRole.entities.Notification.create({
        user_id: admin.id,
        title: '🚨 Client Emergency Alert',
        message: `${site.name}: ${message}`,
        type: 'general',
        priority: 'urgent',
        action_url: '/AdminDashboard'
      })
    );

    await Promise.all(adminNotifications);

    return Response.json({
      success: true,
      alert_id: alert.id,
      officers_notified: officerIds.length,
      admins_notified: admins.length,
      message: `Emergency alert sent to ${officerIds.length} officers on duty`
    });

  } catch (error) {
    console.error('Emergency alert error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});