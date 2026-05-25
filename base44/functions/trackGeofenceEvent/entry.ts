import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { site_id, event_type, location } = await req.json();

    if (!site_id || !event_type || !location) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sites = await base44.asServiceRole.entities.Site.filter({ id: site_id });
    const site = sites[0];

    if (!site) {
      return Response.json({ error: 'Site not found' }, { status: 404 });
    }

    const geofenceEvent = await base44.asServiceRole.entities.GeofenceEvent.create({
      officer_id: user.id,
      site_id,
      event_type,
      timestamp: new Date().toISOString(),
      location,
      alert_sent: false
    });

    if (site.alert_preferences?.geofence_alerts && site.alert_preferences?.alert_recipients?.length > 0) {
      const message = `${user.full_name} has ${event_type === 'entry' ? 'entered' : 'exited'} ${site.name}`;
      
      for (const recipientId of site.alert_preferences.alert_recipients) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: recipientId,
          title: `Geofence ${event_type === 'entry' ? 'Entry' : 'Exit'}`,
          message,
          type: 'geofence_alert',
          priority: 'medium'
        });
      }

      await base44.asServiceRole.entities.GeofenceEvent.update(geofenceEvent.id, {
        alert_sent: true,
        alert_recipients: site.alert_preferences.alert_recipients
      });
    }

    return Response.json({ success: true, event: geofenceEvent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});