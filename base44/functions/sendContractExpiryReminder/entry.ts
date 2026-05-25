import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can trigger this
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all active clients
    const clients = await base44.entities.Client.filter({ status: 'active' });
    
    // Calculate 90-day window
    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    
    // Filter clients with contracts expiring in the next 90 days
    const expiringClients = clients.filter(client => {
      if (!client.contract_end_date) return false;
      const endDate = new Date(client.contract_end_date);
      return endDate > now && endDate <= in90Days;
    });

    if (expiringClients.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No contracts expiring within 90 days',
        checked: clients.length,
        expiring: 0
      });
    }

    // Get all admin users to send notification
    const admins = await base44.entities.User.filter({ role: 'admin' });
    
    // Build email content
    const expiringList = expiringClients
      .map(c => {
        const daysLeft = Math.ceil((new Date(c.contract_end_date) - now) / (1000 * 60 * 60 * 24));
        return `• ${c.name} — expires in ${daysLeft} days (${new Date(c.contract_end_date).toLocaleDateString()})`;
      })
      .join('\n');

    const emailBody = `
Contract Renewal Alert

The following ${expiringClients.length} client contract(s) are set to expire within the next 90 days:

${expiringList}

Please reach out to these clients to discuss renewal options.

Log in to the admin portal to view details and manage contracts.

---
NPS Portal Automated Alert
    `.trim();

    // Send email to all admins
    const emailPromises = admins.map(admin =>
      base44.integrations.Core.SendEmail({
        to: admin.email,
        subject: `⚠️ ${expiringClients.length} Client Contract(s) Expiring Soon`,
        body: emailBody,
      }).catch(err => console.error(`Failed to send to ${admin.email}:`, err.message))
    );

    await Promise.all(emailPromises);

    return Response.json({
      success: true,
      message: `Sent renewal alerts for ${expiringClients.length} expiring contract(s)`,
      notified: admins.length,
      expiringClients: expiringClients.map(c => ({
        id: c.id,
        name: c.name,
        expiryDate: c.contract_end_date
      }))
    });

  } catch (error) {
    console.error('Contract expiry check failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});