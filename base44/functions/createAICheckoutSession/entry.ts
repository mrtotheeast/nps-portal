import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PRICES = {
  monthly: { amount: 2999, interval: 'month', label: 'Monthly Plan' },
  annual:  { amount: 29999, interval: 'year',  label: 'Annual Plan'  }
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { plan, company_id, success_url, cancel_url } = await req.json();

  if (!PRICES[plan]) return Response.json({ error: 'Invalid plan' }, { status: 400 });

  const price = PRICES[plan];

  // Check for existing customer
  const subs = await base44.asServiceRole.entities.AISubscription.filter({ company_id });
  const existingCustomerId = subs[0]?.stripe_customer_id || null;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer: existingCustomerId || undefined,
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `NPS AI Reporting — ${price.label}` },
        unit_amount: price.amount,
        recurring: { interval: price.interval }
      },
      quantity: 1
    }],
    metadata: { company_id, plan },
    success_url: success_url || `${req.headers.get('origin')}/CompanySettings?ai_success=1`,
    cancel_url:  cancel_url  || `${req.headers.get('origin')}/CompanySettings`,
  });

  return Response.json({ url: session.url, session_id: session.id });
});