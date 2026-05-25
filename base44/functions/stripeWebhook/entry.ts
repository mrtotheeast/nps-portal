import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@17.5.0';

let stripe = null;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    if (!stripe) {
      stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    }

    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    let event;
    if (webhookSecret) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      } catch (err) {
        return Response.json({ error: `Webhook verification failed: ${err.message}` }, { status: 400 });
      }
    } else {
      event = JSON.parse(body);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const invoice_id = session.client_reference_id || session.metadata?.invoice_id;

        if (invoice_id) {
          await base44.asServiceRole.entities.Invoice.update(invoice_id, {
            status: 'paid',
            paid_date: new Date().toISOString(),
            payment_method: 'card',
            stripe_payment_id: session.payment_intent
          });

          const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: invoice_id });
          const inv = invoices[0];
          if (inv) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: inv.client_email || 'billing@nps.app',
              subject: 'Payment Confirmed - Nationwide Protective Services',
              body: `Thank you for your payment of $${inv.total_amount || 0}!\n\nInvoice #: ${inv.invoice_number || inv.id.substring(0, 8)}\nAmount Paid: $${inv.total_amount || 0}\nPayment Date: ${new Date().toLocaleDateString()}\n\nYour payment has been processed successfully.\n\nBest regards,\nNationwide Protective Services`
            });
          }
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        console.error('Payment failed:', event.data.object.id);
        break;
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});