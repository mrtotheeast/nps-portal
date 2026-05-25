import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if company-wide channel exists
    const channels = await base44.asServiceRole.entities.ChatChannel.list();
    const companyChannel = channels.find(ch => ch.is_company_wide && ch.name === "Nationwide Police Services");

    if (!companyChannel) {
      // Get all employees
      const employees = await base44.asServiceRole.entities.Employee.list();
      const memberIds = employees.map(e => e.id);

      // Create company-wide channel
      const newChannel = await base44.asServiceRole.entities.ChatChannel.create({
        name: "Nationwide Police Services",
        description: "Company-wide communication channel",
        created_by: user.id,
        member_ids: memberIds,
        is_company_wide: true
      });

      return Response.json({ success: true, channel: newChannel });
    }

    return Response.json({ success: true, channel: companyChannel });
  } catch (error) {
    console.error('Init chat error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});