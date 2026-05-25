import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Send an invitation to join a company/tenant.
 * The invited user will be assigned to the company when they accept.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, role = 'employee', company_id } = await req.json();

    if (!email || !company_id) {
      return Response.json({ error: 'Missing email or company_id' }, { status: 400 });
    }

    // Verify inviter is admin of the company
    const senderEmployees = await base44.asServiceRole.entities.Employee.filter({
      email: user.email,
      company_id
    });

    if (senderEmployees.length === 0 || !['admin', 'manager', 'supervisor'].includes(senderEmployees[0].role)) {
      return Response.json({ error: 'Not authorized to invite for this company' }, { status: 403 });
    }

    // Check if employee already exists for that company
    const existing = await base44.asServiceRole.entities.Employee.filter({
      email,
      company_id
    });

    if (existing.length > 0) {
      return Response.json({ error: 'User already belongs to this company' }, { status: 409 });
    }

    // Create or update employee record with company_id
    const allEmps = await base44.asServiceRole.entities.Employee.filter({ email });
    
    if (allEmps.length === 0) {
      // New employee for this company
      await base44.asServiceRole.entities.Employee.create({
        email,
        role,
        company_id,
        firstName: email.split('@')[0],
        lastName: 'Pending',
        status: 'active',
        invitation_status: 'invited',
        invitation_sent_at: new Date().toISOString()
      });
    } else {
      // Existing employee - add to new company
      await base44.asServiceRole.entities.Employee.update(allEmps[0].id, {
        company_id,
        role,
        invitation_status: 'invited',
        invitation_sent_at: new Date().toISOString()
      });
    }

    // Send invitation email with company context
    const company = await base44.asServiceRole.entities.Company.filter({ id: company_id });
    const companyName = company.length > 0 ? company[0].name : 'Your Company';

    const inviteLink = `${new URL(req.url).origin}/?accept_invite=${company_id}&email=${encodeURIComponent(email)}`;

    await base44.integrations.Core.SendEmail({
      to: email,
      subject: `You've been invited to join ${companyName}`,
      body: `You have been invited to join ${companyName} on the NPS Portal.\n\nClick here to accept: ${inviteLink}\n\nYour role: ${role}`
    });

    return Response.json({
      success: true,
      message: `Invitation sent to ${email}`,
      company_id
    });

  } catch (error) {
    console.error('Invite error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});