import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@17.5.0';

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role_type !== 'client') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return Response.json({ error: 'invoiceId is required' }, { status: 400 });
    }

    const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId);
    
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.client_id !== user.client_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (invoice.status === 'paid') {
      return Response.json({ error: 'Invoice already paid' }, { status: 400 });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice #${invoice.invoice_number}`,
              description: `Payment for security services`,
            },
            unit_amount: Math.round(invoice.total * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/ClientInvoices?payment=success`,
      cancel_url: `${req.headers.get('origin')}/ClientInvoices?payment=cancelled`,
      metadata: {
        invoice_id: invoiceId,
        client_id: user.client_id
      }
    });

    // Update invoice with payment intent
    await base44.asServiceRole.entities.Invoice.update(invoiceId, {
      stripe_payment_intent_id: session.id
    });

    return Response.json({
      success: true,
      url: session.url
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});