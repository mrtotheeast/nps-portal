import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email, firstName, employee_id, full_name, role, temp_password } = body;
    const name = firstName || full_name || 'Team Member';

    // Only use temp_password if passed directly in the payload — never read it from the DB
    const passwordToSend = temp_password || null;

    if (!email) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }

    // Invite user to the Base44 platform with role matching Employee entity
    // For Base44 User: admin = "admin", all others = "user"
    const platformRole = role === "admin" ? "admin" : "user";

    try {
      await base44.asServiceRole.users.inviteUser(email, platformRole);
    } catch (inviteErr) {
      console.log('Invite user note:', inviteErr.message);
    }

    const invitationLink = `https://npsportal.app`;

    const tempPasswordSection = passwordToSend ? `
      <div style="background:#fffbeb;border:2px solid #c9a227;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
        <p style="color:#78350f;font-size:13px;margin:0 0 8px;font-weight:bold;">YOUR TEMPORARY PASSWORD</p>
        <p style="font-size:28px;font-weight:bold;letter-spacing:4px;color:#1a2b4a;margin:0 0 8px;font-family:monospace;">${passwordToSend}</p>
        <p style="color:#78350f;font-size:12px;margin:0;">You will be required to change this password on your first login.</p>
      </div>
    ` : '';

    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:32px 16px;">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <tr><td style="background:linear-gradient(135deg,#1a2b4a 0%,#2d4a6f 100%);padding:28px 32px;text-align:center;">
              <h1 style="color:#c9a227;margin:8px 0 4px;font-size:22px;">Nationwide Police Services</h1>
              <p style="color:#c8d2e6;margin:0;font-size:13px;">NPS Employee Portal</p>
            </td></tr>
            <tr><td style="padding:36px 32px;">
              <h2 style="color:#1a2b4a;margin:0 0 16px;font-size:20px;">Welcome, ${name}!</h2>
              <p style="color:#475569;line-height:1.7;margin:0 0 12px;">You've been invited to join the Nationwide Police Services portal as a <strong>${role || 'team member'}</strong>.</p>
              ${tempPasswordSection}
              <p style="color:#475569;line-height:1.7;margin:0 0 20px;">Use the button below to access the portal and sign in with your email and the temporary password above.</p>
              <div style="text-align:center;margin:28px 0;">
                <a href="${invitationLink}" style="background:#c9a227;color:#1a2b4a;padding:13px 32px;border-radius:5px;text-decoration:none;font-weight:bold;font-size:15px;">Access the NPS Portal</a>
              </div>
              <p style="color:#94a3b8;font-size:12px;margin-top:28px;border-top:1px solid #e2e8f0;padding-top:16px;">If you did not expect this invitation, please contact <a href="mailto:Info@NationwidePolice.com" style="color:#1a2b4a;">Info@NationwidePolice.com</a>.</p>
            </td></tr>
            <tr><td style="background:#1a2b4a;padding:20px 32px;text-align:center;">
              <p style="color:#c9a227;margin:0 0 4px;font-size:13px;font-weight:bold;">Nationwide Police Services LLC</p>
              <p style="color:#94a3b8;margin:0;font-size:12px;">9920 Franklin Square Dr Ste 110, Nottingham, MD 21236</p>
              <p style="color:#94a3b8;margin:4px 0 0;font-size:12px;">(240) 749-1141 | Info@NationwidePolice.com</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Nationwide Police Services <noreply@npsportal.app>',
        to: [email],
        subject: `Welcome to the NPS Portal — You've Been Invited`,
        html: htmlBody,
      }),
    });

    if (!resendResponse.ok) {
      const err = await resendResponse.text();
      throw new Error(`Resend error: ${err}`);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});