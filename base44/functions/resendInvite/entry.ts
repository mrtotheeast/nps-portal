import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_6911511d11edb2138d9f9703/a7d6b44d2_NPS_BADGE_2021-removebg-preview.jpg";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || !['admin', 'super_admin', 'manager'].includes(user.role_type)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { invite_id } = await req.json();

    if (!invite_id) {
      return Response.json({ error: 'Invite ID is required' }, { status: 400 });
    }

    const invites = await base44.asServiceRole.entities.PendingInvite.filter({ id: invite_id });
    const invite = invites[0];

    if (!invite) {
      return Response.json({ error: 'Invite not found' }, { status: 404 });
    }

    await base44.asServiceRole.users.inviteUser(
      invite.email, 
      invite.role, 
      { role_type: invite.user_type }
    );

    const emailBody = `Welcome to NPS Portal. You've been invited to join. Check your email for login instructions.`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: invite.email,
      subject: 'NPS Portal — Your Account Invitation',
      body: emailBody,
      from_name: "NPS Portal",
    });

    await base44.asServiceRole.entities.PendingInvite.update(invite_id, {
      ...invite,
      resent_count: (invite.resent_count || 0) + 1,
      last_resent_at: new Date().toISOString()
    });

    return Response.json({ 
      success: true, 
      message: 'Invitation resent successfully' 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});