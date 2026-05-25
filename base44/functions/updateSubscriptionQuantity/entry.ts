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

    const { companyId, action, employeeName } = await req.json();
    // action: 'add' | 'remove'

    const companies = await base44.entities.Company.filter({ id: companyId });
    const company = companies[0];
    if (!company) return Response.json({ error: 'Company not found' }, { status: 404 });

    const stripeSubId = company.stripe_subscription_id;

    // Count active employees (after the add/remove is expected to happen)
    const employees = await base44.entities.Employee.filter({ status: 'active' });
    const currentCount = employees.length;
    const newQty = action === 'add' ? currentCount + 1 : Math.max(1, currentCount - 1);

    // Determine plan tier & price per user
    const planTier = company.plan_tier || 'single';
    const pricePerUser = planTier === 'multi' ? 5.00 : 2.50;
    const newMonthly = (newQty * pricePerUser).toFixed(2);

    // Find the base subscription item (not the AI add-on)
    let prorated_amount = null;
    if (stripeSubId) {
      const sub = await stripe.subscriptions.retrieve(stripeSubId, { expand: ['items.data.price'] });

      const singleMonthly = Deno.env.get('STRIPE_SINGLE_LOCATION_MONTHLY_PRICE_ID');
      const singleAnnual  = Deno.env.get('STRIPE_SINGLE_LOCATION_ANNUAL_PRICE_ID');
      const multiMonthly  = Deno.env.get('STRIPE_MULTI_LOCATION_MONTHLY_PRICE_ID');
      const multiAnnual   = Deno.env.get('STRIPE_MULTI_LOCATION_ANNUAL_PRICE_ID');
      const basePriceIds  = [singleMonthly, singleAnnual, multiMonthly, multiAnnual].filter(Boolean);

      const baseItem = sub.items.data.find(i => basePriceIds.includes(i.price.id));
      if (!baseItem) return Response.json({ error: 'No base subscription item found' }, { status: 400 });

      const updated = await stripe.subscriptions.update(stripeSubId, {
        items: [{ id: baseItem.id, quantity: newQty }],
        proration_behavior: action === 'add' ? 'always_invoice' : 'create_prorations',
      });

      // Calculate prorated amount from upcoming invoice if adding
      if (action === 'add') {
        try {
          const upcoming = await stripe.invoices.retrieveUpcoming({ customer: company.stripe_customer_id });
          const proratedLine = upcoming.lines.data.find(l => l.proration && l.quantity && l.quantity > 0);
          prorated_amount = proratedLine ? (proratedLine.amount / 100).toFixed(2) : null;
        } catch (_) { /* non-fatal */ }
      }
    }

    // Update company record
    await base44.entities.Company.update(companyId, {
      billing_user_count: newQty,
      billing_monthly_total: parseFloat(newMonthly),
    });

    // In-app notifications for admins
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const msg = action === 'add'
      ? `${employeeName || 'A new employee'} has been added. Subscription updated to ${newQty} users at $${pricePerUser.toFixed(2)}/user/month. New monthly total: $${newMonthly}.`
      : `${employeeName || 'An employee'} has been removed. Subscription updated to ${newQty} users at $${pricePerUser.toFixed(2)}/user/month. New monthly total: $${newMonthly}. Credit applied to next billing cycle.`;

    for (const admin of admins) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: admin.id,
        title: action === 'add' ? 'Employee Added — Billing Updated' : 'Employee Removed — Billing Updated',
        message: msg,
        notification_type: 'announcement',
        destination_page: 'CompanySettings',
        is_read: false,
      }).catch(() => {});
    }

    // Email admin
    if (RESEND_API_KEY && company.owner_email) {
      const subject = action === 'add'
        ? `Employee Added: Billing Updated to $${newMonthly}/month`
        : `Employee Removed: Billing Updated to $${newMonthly}/month`;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'NPS Portal Billing <noreply@npsportal.app>',
          to: [company.owner_email],
          subject,
          html: `<p style="font-family:Arial,sans-serif;color:#0B1F3A;">${msg}</p><p style="font-family:Arial,sans-serif;color:#5B6E84;font-size:13px;">Manage your subscription: <a href="${req.headers.get('origin') || 'https://69fa7d4550030ecc751dd742.base44.app'}/CompanySettings">Company Settings</a></p>`,
        }),
      }).catch(() => {});
    }

    return Response.json({ success: true, newQty, newMonthly, prorated_amount });
  } catch (error) {
    console.error('updateSubscriptionQuantity error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});