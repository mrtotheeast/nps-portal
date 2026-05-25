import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contact_id, client_id } = await req.json();

    if (!contact_id || !client_id) {
      return Response.json({ error: 'Missing contact_id or client_id' }, { status: 400 });
    }

    // Verify user is admin
    if (!['admin', 'super_admin', 'manager'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get contact
    const contact = await base44.entities.ClientContact.get(contact_id);
    if (!contact || contact.client_id !== client_id) {
      return Response.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Get client
    const client = await base44.entities.Client.get(client_id);
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Update contact status to invited
    await base44.entities.ClientContact.update(contact_id, {
      invite_status: "invited",
      invite_sent_at: new Date().toISOString(),
    });

    // Generate invite link (base64 encoded token)
    const inviteToken = btoa(`${contact.id}:${contact.email}:${Date.now()}`);
    const inviteLink = `https://npsportal.app/accept-invite?token=${inviteToken}&email=${encodeURIComponent(contact.email)}`;

    // Send invitation email with personalized HTML
    const firstName = contact.full_name?.split(' ')[0] || contact.full_name || 'Valued Client';
    await base44.integrations.Core.SendEmail({
      to: contact.email,
      subject: `Welcome to the NPS Portal, ${firstName}!`,
      body: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0b1f3a 0%,#1a2b4a 100%);padding:40px 32px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">🛡️</div>
            <h1 style="margin:0;color:#c9a84c;font-size:26px;font-weight:700;letter-spacing:1px;">NPS PORTAL</h1>
            <p style="margin:6px 0 0;color:#94a3b8;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Nationwide Police Services</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 32px 24px;">
            <h2 style="margin:0 0 8px;color:#0b1f3a;font-size:22px;font-weight:700;">Welcome, ${contact.full_name}!</h2>
            <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.7;">
              You've been invited to access the <strong>NPS Client Portal</strong> for <strong>${client.name}</strong>.
            </p>
            <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.7;">
              Through your portal, you can monitor your sites, view patrol reports, track officer activity, and communicate directly with your NPS account team — all in one secure place.
            </p>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:8px 0 28px;">
                  <a href="${inviteLink}" style="display:inline-block;background:#c9a84c;color:#0b1f3a;font-size:16px;font-weight:700;padding:14px 40px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">
                    Set Up My Account →
                  </a>
                </td>
              </tr>
            </table>

            <!-- Info box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 10px;color:#0b1f3a;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">What you can do in the portal</p>
                  <p style="margin:4px 0;color:#64748b;font-size:14px;">✅ &nbsp;View live officer activity at your sites</p>
                  <p style="margin:4px 0;color:#64748b;font-size:14px;">✅ &nbsp;Access incident and patrol reports</p>
                  <p style="margin:4px 0;color:#64748b;font-size:14px;">✅ &nbsp;Review schedules and officer credentials</p>
                  <p style="margin:4px 0;color:#64748b;font-size:14px;">✅ &nbsp;Send messages to your account manager</p>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
              This invite link is valid for 30 days. If you have any questions, please contact your NPS account manager.<br><br>
              If you did not expect this email, you can safely ignore it.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">© 2025 Nationwide Police Services LLC · MD License #105-5805</p>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Licensed &amp; Insured · MD · DC · VA · PA</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });

    return Response.json({
      success: true,
      message: `Invitation sent to ${contact.email}`,
    });
  } catch (error) {
    console.error('Error sending client invite:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});