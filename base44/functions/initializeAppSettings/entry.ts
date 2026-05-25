import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const existing = await base44.asServiceRole.entities.AppSettings.list();
    
    if (existing.length === 0) {
      await base44.asServiceRole.entities.AppSettings.bulkCreate([
        {
          setting_key: 'photo_verification_enabled',
          setting_value: 'false',
          setting_type: 'boolean',
          category: 'timekeeping',
          description: 'Require photo verification on mobile clock-in'
        },
        {
          setting_key: 'desktop_clock_in_allowed',
          setting_value: 'true',
          setting_type: 'boolean',
          category: 'timekeeping',
          description: 'Allow employees to clock in from desktop'
        }
      ]);
      
      return Response.json({ message: 'App settings initialized', created: true });
    }

    return Response.json({ message: 'Settings already exist', created: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});