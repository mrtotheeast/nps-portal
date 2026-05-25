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
    
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET')
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const invoiceId = session.metadata?.invoice_id;

      if (invoiceId) {
        await base44.asServiceRole.entities.Invoice.update(invoiceId, {
          status: 'paid',
          amount_paid: session.amount_total / 100,
          payment_method: 'stripe',
          payment_date: new Date().toISOString()
        });

        console.log(`Invoice ${invoiceId} marked as paid`);
      }
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('Webhook handling error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});