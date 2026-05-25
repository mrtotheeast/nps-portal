import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { employee_id } = await req.json();

    if (!employee_id) {
      return Response.json({ error: 'employee_id is required' }, { status: 400 });
    }

    // Get the general channel
    const channels = await base44.asServiceRole.entities.ChatChannel.list();
    const generalChannel = channels.find(ch => ch.is_company_wide && ch.name === "Nationwide Police Services");

    if (!generalChannel) {
      return Response.json({ error: 'General channel not found' }, { status: 404 });
    }

    // Add employee to channel if not already there
    if (!generalChannel.member_ids?.includes(employee_id)) {
      const updatedMembers = [...(generalChannel.member_ids || []), employee_id];
      await base44.asServiceRole.entities.ChatChannel.update(generalChannel.id, {
        member_ids: updatedMembers
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Add employee to general chat error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});