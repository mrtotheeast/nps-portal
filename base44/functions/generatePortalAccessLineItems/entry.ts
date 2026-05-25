import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { client_id, billing_frequency } = await req.json();

    if (!client_id) {
      return Response.json({ error: 'Missing client_id' }, { status: 400 });
    }

    // Get all active contacts for this client
    const contacts = await base44.entities.ClientContact.filter({
      client_id,
      invite_status: "active",
    });

    if (contacts.length === 0) {
      return Response.json({ line_items: [] });
    }

    // Separate main and additional contacts
    const mainContact = contacts.find(c => c.is_main_contact);
    const additionalContacts = contacts.filter(c => !c.is_main_contact);

    // Calculate rates based on billing frequency
    const billingMap = {
      monthly: 1,
      "bi-weekly": 2,
      weekly: 4,
    };

    const divisor = billingMap[billing_frequency] || 1;
    const mainFeeMonthly = 10;
    const additionalFeeMonthly = 5;

    const lineItems = [];

    // Main contact line item
    if (mainContact) {
      const amount = (mainFeeMonthly / divisor).toFixed(2);
      lineItems.push({
        description: "NPS Portal Access — Main Contact (1 user)",
        amount: parseFloat(amount),
        quantity: 1,
        unit_price: parseFloat(amount),
        category: "portal_access",
        note: divisor > 1 ? `Prorated for ${billing_frequency} billing` : null,
      });
    }

    // Additional contacts line items
    for (const contact of additionalContacts) {
      const amount = (additionalFeeMonthly / divisor).toFixed(2);
      lineItems.push({
        description: `NPS Portal Access — Additional Contact (${contact.full_name})`,
        amount: parseFloat(amount),
        quantity: 1,
        unit_price: parseFloat(amount),
        category: "portal_access",
        note: divisor > 1 ? `Prorated for ${billing_frequency} billing` : null,
      });
    }

    return Response.json({ line_items: lineItems });
  } catch (error) {
    console.error('Error generating portal access line items:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});