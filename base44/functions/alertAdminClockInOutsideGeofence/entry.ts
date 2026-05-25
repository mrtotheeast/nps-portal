import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, employee_id, site_id, distance_m, radius_m, clock_in_location } = payload;

    // Support both entity automation format and direct call format
    let resolvedEmployeeId, resolvedSiteId, resolvedDistance, resolvedRadius;

    if (employee_id && site_id) {
      // Direct call from SiteCheckIn frontend
      resolvedEmployeeId = employee_id;
      resolvedSiteId = site_id;
      resolvedDistance = distance_m;
      resolvedRadius = radius_m;
    } else if (event && data) {
      // Entity automation format
      if (event.type !== 'create') {
        return Response.json({ status: 'skipped', reason: 'Not a create event' });
      }
      const timesheet = data;
      if (!timesheet.site_id || !timesheet.clock_in_location) {
        return Response.json({ status: 'skipped', reason: 'Missing location or site data' });
      }
      const site = await base44.asServiceRole.entities.Site.get(timesheet.site_id);
      if (!site || !site.latitude) return Response.json({ status: 'skipped', reason: 'Site has no GPS' });
      resolvedEmployeeId = timesheet.employee_id;
      resolvedSiteId = timesheet.site_id;
      resolvedRadius = (site.geofence_radius || 300) * 0.3048;
      resolvedDistance = calculateDistance(
        timesheet.clock_in_location.latitude, timesheet.clock_in_location.longitude,
        site.latitude, site.longitude
      );
      if (resolvedDistance <= resolvedRadius) {
        return Response.json({ status: 'success', message: 'Clock-in within geofence' });
      }
    } else {
      return Response.json({ status: 'skipped', reason: 'Invalid payload' });
    }

    // Fetch site for name
    const site = await base44.asServiceRole.entities.Site.get(resolvedSiteId);

    // Alert managers/supervisors/admins
    const managers = await base44.asServiceRole.entities.Employee.filter({
      role: { $in: ['manager', 'supervisor', 'admin'] }
    }).catch(() => []);

    if (managers.length === 0) {
      return Response.json({ status: 'skipped', reason: 'No managers found' });
    }

    const employee = await base44.asServiceRole.entities.Employee.get(resolvedEmployeeId);
    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee';
    const distanceFt = Math.round(resolvedDistance / 0.3048);
    const radiusFt = Math.round(resolvedRadius / 0.3048);

    const message = `⚠️ GEOFENCE ALERT: ${employeeName} attempted to clock in at ${site?.name || 'a site'} but was ${distanceFt} ft away (allowed: ${radiusFt} ft). Clock-in was denied.`;

    // Send notifications to all managers/supervisors/admins
    const notificationPromises = managers.map(manager =>
      base44.asServiceRole.entities.Notification.create({
        user_id: manager.id,
        title: `⚠️ Geofence Alert: ${employeeName}`,
        message,
        notification_type: 'gps_violation',
        destination_page: 'TimesheetsManagement',
        is_read: false,
      }).catch(err => console.log('Failed to notify manager:', err.message))
    );

    await Promise.all(notificationPromises);

    return Response.json({
      status: 'success',
      message: `Alert sent to ${managers.length} supervisor(s)/admin(s) for out-of-geofence clock-in attempt`,
      distance_ft: distanceFt,
      radius_ft: radiusFt,
    });

  } catch (error) {
    console.error('Error in alertAdminClockInOutsideGeofence:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}