import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { incidentId, assignedTo } = await req.json();

    const incidents = await base44.asServiceRole.entities.Incident.filter({ id: incidentId });
    const incident = incidents[0];

    if (!incident) {
      return Response.json({ error: 'Incident not found' }, { status: 404 });
    }

    const employees = await base44.asServiceRole.entities.Employee.filter({ id: assignedTo });
    const assignedUser = employees[0];

    if (!assignedUser || !assignedUser.email) {
      return Response.json({ error: 'Assigned user not found' }, { status: 404 });
    }

    await base44.asServiceRole.entities.Notification.create({
      user_id: assignedTo,
      title: 'New Incident Assignment',
      message: `You have been assigned to incident: ${incident.incident_type.replace('_', ' ')}`,
      type: 'incident',
      priority: incident.priority || 'normal',
      related_entity: {
        entity_type: 'Incident',
        entity_id: incidentId
      }
    });

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: assignedUser.email,
      subject: 'New Incident Assignment',
      body: `Hello ${assignedUser.firstName},\n\nYou have been assigned to handle an incident:\n\nType: ${incident.incident_type.replace('_', ' ')}\nSeverity: ${incident.severity}\nPriority: ${incident.priority || 'medium'}\nDate: ${incident.incident_date}\n\nDescription: ${incident.description}\n\nPlease review and take appropriate action.\n\nThank you.`
    });

    return Response.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});