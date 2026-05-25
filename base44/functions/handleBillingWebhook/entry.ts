import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const WEBHOOK_SECRET = Deno.env.get('STRIPE_BILLING_WEBHOOK_SECRET');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY || !to) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'NPS Portal Billing <noreply@npsportal.app>', to: [to], subject, html }),
  }).catch(e => console.warn('Email send failed:', e.message));
}

async function notifyAdmin(base44, companyId, title, message) {
  try {
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    for (const admin of admins) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: admin.id,
        title,
        message,
        notification_type: 'announcement',
        destination_page: 'CompanySettings',
        is_read: false,
      }).catch(() => {});
    }
  } catch (e) {
    console.warn('notifyAdmin failed:', e.message);
  }
}

async function findCompanyByStripeId(base44, stripeCustomerId, stripeSubId) {
  let companies = [];
  if (stripeSubId) {
    companies = await base44.asServiceRole.entities.Company.filter({ stripe_subscription_id: stripeSubId });
  }
  if (!companies.length && stripeCustomerId) {
    companies = await base44.asServiceRole.entities.Company.filter({ stripe_customer_id: stripeCustomerId });
  }
  return companies[0] || null;
}

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  try {
    const data = event.data.object;

    switch (event.type) {

      case 'checkout.session.completed': {
        // Initial subscription creation from onboarding
        if (data.mode !== 'subscription') break;
        const subId = data.subscription;
        const customerId = data.customer;
        const meta = data.metadata || {};
        const adminEmail = meta.admin_email || data.customer_email;
        const companyName = meta.company_name;
        const planTier = meta.plan_tier || 'single';
        const billingCycle = meta.billing_cycle || 'monthly';

        if (subId && customerId && companyName) {
          // Find company by name and set Stripe IDs
          const companies = await base44.asServiceRole.entities.Company.filter({});
          const company = companies.find(c => c.name === companyName || c.owner_email === adminEmail);
          if (company) {
            await base44.asServiceRole.entities.Company.update(company.id, {
              stripe_customer_id: customerId,
              stripe_subscription_id: subId,
              plan_tier: planTier,
              billing_cycle: billingCycle,
              subscription_plan: planTier === 'multi' ? 'enterprise' : 'professional',
            });
          }
        }
        break;
      }

      case 'invoice.paid': {
        const customerId = data.customer;
        const amount = (data.amount_paid / 100).toFixed(2);
        const invoiceUrl = data.hosted_invoice_url;
        const company = await findCompanyByStripeId(base44, customerId, null);
        if (!company) break;
        const msg = `Payment of $${amount} received. Your subscription is active. ${invoiceUrl ? `View invoice: ${invoiceUrl}` : ''}`;
        await notifyAdmin(base44, company.id, 'Payment Received', msg);
        await sendEmail(
          company.owner_email,
          `Payment Received: $${amount}`,
          `<p style="font-family:Arial,sans-serif;color:#0B1F3A;">Your payment of $${amount} has been received and your NPS Portal subscription is active.</p>${invoiceUrl ? `<p><a href="${invoiceUrl}" style="color:#0B1F3A;">View Invoice</a></p>` : ''}`
        );
        // Update next billing date
        if (data.lines?.data?.[0]?.period?.end) {
          const nextDate = new Date(data.lines.data[0].period.end * 1000).toISOString();
          await base44.asServiceRole.entities.Company.update(company.id, { billing_next_date: nextDate });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const customerId = data.customer;
        const amount = (data.amount_due / 100).toFixed(2);
        const company = await findCompanyByStripeId(base44, customerId, null);
        if (!company) break;
        const msg = `Payment of $${amount} failed. Please update your payment method to avoid service interruption. Go to Company Settings > Billing > Manage Subscription.`;
        await notifyAdmin(base44, company.id, 'Payment Failed — Action Required', msg);
        await sendEmail(
          company.owner_email,
          'Payment Failed — Update Your Payment Method',
          `<p style="font-family:Arial,sans-serif;color:#dc2626;font-weight:bold;">Payment Failed</p><p style="font-family:Arial,sans-serif;color:#374151;">A payment of $${amount} for your NPS Portal subscription failed. Please update your payment method to avoid service interruption.</p><p style="font-family:Arial,sans-serif;"><a href="${req.headers.get('origin') || 'https://69fa7d4550030ecc751dd742.base44.app'}/CompanySettings" style="background:#0B1F3A;color:#C9A84C;padding:10px 24px;text-decoration:none;border-radius:4px;">Update Payment Method</a></p>`
        );
        break;
      }

      case 'customer.subscription.updated': {
        const customerId = data.customer;
        const subId = data.id;
        const company = await findCompanyByStripeId(base44, customerId, subId);
        if (!company) break;
        const status = data.status;
        const item = data.items?.data?.[0];
        const qty = item?.quantity || 1;
        // Detect plan tier from price ID
        const priceId = item?.price?.id;
        const multiMonthly = Deno.env.get('STRIPE_MULTI_LOCATION_MONTHLY_PRICE_ID');
        const multiAnnual  = Deno.env.get('STRIPE_MULTI_LOCATION_ANNUAL_PRICE_ID');
        const isMulti = priceId === multiMonthly || priceId === multiAnnual;
        const pricePerUser = isMulti ? 5.0 : 2.5;
        const newTotal = (qty * pricePerUser).toFixed(2);

        await base44.asServiceRole.entities.Company.update(company.id, {
          billing_user_count: qty,
          billing_monthly_total: parseFloat(newTotal),
          plan_tier: isMulti ? 'multi' : 'single',
          subscription_plan: isMulti ? 'enterprise' : 'professional',
        });

        if (status === 'active') {
          const msg = `Subscription updated. Active users: ${qty}. Monthly total: $${newTotal}.`;
          await notifyAdmin(base44, company.id, 'Subscription Updated', msg);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const customerId = data.customer;
        const subId = data.id;
        const company = await findCompanyByStripeId(base44, customerId, subId);
        if (!company) break;
        await base44.asServiceRole.entities.Company.update(company.id, { status: 'suspended' });
        const msg = 'Your NPS Portal subscription has been cancelled. Your account has been suspended. Contact support to reactivate.';
        await notifyAdmin(base44, company.id, 'Subscription Cancelled', msg);
        await sendEmail(
          company.owner_email,
          'NPS Portal Subscription Cancelled',
          `<p style="font-family:Arial,sans-serif;color:#374151;">${msg}</p>`
        );
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('handleBillingWebhook processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});