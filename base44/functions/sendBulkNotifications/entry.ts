import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['admin', 'super_admin', 'manager'].includes(user.role_type)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { user_ids, title, message, type, priority = "normal", action_url, send_email = false } = await req.json();

    if (!user_ids || !Array.isArray(user_ids) || !title || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const notifications = [];
    const emailPromises = [];

    for (const user_id of user_ids) {
      const notification = await base44.asServiceRole.entities.Notification.create({
        user_id,
        title,
        message,
        type,
        priority,
        action_url,
        read: false
      });
      notifications.push(notification);

      if (send_email) {
        const targetUsers = await base44.asServiceRole.entities.User.filter({ id: user_id });
        const targetUser = targetUsers[0];
        if (targetUser?.email) {
          emailPromises.push(
            base44.asServiceRole.integrations.Core.SendEmail({
              to: targetUser.email,
              subject: title,
              body: message
            })
          );
        }
      }
    }

    if (emailPromises.length > 0) {
      await Promise.all(emailPromises);
    }

    return Response.json({ 
      success: true, 
      count: notifications.length 
    });
  } catch (error) {
    console.error('Bulk notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});