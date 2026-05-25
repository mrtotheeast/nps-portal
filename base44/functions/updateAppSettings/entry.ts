import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { setting_key, setting_value, setting_type } = await req.json();

    if (!setting_key || setting_value === undefined) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key });
    
    if (settings.length === 0) {
      return Response.json({ error: 'Setting not found' }, { status: 404 });
    }

    const settingId = settings[0].id;
    
    await base44.asServiceRole.entities.AppSettings.update(settingId, {
      setting_value: String(setting_value),
      setting_type: setting_type || 'string',
      last_modified_by: user.id,
      last_modified_at: new Date().toISOString()
    });

    return Response.json({ 
      success: true, 
      message: `Setting ${setting_key} updated`,
      setting_key,
      setting_value
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});