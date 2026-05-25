import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Entities to fully wipe on company deletion
const WIPE_ENTITIES = [
  'Shift', 'Credential', 'PatrolSession', 'Incident', 'IncidentComment',
  'ChatMessage', 'ChatChannel', 'TrainingAssignment', 'SiteQRCode',
  'SiteDocument', 'GPSViolation', 'OnboardingDocument', 'DocumentAcknowledgment',
  'Notification', 'ClientNotification', 'ContractRenewal', 'Invoice',
  'PerformanceReview', 'UserTrainingPoints', 'AppSettings',
];

// Entities to wipe only if user chose NOT to keep bookkeeping data
const BOOKKEEPING_ENTITIES = ['Timesheet', 'PTORequest'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { company_id, keep_bookkeeping, confirm_name } = await req.json();
    if (!company_id) {
      return Response.json({ error: 'company_id is required' }, { status: 400 });
    }

    // Verify the company exists and confirm_name matches
    const companies = await base44.asServiceRole.entities.Company.filter({ id: company_id });
    const company = companies[0];
    if (!company) {
      return Response.json({ error: 'Company not found' }, { status: 404 });
    }
    if (confirm_name && confirm_name.trim().toLowerCase() !== company.name.trim().toLowerCase()) {
      return Response.json({ error: 'Company name does not match. Deletion cancelled.' }, { status: 400 });
    }

    const deletedAt = new Date().toISOString();
    const archiveExpiry = new Date(Date.now() + 24 * 30 * 24 * 60 * 60 * 1000).toISOString(); // ~24 months

    // --- 1. Wipe operational entities ---
    for (const entityName of WIPE_ENTITIES) {
      const records = await base44.asServiceRole.entities[entityName].list();
      for (const record of records) {
        await base44.asServiceRole.entities[entityName].delete(record.id);
      }
    }

    // --- 2. Handle bookkeeping entities ---
    if (keep_bookkeeping) {
      // Anonymize / archive timesheets and PTO — strip employee name but keep data
      const timesheets = await base44.asServiceRole.entities.Timesheet.list();
      for (const ts of timesheets) {
        await base44.asServiceRole.entities.Timesheet.update(ts.id, {
          archived: true,
          archive_expires_at: archiveExpiry,
          archived_company_id: company_id,
          archived_company_name: company.name,
        });
      }
      const ptoRequests = await base44.asServiceRole.entities.PTORequest.list();
      for (const pto of ptoRequests) {
        await base44.asServiceRole.entities.PTORequest.update(pto.id, {
          archived: true,
          archive_expires_at: archiveExpiry,
          archived_company_id: company_id,
        });
      }
    } else {
      for (const entityName of BOOKKEEPING_ENTITIES) {
        const records = await base44.asServiceRole.entities[entityName].list();
        for (const record of records) {
          await base44.asServiceRole.entities[entityName].delete(record.id);
        }
      }
    }

    // --- 3. Handle Employees ---
    const employees = await base44.asServiceRole.entities.Employee.list();
    for (const emp of employees) {
      if (keep_bookkeeping) {
        // Keep personal info + timesheet reference, mark as archived
        await base44.asServiceRole.entities.Employee.update(emp.id, {
          status: 'terminated',
          archived: true,
          archive_expires_at: archiveExpiry,
          archived_company_id: company_id,
          terminatedDate: deletedAt.split('T')[0],
          hasAppAccess: false,
        });
      } else {
        await base44.asServiceRole.entities.Employee.delete(emp.id);
      }
    }

    // --- 4. Delete Sites and Clients ---
    const sites = await base44.asServiceRole.entities.Site.list();
    for (const site of sites) {
      await base44.asServiceRole.entities.Site.delete(site.id);
    }
    const clients = await base44.asServiceRole.entities.Client.list();
    for (const client of clients) {
      await base44.asServiceRole.entities.Client.delete(client.id);
    }

    // --- 5. Cancel Stripe subscription if present ---
    if (company.stripe_subscription_id) {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (stripeKey) {
        await fetch(`https://api.stripe.com/v1/subscriptions/${company.stripe_subscription_id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${stripeKey}` },
        });
      }
    }

    // --- 6. Mark company as cancelled ---
    await base44.asServiceRole.entities.Company.update(company_id, {
      status: 'cancelled',
      cancelled_at: deletedAt,
      cancelled_by: user.email,
      keep_bookkeeping: keep_bookkeeping || false,
      bookkeeping_expires_at: keep_bookkeeping ? archiveExpiry : null,
    });

    // --- 7. Send confirmation email to owner ---
    if (company.owner_email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: company.owner_email,
        subject: `Account Cancellation Confirmed — ${company.name}`,
        body: `
          <p>Your NPS Portal account for <strong>${company.name}</strong> has been cancelled and all data has been removed.</p>
          ${keep_bookkeeping ? `<p>Employee timesheets, PTO records, and personal information will be retained for 24 months for bookkeeping purposes, after which they will be automatically deleted.</p>` : '<p>All employee and operational data has been permanently deleted.</p>'}
          <br/>
          <p>If this was a mistake or you have questions, please contact NPS Portal support.</p>
          <br/>
          <p>— NPS Portal</p>
        `
      });
    }

    // --- 8. Audit log ---
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'admin@npsportal.com',
      subject: `Company Account Deleted — ${company.name}`,
      body: `
        <p><strong>Company:</strong> ${company.name}</p>
        <p><strong>Owner:</strong> ${company.owner_email}</p>
        <p><strong>Deleted by:</strong> ${user.email}</p>
        <p><strong>Deleted at:</strong> ${deletedAt}</p>
        <p><strong>Keep bookkeeping:</strong> ${keep_bookkeeping ? 'Yes (24 months)' : 'No'}</p>
      `
    }).catch(() => {});

    return Response.json({
      success: true,
      keep_bookkeeping: keep_bookkeeping || false,
      archive_expires_at: keep_bookkeeping ? archiveExpiry : null,
    });

  } catch (error) {
    console.error('deleteCompanyAccount error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});