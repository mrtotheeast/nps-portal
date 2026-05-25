import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Initialize a new company/tenant when a user is created.
 * Called during user signup or admin invitation.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { company_name, company_slug, subscription_plan = 'professional' } = await req.json();

    if (!company_name || !company_slug) {
      return Response.json({ error: 'Missing company_name or company_slug' }, { status: 400 });
    }

    // Check if company already exists
    const existing = await base44.asServiceRole.entities.Company.filter({ slug: company_slug });
    if (existing.length > 0) {
      return Response.json({ error: 'Company slug already exists' }, { status: 409 });
    }

    // Create the company
    const company = await base44.asServiceRole.entities.Company.create({
      name: company_name,
      slug: company_slug,
      owner_email: user.email,
      subscription_plan,
      status: 'active',
      primary_color: '#1a2b4a',
      max_users: subscription_plan === 'enterprise' ? 1000 : subscription_plan === 'professional' ? 100 : 25
    });

    // Assign the user to the company as admin
    const employees = await base44.asServiceRole.entities.Employee.filter({ email: user.email });
    if (employees.length > 0) {
      await base44.asServiceRole.entities.Employee.update(employees[0].id, {
        company_id: company.id,
        role: 'admin'
      });
    }

    // Update User entity with company_id
    const users = await base44.asServiceRole.entities.User.filter({ email: user.email });
    if (users.length > 0) {
      await base44.asServiceRole.entities.User.update(users[0].id, {
        company_id: company.id
      });
    }

    return Response.json({
      success: true,
      company_id: company.id,
      company_name: company.name
    });

  } catch (error) {
    console.error('Initialize tenant error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});