import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { latitude, longitude, accuracy, source } = await req.json();

    if (!latitude || !longitude) {
      return Response.json({ error: 'Missing GPS coordinates' }, { status: 400 });
    }

    const timesheets = await base44.asServiceRole.entities.Timesheet.filter({
      employee_id: user.id,
      status: 'pending'
    });

    const activeTimesheet = timesheets.find(t => t.clock_in && !t.clock_out);

    if (!activeTimesheet) {
      return Response.json({ error: 'No active timesheet' }, { status: 400 });
    }

    const updatedTimesheet = await base44.asServiceRole.entities.Timesheet.update(
      activeTimesheet.id,
      {
        clock_in_location: {
          latitude,
          longitude,
          accuracy: accuracy || 'unknown',
          timestamp: new Date().toISOString(),
          source: source || 'gps'
        }
      }
    );

    const sites = await base44.asServiceRole.entities.Site.list();
    const assignedSite = sites.find(s => s.id === activeTimesheet.site_id);

    if (assignedSite && assignedSite.geofence && assignedSite.geofence.enabled) {
      const distance = calculateDistance(latitude, longitude, assignedSite.latitude, assignedSite.longitude);
      const radiusMiles = (assignedSite.geofence.radius_meters || 300) / 1609.34;

      if (distance > radiusMiles) {
        await base44.asServiceRole.entities.GPSViolation.create({
          officer_id: user.id,
          site_id: activeTimesheet.site_id,
          timestamp: new Date().toISOString(),
          location: { latitude, longitude },
          distance_from_site: distance,
          severity: 'low',
          status: 'pending'
        });
      }
    }

    return Response.json({ success: true, timesheet: updatedTimesheet });
  } catch (error) {
    console.error('Location update error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});