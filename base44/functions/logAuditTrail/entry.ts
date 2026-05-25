import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    if (payload.event) {
      const { event, data, old_data } = payload;
      
      if (event.entity_name === 'AuditLog') {
        return Response.json({ success: true, message: 'Skipped AuditLog' });
      }
      
      const users = await base44.asServiceRole.entities.User.list();
      const user = users.find(u => u.id === data.created_by || u.email === data.created_by);
      
      let severity = 'low';
      const criticalEntities = ['Employee', 'User', 'RolePermission'];
      const highPriorityEntities = ['Incident', 'EmergencyAlert', 'Invoice'];
      
      if (criticalEntities.includes(event.entity_name) || event.type === 'delete') {
        severity = 'critical';
      } else if (highPriorityEntities.includes(event.entity_name)) {
        severity = 'high';
      } else if (event.type === 'update') {
        severity = 'medium';
      }
      
      let changes = null;
      if (event.type === 'update' && old_data) {
        changes = { before: old_data, after: data };
      }
      
      const entityName = data.title || data.name || data.full_name || data.id || 'Unknown';
      
      await base44.asServiceRole.entities.AuditLog.create({
        user_id: user?.id || 'system',
        user_name: user?.full_name || 'System',
        user_email: user?.email || 'system@nps.app',
        action: event.type,
        entity_type: event.entity_name,
        entity_id: event.entity_id,
        entity_name: entityName,
        changes: changes,
        severity: severity,
        metadata: {
          automated: true,
          timestamp: new Date().toISOString()
        }
      });
      
      return Response.json({ success: true, logged: event.entity_name });
    }
    
    const { user_id, action, entity_type, entity_id, entity_name, changes, severity = 'low', metadata } = payload;
    
    if (!user_id || !action || !entity_type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const users = await base44.asServiceRole.entities.User.list();
    const user = users.find(u => u.id === user_id);
    
    const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const user_agent = req.headers.get('user-agent') || 'unknown';
    
    const auditLog = await base44.asServiceRole.entities.AuditLog.create({
      user_id,
      user_name: user?.full_name || 'Unknown',
      user_email: user?.email || 'unknown@email.com',
      action,
      entity_type,
      entity_id,
      entity_name,
      changes,
      ip_address,
      user_agent,
      severity,
      metadata
    });
    
    return Response.json({ success: true, audit_log_id: auditLog.id });
  } catch (error) {
    console.error('Audit log error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});