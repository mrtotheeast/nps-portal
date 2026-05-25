import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    if (payload.event) {
      const { event, data, old_data } = payload;
      
      if (event.entity_name === 'OnboardingTask' && event.type === 'create') {
        await base44.asServiceRole.entities.Notification.create({
          user_id: data.employee_id,
          title: "New Onboarding Task",
          message: `You have a new task: ${data.task_title}`,
          type: "general",
          priority: data.priority || "normal",
          action_url: "/Onboarding"
        });
      }

      if (event.entity_name === 'Shift') {
        let title = "Schedule Updated";
        let message = "";
        
        if (event.type === 'create') {
          title = "New Shift Assigned";
          message = `You've been assigned a shift on ${data.date}`;
        } else if (event.type === 'update') {
          message = `Your shift on ${data.date} has been updated`;
        } else if (event.type === 'delete') {
          title = "Shift Removed";
          message = `Your shift on ${old_data?.date} has been removed`;
        }

        if (message && data.employee_id) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: data.employee_id,
            title,
            message,
            type: "schedule",
            priority: "normal",
            action_url: "/Schedule"
          });
        }
      }

      if (event.entity_name === 'PTORequest') {
        const users = await base44.asServiceRole.entities.User.list();
        
        if (event.type === 'create') {
          const admins = users.filter(u => u.role === 'admin' || u.role_type === 'manager');
          for (const admin of admins) {
            await base44.asServiceRole.entities.Notification.create({
              user_id: admin.id,
              title: "New PTO Request",
              message: `${data.employee_name || 'An employee'} requested PTO from ${data.start_date} to ${data.end_date}`,
              type: "approval",
              priority: "high",
              action_url: "/PTOApproval"
            });
          }
        } else if (event.type === 'update' && old_data.status !== data.status) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: data.employee_id,
            title: `PTO Request ${data.status}`,
            message: `Your PTO request from ${data.start_date} to ${data.end_date} has been ${data.status}`,
            type: "general",
            priority: data.status === 'approved' ? 'normal' : 'high',
            action_url: "/PTORequest"
          });
        }
      }

      if (event.entity_name === 'TrainingAssignment' && event.type === 'create') {
        await base44.asServiceRole.entities.Notification.create({
          user_id: data.employee_id,
          title: "New Training Assigned",
          message: `You have been assigned: ${data.course_title || 'a new training course'}`,
          type: "training",
          priority: data.required ? "high" : "normal",
          action_url: "/Training"
        });
      }

      return Response.json({ success: true, message: "Notification sent" });
    }

    const { user_id, title, message, type, priority = "normal", action_url, related_entity, send_email = false } = payload;

    if (!user_id || !title || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const notification = await base44.asServiceRole.entities.Notification.create({
      user_id,
      title,
      message,
      type,
      priority,
      action_url,
      related_entity,
      read: false
    });

    if (send_email) {
      const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
      const targetUser = users[0];
      
      if (targetUser?.email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: targetUser.email,
          subject: title,
          body: message
        });
      }
    }

    return Response.json({ 
      success: true, 
      notification_id: notification.id 
    });
  } catch (error) {
    console.error('Notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});