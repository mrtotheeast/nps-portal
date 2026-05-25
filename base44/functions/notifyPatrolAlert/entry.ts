import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    const { event, data } = payload;
    
    if (event?.entity_name === 'PatrolSession') {
      const patrol = data;
      
      const users = await base44.asServiceRole.entities.User.list();
      const usersToNotify = users.filter(u => 
        ['admin', 'manager', 'supervisor'].includes(u.role_type) &&
        u.notification_preferences?.patrol_alerts !== false
      );
      
      const officer = users.find(u => u.id === patrol.officer_id);
      
      let siteName = "Unknown Site";
      if (patrol.site_id) {
        const sites = await base44.asServiceRole.entities.Site.list();
        const site = sites.find(s => s.id === patrol.site_id);
        siteName = site?.name || siteName;
      }
      
      let title = "";
      let message = "";
      let priority = "normal";
      
      if (event.type === 'create') {
        title = "Patrol Started";
        message = `${officer?.full_name || 'An officer'} started a patrol at ${siteName}`;
      } else if (event.type === 'update' && patrol.status === 'completed') {
        title = "Patrol Completed";
        message = `${officer?.full_name || 'An officer'} completed patrol at ${siteName}`;
      }
      
      if (title && message) {
        for (const user of usersToNotify) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: user.id,
            title,
            message,
            type: 'patrol_alert',
            priority,
            action_url: `/Patrol`,
            related_entity: {
              entity_type: 'PatrolSession',
              entity_id: patrol.id
            }
          });
        }
        
        return Response.json({ success: true, notified: usersToNotify.length });
      }
    }
    
    return Response.json({ success: true, message: 'No action taken' });
  } catch (error) {
    console.error('Patrol notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});