import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const LOGO_URL = "https://media.base44.com/images/public/69fa7d4550030ecc751dd742/67dad5aba_NPSPortalAPPicon.jpg";

function npsEmailTemplate({ heading, body }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#1a2b4a 0%,#2d4a6f 100%);padding:28px 32px;text-align:center;">
          <img src="${LOGO_URL}" alt="NPS Badge" width="72" height="72" style="border-radius:50%;margin-bottom:12px;display:block;margin:0 auto 12px;" />
          <h1 style="color:#c9a227;margin:8px 0 4px;font-size:22px;letter-spacing:0.5px;">Nationwide Police Services</h1>
          <p style="color:#c8d2e6;margin:0;font-size:13px;">NPS Employee Portal</p>
        </td></tr>
        <tr><td style="padding:36px 32px;">
          <h2 style="color:#1a2b4a;margin:0 0 16px;font-size:20px;">${heading}</h2>
          ${body}
          <p style="color:#94a3b8;font-size:12px;margin-top:28px;border-top:1px solid #e2e8f0;padding-top:16px;">If you did not request this, please contact your administrator immediately at <a href="mailto:Info@NationwidePolice.com" style="color:#1a2b4a;">Info@NationwidePolice.com</a>.</p>
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
</html>`;
}

Deno.serve(async (req) => {
  try {
    // No authentication required — this is the forgot-password flow
    const base44 = createClientFromRequest(req);
    const { target_email } = await req.json();

    if (!target_email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const emailToReset = target_email.toLowerCase().trim();

    // Look up the Employee record by email (we store the reset code here)
    const employees = await base44.asServiceRole.entities.Employee.filter({ email: emailToReset });
    if (!employees || employees.length === 0) {
      // Return success to avoid user enumeration
      return Response.json({ success: true });
    }

    const employee = employees[0];
    const displayName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || emailToReset;

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // Store reset code on Employee record
    await base44.asServiceRole.entities.Employee.update(employee.id, {
      password_reset_code: code,
      password_reset_expires: expiresAt,
    });

    const html = npsEmailTemplate({
      heading: 'Password Reset Request',
      body: `
        <p style="color:#475569;line-height:1.7;margin:0 0 12px;">Hello ${displayName},</p>
        <p style="color:#475569;line-height:1.7;margin:0 0 20px;">Use the code below to reset your NPS Portal password. This code expires in <strong>30 minutes</strong>.</p>
        <div style="background:#f8fafc;border:2px dashed #c9a227;border-radius:8px;text-align:center;padding:20px;margin:20px 0;">
          <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1a2b4a;">${code}</span>
        </div>
        <p style="color:#475569;font-size:13px;">Enter this code on the NPS Portal reset page to set your new password.</p>
      `,
    });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Nationwide Police Services <noreply@npsportal.app>',
        to: [emailToReset],
        subject: 'Password Reset Code — NPS Portal',
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Email send failed: ${errText}`);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Password reset email error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});