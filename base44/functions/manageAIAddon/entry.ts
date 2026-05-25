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

    const { action, companyId, cycle = 'monthly' } = await req.json();
    // action: 'add' | 'remove'

    const companies = await base44.entities.Company.filter({ id: companyId });
    const company = companies[0];
    if (!company) return Response.json({ error: 'Company not found' }, { status: 404 });

    const stripeSubId = company.stripe_subscription_id;
    if (!stripeSubId) return Response.json({ error: 'No active subscription found' }, { status: 400 });

    const aiPriceId = cycle === 'annual'
      ? Deno.env.get('STRIPE_AI_ANNUAL_PRICE_ID')
      : Deno.env.get('STRIPE_AI_MONTHLY_PRICE_ID');
    if (!aiPriceId) return Response.json({ error: 'AI price ID not configured' }, { status: 500 });

    const sub = await stripe.subscriptions.retrieve(stripeSubId, { expand: ['items.data.price'] });
    const aiPriceIds = [Deno.env.get('STRIPE_AI_MONTHLY_PRICE_ID'), Deno.env.get('STRIPE_AI_ANNUAL_PRICE_ID')].filter(Boolean);
    const existingAIItem = sub.items.data.find(i => aiPriceIds.includes(i.price.id));

    if (action === 'add') {
      if (existingAIItem) return Response.json({ success: true, already_active: true });

      await stripe.subscriptions.update(stripeSubId, {
        items: [{ price: aiPriceId, quantity: 1 }],
        proration_behavior: 'always_invoice',
      });

      // Update or create AISubscription record
      const existing = await base44.entities.AISubscription.filter({ company_id: companyId });
      if (existing[0]) {
        await base44.entities.AISubscription.update(existing[0].id, {
          status: 'active',
          plan: cycle,
          purchase_date: new Date().toISOString(),
        });
      } else {
        await base44.entities.AISubscription.create({
          company_id: companyId,
          status: 'active',
          plan: cycle,
          purchase_date: new Date().toISOString(),
          stripe_customer_id: company.stripe_customer_id,
          stripe_subscription_id: stripeSubId,
        });
      }

      return Response.json({ success: true, action: 'added' });

    } else if (action === 'remove') {
      if (!existingAIItem) return Response.json({ success: true, already_removed: true });

      await stripe.subscriptions.update(stripeSubId, {
        items: [{ id: existingAIItem.id, deleted: true }],
        proration_behavior: 'create_prorations',
      });

      const existing = await base44.entities.AISubscription.filter({ company_id: companyId });
      if (existing[0]) {
        await base44.entities.AISubscription.update(existing[0].id, { status: 'inactive' });
      }

      return Response.json({ success: true, action: 'removed' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('manageAIAddon error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});