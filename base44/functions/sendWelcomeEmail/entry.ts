import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { to, companyName, adminName, plan, pricePerUser, loginUrl } = await req.json();

    if (!to || !companyName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const planLabel = plan || 'NPS Portal';
    const perUser = pricePerUser ? `$${parseFloat(pricePerUser).toFixed(2)} per user per month` : 'Per-user monthly billing';
    const loginLink = loginUrl || 'https://npsportal.app';
    const supportLink = 'https://nationwidepolice.com/nps-portal';

    const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#0B1F3A 0%,#1a3560 100%);padding:32px;text-align:center;">
          <p style="color:#C9A84C;margin:0 0 8px;font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;">NPS Portal</p>
          <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:bold;">Welcome to NPS Portal</h1>
          <p style="color:#8ca3c0;margin:8px 0 0;font-size:14px;">Your company account is active.</p>
        </td></tr>
        <tr><td style="padding:36px 32px;">
          <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">Hello ${adminName},</p>
          <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
            Your company account for <strong>${companyName}</strong> has been created. You can now sign in and begin setting up your operation.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;border:1px solid #e2e8f0;margin:0 0 28px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:bold;color:#0B1F3A;text-transform:uppercase;letter-spacing:1px;">Account Details</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#64748b;width:140px;">Company</td>
                  <td style="padding:6px 0;font-size:13px;color:#0B1F3A;font-weight:600;">${companyName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#64748b;">Login Email</td>
                  <td style="padding:6px 0;font-size:13px;color:#0B1F3A;font-weight:600;">${to}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#64748b;">Subscription Plan</td>
                  <td style="padding:6px 0;font-size:13px;color:#0B1F3A;font-weight:600;">${planLabel}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#64748b;">Billing Rate</td>
                  <td style="padding:6px 0;font-size:13px;color:#0B1F3A;font-weight:600;">${perUser}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#64748b;">Billing Cycle</td>
                  <td style="padding:6px 0;font-size:13px;color:#0B1F3A;font-weight:600;">Month-to-month. Cancel anytime.</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#64748b;">Login URL</td>
                  <td style="padding:6px 0;font-size:13px;"><a href="${loginLink}" style="color:#C9A84C;">${loginLink}</a></td>
                </tr>
              </table>
            </td></tr>
          </table>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${loginLink}" style="background:#0B1F3A;color:#C9A84C;padding:14px 32px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:1px;display:inline-block;">Sign In to Your Dashboard</a>
          </div>
          <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 16px;">
            If you have any questions or need assistance getting started, visit our support page at
            <a href="${supportLink}" style="color:#C9A84C;">${supportLink}</a>.
          </p>
          <p style="color:#374151;font-size:14px;line-height:1.7;margin:0;">Thank you for choosing NPS Portal.</p>
        </td></tr>
        <tr><td style="background:#0B1F3A;padding:20px 32px;text-align:center;">
          <p style="color:#C9A84C;margin:0;font-size:12px;font-weight:bold;letter-spacing:1px;">NPS PORTAL</p>
          <p style="color:#64748b;margin:4px 0 0;font-size:11px;">Security Workforce Management</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'NPS Portal <noreply@npsportal.app>',
        to: [to],
        subject: `Welcome to NPS Portal — ${companyName}`,
        html: htmlBody,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.text();
      console.error('Welcome email failed:', err);
      return Response.json({ error: err }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('sendWelcomeEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});