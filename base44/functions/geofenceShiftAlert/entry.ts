import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { officer_id, officer_name, site_id, site_name, location, shift_id, exited_at } = await req.json();

    if (!officer_id || !site_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const now = new Date();
    const exitTime = exited_at ? new Date(exited_at) : now;
    const minsAway = Math.round((now - exitTime) / 60000);

    const alertTitle = `🚨 Officer Left Site During Shift`;
    const alertMessage = `${officer_name || 'An officer'} has been outside the geofence for ${minsAway} min at ${site_name || 'assigned site'}. Shift ID: ${shift_id || 'N/A'}`;

    const allUsers = await base44.asServiceRole.entities.User.list();
    const supervisors = allUsers.filter(u =>
      ['admin', 'manager', 'supervisor'].includes(u.role_type)
    );

    const notifPromises = supervisors.map(sup =>
      base44.asServiceRole.entities.Notification.create({
        user_id: sup.id,
        title: alertTitle,
        message: alertMessage,
        type: 'geofence_alert',
        priority: 'urgent',
        read: false,
        action_url: '/LiveMap',
        related_entity_type: 'shift',
        related_entity_id: shift_id
      }).catch(err => console.error('Notification error:', err))
    );

    const eventPromise = base44.asServiceRole.entities.GeofenceEvent.create({
      officer_id,
      site_id,
      event_type: 'shift_departure_alert',
      timestamp: now.toISOString(),
      location: location || {},
      alert_sent: true,
      alert_recipients: supervisors.map(s => s.id),
      notes: alertMessage
    }).catch(err => console.error('Event error:', err));

    await Promise.all([...notifPromises, eventPromise]);

    return Response.json({ success: true, notified: supervisors.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});