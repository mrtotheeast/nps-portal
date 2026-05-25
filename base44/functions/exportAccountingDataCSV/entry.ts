import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoices = await base44.entities.Invoice.list('-created_date');
    const clients = await base44.entities.Client.list();
    const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

    // Build CSV
    let csv = 'Invoice #,Client,Status,Issue Date,Due Date,Total,Balance Due\n';
    
    invoices.forEach(inv => {
      const client = clientMap[inv.client_id];
      const row = [
        `"${inv.invoice_number || ''}"`,
        `"${client?.name || inv.client_name || ''}"`,
        inv.status || '',
        inv.issue_date ? format(new Date(inv.issue_date), 'MM/dd/yyyy') : '',
        inv.due_date ? format(new Date(inv.due_date), 'MM/dd/yyyy') : '',
        (inv.total || 0).toFixed(2),
        ((inv.balance_due || inv.total || 0)).toFixed(2)
      ];
      csv += row.join(',') + '\n';
    });

    const filename = `accounting-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});