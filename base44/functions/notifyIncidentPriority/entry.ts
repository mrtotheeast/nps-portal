import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { incident_id, priority, incident_type } = await req.json();
    
    if (!incident_id || !priority) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Only send notifications for high-priority incidents
    if (priority !== 'high' && priority !== 'critical') {
      return Response.json({ success: true, message: 'Not a high-priority incident' });
    }

    // Fetch all supervisors and managers
    const supervisors = await base44.entities.Employee.filter({ role: 'supervisor' });
    const managers = await base44.entities.Employee.filter({ role: 'manager' });
    const admins = await base44.entities.Employee.filter({ role: 'admin' });
    
    const recipients = [...supervisors, ...managers, ...admins].filter(e => e.email && e.status === 'active');

    // Send email to each supervisor/manager/admin
    for (const recipient of recipients) {
      try {
        await base44.integrations.Core.SendEmail({
          to: recipient.email,
          subject: `[HIGH PRIORITY] New ${priority.toUpperCase()} Incident: ${incident_type || 'Incident'}`,
          body: `A high-priority incident has been reported in the AIIncidentAnalysis system. Please log in immediately to review and take action.\n\nIncident ID: ${incident_id}\nPriority: ${priority}\nType: ${incident_type || 'N/A'}\n\nThis is an automated alert.`
        });
      } catch (e) {
        console.warn(`Failed to send email to ${recipient.email}:`, e.message);
      }
    }

    return Response.json({ success: true, notified: recipients.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});