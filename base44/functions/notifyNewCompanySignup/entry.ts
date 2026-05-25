import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPER_ADMIN_EMAIL = 'justin.ashe@nationwidepolice.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const {
      companyName, adminName, adminEmail, operatingStates,
      plan, pricePerUser, userCount,
      hasAI, aiPlan, registeredAt,
    } = await req.json();

    const formattedDate = new Date(registeredAt || Date.now()).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const stateList = Array.isArray(operatingStates) ? operatingStates.join(', ') : (operatingStates || 'Not specified');
    const planLabel = plan === 'multi' ? 'Multiple Locations' : 'Single Location';
    const perUserLabel = pricePerUser ? `$${parseFloat(pricePerUser).toFixed(2)}/user/month` : 'N/A';
    const aiLabel = hasAI ? `Purchased - ${aiPlan === 'annual' ? 'Annual $299.99/yr' : 'Monthly $29.99/mo'}` : 'Not purchased';
    const estimatedMonthly = pricePerUser && userCount ? `$${(parseFloat(pricePerUser) * parseInt(userCount)).toFixed(2)}/month` : 'N/A';

    // In-app notification to all super admins
    try {
      const superAdmins = await base44.asServiceRole.entities.User.filter({ role: 'super_admin' });
      for (const admin of superAdmins) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: admin.id,
          title: `New Company Registered: ${companyName}`,
          message: `${adminName} (${adminEmail}) registered ${companyName} on ${formattedDate}. Plan: ${planLabel} at ${perUserLabel}. Users: ${userCount || 1}. Estimated monthly: ${estimatedMonthly}. AI Add-on: ${aiLabel}. Operating in: ${stateList}.`,
          notification_type: 'announcement',
          destination_page: 'SuperAdminDashboard',
          is_read: false,
        });
      }
    } catch (notifErr) {
      console.warn('In-app notification failed:', notifErr.message);
    }

    // Email to super admin
    const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#0B1F3A 0%,#1a3560 100%);padding:28px 32px;text-align:center;">
          <p style="color:#C9A84C;margin:0 0 4px;font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;">NPS Portal</p>
          <h1 style="color:#ffffff;margin:0;font-size:22px;letter-spacing:2px;font-weight:bold;text-transform:uppercase;">New Company Registered</h1>
          <p style="color:#8ca3c0;margin:6px 0 0;font-size:13px;">Admin Notification</p>
        </td></tr>
        <tr><td style="padding:36px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
              <strong style="color:#0B1F3A;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Company Name</strong><br/>
              <span style="color:#374151;font-size:16px;font-weight:600;">${companyName}</span>
            </td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
              <strong style="color:#0B1F3A;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Administrator</strong><br/>
              <span style="color:#374151;font-size:15px;">${adminName}</span><br/>
              <span style="color:#C9A84C;font-size:14px;">${adminEmail}</span>
            </td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
              <strong style="color:#0B1F3A;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Subscription Plan</strong><br/>
              <span style="color:#374151;font-size:15px;">${planLabel} — ${perUserLabel}</span>
            </td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
              <strong style="color:#0B1F3A;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Initial User Count</strong><br/>
              <span style="color:#374151;font-size:15px;">${userCount || 1} user(s) — Est. ${estimatedMonthly}</span>
            </td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
              <strong style="color:#0B1F3A;font-size:12px;text-transform:uppercase;letter-spacing:1px;">AI Reporting Add-on</strong><br/>
              <span style="color:#374151;font-size:14px;">${aiLabel}</span>
            </td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
              <strong style="color:#0B1F3A;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Operating States</strong><br/>
              <span style="color:#374151;font-size:14px;">${stateList}</span>
            </td></tr>
            <tr><td style="padding:12px 0;">
              <strong style="color:#0B1F3A;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Registered</strong><br/>
              <span style="color:#374151;font-size:14px;">${formattedDate} ET</span>
            </td></tr>
          </table>
          <div style="margin-top:28px;text-align:center;">
            <a href="https://npsportal.app/SuperAdminDashboard" style="background:#C9A84C;color:#0B1F3A;padding:12px 28px;border-radius:5px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:1px;">View in Super Admin Dashboard</a>
          </div>
        </td></tr>
        <tr><td style="background:#0B1F3A;padding:18px 32px;text-align:center;">
          <p style="color:#C9A84C;margin:0;font-size:12px;font-weight:bold;letter-spacing:1px;">NPS PORTAL</p>
          <p style="color:#64748b;margin:4px 0 0;font-size:11px;">This is an automated notification. Do not reply to this email.</p>
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
        to: [SUPER_ADMIN_EMAIL],
        subject: `New Company Registered: ${companyName} — ${planLabel}`,
        html: htmlBody,
      }),
    });

    if (!resendRes.ok) {
      console.error('Email send failed:', await resendRes.text());
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('notifyNewCompanySignup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});