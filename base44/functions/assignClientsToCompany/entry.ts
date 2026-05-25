import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { company_id } = await req.json();
  if (!company_id) {
    return Response.json({ error: 'company_id required' }, { status: 400 });
  }

  const allClients = await base44.asServiceRole.entities.Client.filter({});
  const clientsWithoutCompany = allClients.filter(c => !c.company_id);

  let updated = 0;
  for (const client of clientsWithoutCompany) {
    await base44.asServiceRole.entities.Client.update(client.id, { company_id });
    updated++;
  }

  return Response.json({ success: true, updated, total: allClients.length });
});