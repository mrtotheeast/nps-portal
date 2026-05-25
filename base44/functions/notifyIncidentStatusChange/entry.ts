import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { incidentId, newStatus } = await req.json();

    const incidents = await base44.asServiceRole.entities.Incident.filter({ id: incidentId });
    const incident = incidents[0];

    if (!incident) {
      return Response.json({ error: 'Incident not found' }, { status: 404 });
    }

    await base44.asServiceRole.entities.Notification.create({
      user_id: incident.reporter_id,
      title: 'Incident Status Update',
      message: `Incident status changed to: ${newStatus}`,
      type: 'incident',
      priority: 'normal',
      related_entity: {
        entity_type: 'Incident',
        entity_id: incidentId
      }
    });

    if (incident.assigned_to) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: incident.assigned_to,
        title: 'Incident Status Update',
        message: `Incident status changed to: ${newStatus}`,
        type: 'incident',
        priority: 'normal',
        related_entity: {
          entity_type: 'Incident',
          entity_id: incidentId
        }
      });
    }

    return Response.json({ success: true, message: 'Notifications sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});