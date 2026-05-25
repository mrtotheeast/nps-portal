import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { company_id, return_url } = await req.json();

  const subs = await base44.asServiceRole.entities.AISubscription.filter({ company_id });
  const customerId = subs[0]?.stripe_customer_id;

  if (!customerId) return Response.json({ error: 'No customer found' }, { status: 404 });

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: return_url || `${req.headers.get('origin')}/CompanySettings`
  });

  return Response.json({ url: session.url });
});