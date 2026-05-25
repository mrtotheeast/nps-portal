import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'manager', 'super_admin'].includes(user.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { client_id } = body;

  const clientData = await base44.asServiceRole.entities.Client.get(client_id);
  if (!clientData) return Response.json({ error: 'Client not found' }, { status: 404 });

  const now = new Date().toISOString();

  // Reactivate client
  await base44.asServiceRole.entities.Client.update(client_id, {
    status: 'active',
    deletion_initiated_by: null,
    deletion_date: null,
    deleted_by_client: false,
    deletion_reason: null,
    reactivation_date: now,
    reactivated_by: user.full_name || user.email,
  });

  // Send reactivation email to client
  const clientEmail = clientData.primary_contact?.email || clientData.contact_email;
  if (clientEmail) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: clientEmail,
        subject: 'Your NPS Portal Access Has Been Restored',
        body: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111;">
            <div style="background:#1a2b4a;padding:24px;text-align:center;">
              <h1 style="color:#c9a227;margin:0;font-size:22px;">Nationwide Police Services</h1>
              <p style="color:#cbd5e1;margin:8px 0 0;font-size:14px;">NPS Portal</p>
            </div>
            <div style="padding:32px 24px;">
              <h2 style="color:#1a2b4a;">Your Portal Access Has Been Restored</h2>
              <p>Hello ${clientData.primary_contact?.full_name || 'Valued Client'},</p>
              <p>Your NPS Portal access has been restored. You can now log in and access your client dashboard.</p>
              <div style="text-align:center;margin:32px 0;">
                <a href="https://npsportal.app" style="background:#c9a227;color:#1a2b4a;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
                  Log In to NPS Portal
                </a>
              </div>
              <p>If you did not request this reactivation or have any concerns, please contact us:</p>
              <ul>
                <li>Email: <a href="mailto:Info@NationwidePolice.com">Info@NationwidePolice.com</a></li>
                <li>Phone: (240) 749-1141</li>
              </ul>
            </div>
            <div style="background:#f1f5f9;padding:16px 24px;text-align:center;font-size:12px;color:#64748b;">
              Nationwide Police Services LLC | npsportal.app
            </div>
          </div>
        `,
      });
    } catch (e) {
      console.warn('Could not send reactivation email:', e.message);
    }
  }

  return Response.json({ success: true, client_email: clientEmail });
});