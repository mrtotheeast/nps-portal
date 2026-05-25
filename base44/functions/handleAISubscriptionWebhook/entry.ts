import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const WEBHOOK_SECRET = Deno.env.get('STRIPE_AI_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  if (WEBHOOK_SECRET) {
    event = await stripe.webhooks.constructEventAsync(body, sig, WEBHOOK_SECRET);
  } else {
    event = JSON.parse(body);
  }

  const base44 = createClientFromRequest(req);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { company_id, plan } = session.metadata || {};
    if (!company_id) return Response.json({ received: true });

    const customerId = session.customer;
    const subscriptionId = session.subscription;

    // Fetch sub to get period end
    const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
    const expiryDate = new Date(stripeSub.current_period_end * 1000).toISOString();
    const purchaseDate = new Date().toISOString();

    const existing = await base44.asServiceRole.entities.AISubscription.filter({ company_id });
    if (existing.length > 0) {
      await base44.asServiceRole.entities.AISubscription.update(existing[0].id, {
        status: 'active',
        plan,
        purchase_date: purchaseDate,
        expiry_date: expiryDate,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId
      });
    } else {
      await base44.asServiceRole.entities.AISubscription.create({
        company_id,
        status: 'active',
        plan,
        purchase_date: purchaseDate,
        expiry_date: expiryDate,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId
      });
    }
  }

  if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.paused') {
    const sub = event.data.object;
    const customerId = sub.customer;
    const allSubs = await base44.asServiceRole.entities.AISubscription.filter({ stripe_customer_id: customerId });
    for (const s of allSubs) {
      await base44.asServiceRole.entities.AISubscription.update(s.id, { status: 'inactive' });
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object;
    const customerId = sub.customer;
    const expiryDate = new Date(sub.current_period_end * 1000).toISOString();
    const status = sub.status === 'active' ? 'active' : 'inactive';
    const allSubs = await base44.asServiceRole.entities.AISubscription.filter({ stripe_customer_id: customerId });
    for (const s of allSubs) {
      await base44.asServiceRole.entities.AISubscription.update(s.id, { status, expiry_date: expiryDate });
    }
  }

  return Response.json({ received: true });
});