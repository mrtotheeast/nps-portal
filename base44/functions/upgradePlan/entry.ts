import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { companyId } = await req.json();

    const companies = await base44.entities.Company.filter({ id: companyId });
    const company = companies[0];
    if (!company) return Response.json({ error: 'Company not found' }, { status: 404 });

    const stripeSubId = company.stripe_subscription_id;

    // Determine billing cycle from existing subscription to keep it the same
    let billingCycle = company.billing_cycle || 'monthly';
    let newPriceId;
    if (billingCycle === 'annual') {
      newPriceId = Deno.env.get('STRIPE_MULTI_LOCATION_ANNUAL_PRICE_ID');
    } else {
      newPriceId = Deno.env.get('STRIPE_MULTI_LOCATION_MONTHLY_PRICE_ID');
    }
    if (!newPriceId) return Response.json({ error: 'Multi-location price ID not configured' }, { status: 500 });

    const employees = await base44.entities.Employee.filter({ status: 'active' });
    const userCount = Math.max(1, employees.length);
    const newMonthly = (userCount * 5.0).toFixed(2);

    if (stripeSubId) {
      const sub = await stripe.subscriptions.retrieve(stripeSubId, { expand: ['items.data.price'] });

      const singleMonthly = Deno.env.get('STRIPE_SINGLE_LOCATION_MONTHLY_PRICE_ID');
      const singleAnnual  = Deno.env.get('STRIPE_SINGLE_LOCATION_ANNUAL_PRICE_ID');
      const basePriceIds  = [singleMonthly, singleAnnual].filter(Boolean);

      const baseItem = sub.items.data.find(i => basePriceIds.includes(i.price.id));
      if (!baseItem) return Response.json({ error: 'No upgradeable subscription item found' }, { status: 400 });

      await stripe.subscriptions.update(stripeSubId, {
        items: [{ id: baseItem.id, price: newPriceId, quantity: userCount }],
        proration_behavior: 'always_invoice',
      });
    }

    await base44.entities.Company.update(companyId, {
      plan_tier: 'multi',
      subscription_plan: 'enterprise',
      billing_user_count: userCount,
      billing_monthly_total: parseFloat(newMonthly),
    });

    // Notify admins
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const msg = `Your plan has been upgraded to Multiple Locations at $5.00 per user per month. Active users: ${userCount}. New ${billingCycle === 'annual' ? 'annual' : 'monthly'} total: $${newMonthly}.`;

    for (const admin of admins) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: admin.id,
        title: 'Plan Upgraded to Multiple Locations',
        message: msg,
        notification_type: 'announcement',
        destination_page: 'CompanySettings',
        is_read: false,
      }).catch(() => {});
    }

    if (RESEND_API_KEY && company.owner_email) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'NPS Portal Billing <noreply@npsportal.app>',
          to: [company.owner_email],
          subject: 'Plan Upgraded to Multiple Locations',
          html: `<p style="font-family:Arial,sans-serif;color:#0B1F3A;">${msg}</p><p style="font-family:Arial,sans-serif;color:#5B6E84;font-size:13px;">Manage your subscription: <a href="${req.headers.get('origin') || 'https://69fa7d4550030ecc751dd742.base44.app'}/CompanySettings">Company Settings</a></p>`,
        }),
      }).catch(() => {});
    }

    return Response.json({ success: true, newMonthly: parseFloat(newMonthly), userCount });
  } catch (error) {
    console.error('upgradePlan error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});