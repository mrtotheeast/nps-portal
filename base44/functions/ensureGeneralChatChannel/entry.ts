import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get or create the general channel
    const channels = await base44.asServiceRole.entities.ChatChannel.list();
    let generalChannel = channels.find(ch => ch.is_company_wide && ch.name === "Nationwide Police Services");

    if (!generalChannel) {
      // Get all active employees
      const employees = await base44.asServiceRole.entities.Employee.list();
      const activeMembers = employees
        .filter(e => e.status === "active" && e.invitation_status === "active")
        .map(e => e.id);

      generalChannel = await base44.asServiceRole.entities.ChatChannel.create({
        name: "Nationwide Police Services",
        description: "Company-wide communication channel",
        created_by: "system",
        member_ids: activeMembers,
        is_company_wide: true
      });
    } else {
      // Update existing channel with all active employees
      const employees = await base44.asServiceRole.entities.Employee.list();
      const activeMembers = employees
        .filter(e => e.status === "active" && e.invitation_status === "active")
        .map(e => e.id);

      const uniqueMembers = [...new Set([...generalChannel.member_ids, ...activeMembers])];

      await base44.asServiceRole.entities.ChatChannel.update(generalChannel.id, {
        member_ids: uniqueMembers
      });
    }

    return Response.json({ success: true, channel: generalChannel });
  } catch (error) {
    console.error('Ensure general chat channel error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});