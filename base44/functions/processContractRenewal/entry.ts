import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { client_id, new_expiration_date, renewal_term_years = 1, notes = '' } = body;

    if (!client_id || !new_expiration_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get current client
    const clients = await base44.entities.Client.filter({ id: client_id });
    if (clients.length === 0) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const client = clients[0];
    const oldExpDate = client.contract_end_date;

    // Create renewal history record
    await base44.entities.ContractRenewal.create({
      client_id,
      renewal_date: new Date().toISOString(),
      old_expiration_date: oldExpDate,
      new_expiration_date,
      renewal_term_years,
      notes,
      processed_by: user.email
    });

    // Update client with new contract end date
    await base44.entities.Client.update(client_id, {
      contract_end_date: new_expiration_date
    });

    return Response.json({
      success: true,
      message: 'Contract renewal processed',
      old_date: oldExpDate,
      new_date: new_expiration_date
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});