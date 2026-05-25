import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { alertId } = await req.json();

    if (!alertId) {
      return Response.json({ error: 'alertId is required' }, { status: 400 });
    }

    const alert = await base44.asServiceRole.entities.EmergencyAlert.get(alertId);
    if (!alert) {
      return Response.json({ error: 'Alert not found' }, { status: 404 });
    }

    // Add officer to acknowledged list
    const acknowledged = alert.acknowledged_by || [];
    const alreadyAcknowledged = acknowledged.some(a => a.officer_id === user.id);
    
    if (!alreadyAcknowledged) {
      acknowledged.push({
        officer_id: user.id,
        acknowledged_at: new Date().toISOString()
      });

      await base44.asServiceRole.entities.EmergencyAlert.update(alertId, {
        acknowledged_by: acknowledged,
        status: 'acknowledged'
      });
    }

    return Response.json({
      success: true,
      message: 'Alert acknowledged'
    });

  } catch (error) {
    console.error('Acknowledge alert error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});