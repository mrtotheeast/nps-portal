import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

function getPriceId(tier, cycle) {
  if (tier === 'single' && cycle === 'monthly') return Deno.env.get('STRIPE_SINGLE_LOCATION_MONTHLY_PRICE_ID');
  if (tier === 'single' && cycle === 'annual')  return Deno.env.get('STRIPE_SINGLE_LOCATION_ANNUAL_PRICE_ID');
  if (tier === 'multi'  && cycle === 'monthly') return Deno.env.get('STRIPE_MULTI_LOCATION_MONTHLY_PRICE_ID');
  if (tier === 'multi'  && cycle === 'annual')  return Deno.env.get('STRIPE_MULTI_LOCATION_ANNUAL_PRICE_ID');
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { plan, cycle = 'monthly', successUrl, cancelUrl, adminEmail, companyName } = await req.json();

    const priceId = getPriceId(plan, cycle);
    if (!priceId) return Response.json({ error: `No price ID configured for plan=${plan} cycle=${cycle}` }, { status: 400 });

    // Create or find Stripe customer
    let customerId = null;
    if (adminEmail) {
      const existing = await stripe.customers.list({ email: adminEmail, limit: 1 });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const customer = await stripe.customers.create({ email: adminEmail, name: companyName || undefined });
        customerId = customer.id;
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId || undefined,
      customer_email: customerId ? undefined : adminEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        plan_tier: plan,
        billing_cycle: cycle,
        company_name: companyName || '',
        admin_email: adminEmail || '',
      },
      subscription_data: {
        metadata: {
          plan_tier: plan,
          billing_cycle: cycle,
          company_name: companyName || '',
        },
      },
    });

    return Response.json({ success: true, url: session.url, session_id: session.id });
  } catch (error) {
    console.error('createOnboardingCheckout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});