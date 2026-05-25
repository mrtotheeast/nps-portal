import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { company_id, return_url } = await req.json();

    const companies = await base44.entities.Company.filter({ id: company_id });
    const company = companies[0];
    if (!company) return Response.json({ error: 'Company not found' }, { status: 404 });

    const customerId = company.stripe_customer_id;
    if (!customerId) return Response.json({ error: 'No Stripe customer found for this company' }, { status: 400 });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: return_url || `${req.headers.get('origin') || 'https://69fa7d4550030ecc751dd742.base44.app'}/CompanySettings`,
    });

    return Response.json({ success: true, url: session.url });
  } catch (error) {
    console.error('createBillingPortalSession error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});