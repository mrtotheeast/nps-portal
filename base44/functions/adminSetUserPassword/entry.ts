import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

Deno.serve(async (req) => {
    try {
        const body = await req.json();
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const isAdmin = user.role === 'admin' || user.role_type === 'admin' || user.role_type === 'manager' || user.role_type === 'super_admin';
        if (!isAdmin) {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { target_email, new_password, employee_name, employee_role } = body;
        if (!target_email || !new_password) {
            return Response.json({ error: 'Email and password are required' }, { status: 400 });
        }
        if (new_password.length < 6) {
            return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        const emailLower = target_email.toLowerCase().trim();

        // Step 1: Check if the user already has a platform account
        const users = await base44.asServiceRole.entities.User.filter({ email: emailLower });

        if (users && users.length > 0) {
            // User exists — set their password directly
            const targetUser = users[0];
            console.log('Found user record, setting password for userId:', targetUser.id);

            // Update Employee record
            const employees = await base44.asServiceRole.entities.Employee.filter({ email: emailLower });
            if (employees && employees.length > 0) {
                await base44.asServiceRole.entities.Employee.update(employees[0].id, {
                    must_change_password: true,
                    invitation_status: 'active',
                    password_reset_code: new_password,
                    password_reset_expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                });
            }

            // Send email with temporary password
            if (RESEND_API_KEY) {
                const displayName = targetUser.full_name || employee_name || emailLower;
                const html = buildPasswordResetEmail(displayName, emailLower, new_password);
                await sendEmail(emailLower, 'Your NPS Portal Password Reset', html);
            }

            return Response.json({ success: true, status: 'password_set', message: 'Password set. User must change on next login.' });
        }

        // User has no platform account yet — save temp password and send instructions email.
        // They must sign up at npsportal.app first; once they do, admin can set the password again.
        console.log('No User account found for:', emailLower, '— saving temp password and sending signup instructions.');

        // Never store plain-text passwords — password was already emailed above
        const employees = await base44.asServiceRole.entities.Employee.filter({ email: emailLower });
        if (employees && employees.length > 0) {
            await base44.asServiceRole.entities.Employee.update(employees[0].id, {
                invitation_status: 'invited',
                temp_password: null,
            });
        }

        if (RESEND_API_KEY) {
            const displayName = employee_name || emailLower;
            const html = buildCredentialsEmail(displayName, emailLower, new_password, true);
            await sendEmail(emailLower, 'Your NPS Portal Access Instructions', html);
        }

        return Response.json({
            success: true,
            status: 'no_account',
            message: 'This user has not signed up yet. Instructions emailed — they must create an account at npsportal.app first, then an admin can set their password.',
        });

    } catch (error) {
        console.error('Error in adminSetUserPassword:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

async function sendEmail(to, subject, html) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from: 'Nationwide Police Services <noreply@npsportal.app>',
            to: [to],
            subject,
            html,
        }),
    });
    if (!res.ok) {
        const err = await res.text();
        console.warn('Email send warning:', err);
    } else {
        console.log('Email sent to:', to);
    }
}

function buildCredentialsEmail(displayName, email, password, needsSignup) {
    const bodyText = needsSignup
        ? `An administrator has set a password for your NPS Portal account. However, you must <strong>create your account first</strong> by visiting the portal and signing up with your work email address. Once you have signed up, your password will be activated.`
        : `An administrator has set your NPS Portal password. Use the credentials below to sign in:`;
    const buttonLabel = needsSignup ? 'Create My Account at NPS Portal' : 'Sign In to NPS Portal';
    const signupNote = needsSignup
        ? `<p style="color:#dc2626;font-weight:bold;margin:16px 0 0;font-size:13px;">⚠️ Important: You must sign up at npsportal.app with this email address before you can log in with the password above.</p>`
        : '';
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#1a2b4a 0%,#2d4a6f 100%);padding:28px 32px;text-align:center;">
          <h1 style="color:#c9a227;margin:8px 0 4px;font-size:22px;">Nationwide Police Services</h1>
          <p style="color:#c8d2e6;margin:0;font-size:13px;">NPS Employee Portal</p>
        </td></tr>
        <tr><td style="padding:36px 32px;">
          <h2 style="color:#1a2b4a;margin:0 0 16px;">Your Portal Credentials</h2>
          <p style="color:#475569;line-height:1.7;margin:0 0 12px;">Hi ${displayName},</p>
          <p style="color:#475569;line-height:1.7;margin:0 0 20px;">${bodyText}</p>
          <div style="background:#fffbeb;border:2px solid #c9a227;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
            <p style="color:#78350f;font-size:13px;margin:0 0 12px;font-weight:bold;">YOUR LOGIN CREDENTIALS</p>
            <p style="color:#1a2b4a;margin:0 0 8px;"><strong>Email:</strong> ${email}</p>
            <p style="color:#1a2b4a;margin:0;"><strong>Password:</strong> <span style="font-family:monospace;font-size:20px;font-weight:bold;letter-spacing:2px;">${password}</span></p>
          </div>
          ${signupNote}
          <div style="text-align:center;margin:28px 0;">
            <a href="https://npsportal.app" style="background:#c9a227;color:#1a2b4a;padding:13px 32px;border-radius:5px;text-decoration:none;font-weight:bold;font-size:15px;">${buttonLabel}</a>
          </div>
        </td></tr>
        <tr><td style="background:#1a2b4a;padding:20px 32px;text-align:center;">
          <p style="color:#c9a227;margin:0 0 4px;font-size:13px;font-weight:bold;">Nationwide Police Services LLC</p>
          <p style="color:#94a3b8;margin:0;font-size:12px;">(240) 749-1141 | Info@NationwidePolice.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildPasswordResetEmail(displayName, email, tempPassword) {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#1a2b4a 0%,#2d4a6f 100%);padding:28px 32px;text-align:center;">
          <h1 style="color:#c9a227;margin:8px 0 4px;font-size:22px;">Nationwide Police Services</h1>
          <p style="color:#c8d2e6;margin:0;font-size:13px;">NPS Employee Portal</p>
        </td></tr>
        <tr><td style="padding:36px 32px;">
          <h2 style="color:#1a2b4a;margin:0 0 16px;">Password Reset Required</h2>
          <p style="color:#475569;line-height:1.7;margin:0 0 12px;">Hi ${displayName},</p>
          <p style="color:#475569;line-height:1.7;margin:0 0 20px;">An administrator has set a temporary password for your NPS Portal account. For security, you must reset your password on first login.</p>
          <div style="background:#fffbeb;border:2px solid #c9a227;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
            <p style="color:#78350f;font-size:13px;margin:0 0 12px;font-weight:bold;">TEMPORARY PASSWORD</p>
            <p style="color:#1a2b4a;margin:0 0 8px;"><strong>Email:</strong> ${email}</p>
            <p style="color:#1a2b4a;margin:0;"><strong>Temporary Password:</strong> <span style="font-family:monospace;font-size:20px;font-weight:bold;letter-spacing:2px;">${tempPassword}</span></p>
          </div>
          <p style="color:#dc2626;font-weight:bold;margin:16px 0 0;font-size:13px;">⚠️ You will be required to change this password when you log in.</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="https://npsportal.app" style="background:#c9a227;color:#1a2b4a;padding:13px 32px;border-radius:5px;text-decoration:none;font-weight:bold;font-size:15px;">Reset My Password</a>
          </div>
        </td></tr>
        <tr><td style="background:#1a2b4a;padding:20px 32px;text-align:center;">
          <p style="color:#c9a227;margin:0 0 4px;font-size:13px;font-weight:bold;">Nationwide Police Services LLC</p>
          <p style="color:#94a3b8;margin:0;font-size:12px;">(240) 749-1141 | Info@NationwidePolice.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}