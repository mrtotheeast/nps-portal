import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await base44.asServiceRole.entities.AppSettings.list();
    
    const settingsObj = {};
    settings.forEach(setting => {
      const value = setting.setting_type === 'boolean' 
        ? setting.setting_value === 'true' 
        : setting.setting_value;
      settingsObj[setting.setting_key] = {
        value,
        type: setting.setting_type,
        description: setting.description
      };
    });

    return Response.json(settingsObj);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});