import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { stats, invoices, clientMap, filtered, aging } = payload;

    // Use existing generateInvoicePDF function logic
    const result = await base44.functions.invoke('generateInvoicePDF', {
      invoice_data: filtered,
      clientMap,
      stats,
      aging
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});