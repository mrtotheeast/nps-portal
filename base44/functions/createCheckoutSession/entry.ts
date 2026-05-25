import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@17.5.0';

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
    apiVersion: '2024-12-18.acacia',
  });
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoice_id, success_url, cancel_url } = await req.json();

    // Fetch invoice
    const invoice = await base44.entities.Invoice.filter({ id: invoice_id });
    if (!invoice || invoice.length === 0) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const inv = invoice[0];

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice #${inv.invoice_number || inv.id.substring(0, 8)}`,
              description: `Service period: ${inv.service_start_date} to ${inv.service_end_date}`,
            },
            unit_amount: Math.round(inv.total_amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: success_url || `${req.headers.get('origin')}/client-dashboard?payment=success`,
      cancel_url: cancel_url || `${req.headers.get('origin')}/invoices?payment=cancelled`,
      client_reference_id: invoice_id,
      customer_email: user.email,
      metadata: {
        invoice_id: invoice_id,
        user_id: user.id,
        invoice_number: inv.invoice_number || '',
      },
    });

    return Response.json({
      success: true,
      session_id: session.id,
      url: session.url
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});