import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { client_id } = body;

  // Get client data first for audit trail
  const clientData = await base44.asServiceRole.entities.Client.get(client_id);
  const clientEmail = clientData?.primary_contact?.email || user.email;

  // Mark client as deleted in database (for reporting) and disable system access
  const now = new Date().toISOString();
  await base44.asServiceRole.entities.Client.update(client_id, {
    status: 'deleted',
    system_access: false,
    deletion_initiated_by: 'client',
    deletion_date: now,
    deleted_by_client: true,
  });

  // Delete user from Base44 auth system to revoke access
  try {
    await base44.asServiceRole.functions.invoke('deleteUserAccount', {
      user_email: clientEmail,
    });
  } catch (e) {
    console.warn('Could not delete user account from auth system:', e.message);
  }

  // Archive to DeletedClientAuditLog for reporting
  try {
    await base44.asServiceRole.functions.invoke('archiveDeletedClientToAuditLog', {
      client_id,
      client_data: clientData,
      deletion_reason: 'Client self-deletion',
      deleted_by_client: true,
    });
  } catch (e) {
    console.warn('Could not archive to audit log:', e.message);
  }

  // Send audit notification
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'Info@NationwidePolice.com',
      subject: `Client Account Deletion: ${clientData?.name || 'Unknown'}`,
      body: `
        <h2 style="color:#1a2b4a;">Client Account Deletion Notice</h2>
        <p>A client has initiated account deletion.</p>
        <ul>
          <li><strong>Client Name:</strong> ${clientData?.name || 'Unknown'}</li>
          <li><strong>Contact Email:</strong> ${clientEmail}</li>
          <li><strong>Deletion Date:</strong> ${new Date(now).toLocaleString()}</li>
          <li><strong>Initiated By:</strong> Client (self-deletion)</li>
        </ul>
        <p>Portal access has been revoked and user account deleted from auth system. Records remain accessible in Client Management for reporting purposes.</p>
        <p>You can reactivate their account at any time from the client record.</p>
        <p><em>Log in to NPS Portal → Client Management to view this record.</em></p>
      `,
    });
  } catch (e) {
    console.warn('Could not send admin notification email:', e.message);
  }

  return Response.json({ success: true });
});