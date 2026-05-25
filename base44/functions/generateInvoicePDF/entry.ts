import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { invoiceId } = await req.json();
    if (!invoiceId) return Response.json({ error: 'Missing invoice ID' }, { status: 400 });

    const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId);
    const clients = await base44.asServiceRole.entities.Client.list();
    const client = clients.find(c => c.id === invoice.client_id) || {};

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Header
    doc.setFillColor(26, 43, 74);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(201, 162, 39);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Nationwide Police Services', 14, 16);

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(200, 210, 230);
    doc.text('9920 Franklin Square Dr Ste 110, Nottingham, MD 21236 | (240) 749-1141', 14, 24);

    doc.setTextColor(201, 162, 39);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('INVOICE', pageWidth - 14, 20, { align: 'right' });

    // Invoice meta
    let y = 50;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(pageWidth - 80, y, 66, 26, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('INVOICE #', pageWidth - 77, y + 7);
    doc.text('DATE', pageWidth - 77, y + 14);
    doc.text('DUE DATE', pageWidth - 77, y + 21);
    doc.setTextColor(26, 43, 74);
    doc.setFont(undefined, 'bold');
    doc.text(invoice.invoice_number || '—', pageWidth - 14, y + 7, { align: 'right' });
    doc.text(formatDate(invoice.issue_date), pageWidth - 14, y + 14, { align: 'right' });
    doc.text(formatDate(invoice.due_date), pageWidth - 14, y + 21, { align: 'right' });

    // Bill to
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('BILL TO', 14, y + 7);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(26, 43, 74);
    doc.text(client.name || 'Client', 14, y + 14);

    // Line items
    y = 86;
    doc.setFillColor(26, 43, 74);
    doc.rect(14, y, pageWidth - 28, 8, 'F');
    doc.setTextColor(201, 162, 39);
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('DESCRIPTION', 17, y + 5.5);
    doc.text('AMOUNT', pageWidth - 14, y + 5.5, { align: 'right' });

    y += 12;
    doc.setFont(undefined, 'normal');
    doc.setTextColor(30, 41, 59);

    for (const item of (invoice.line_items || [])) {
      if (y > pageHeight - 70) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.text(item.description || '', 17, y);
      doc.text(`$${(item.amount || 0).toFixed(2)}`, pageWidth - 14, y, { align: 'right' });
      y += 8;
    }

    // Totals
    y += 4;
    y += 5;
    doc.setTextColor(71, 85, 105);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    doc.text('Subtotal', pageWidth - 82, y, { align: 'right' });
    doc.setTextColor(30, 41, 59);
    doc.text(`$${(invoice.subtotal || 0).toFixed(2)}`, pageWidth - 14, y, { align: 'right' });
    y += 6;

    if (invoice.tax_amount > 0) {
      doc.setTextColor(71, 85, 105);
      doc.text(`Tax (${invoice.tax_rate}%)`, pageWidth - 82, y, { align: 'right' });
      doc.setTextColor(30, 41, 59);
      doc.text(`$${(invoice.tax_amount || 0).toFixed(2)}`, pageWidth - 14, y, { align: 'right' });
      y += 6;
    }

    // Balance due
    y += 2;
    doc.setFillColor(26, 43, 74);
    doc.roundedRect(pageWidth - 80, y, 66, 12, 2, 2, 'F');
    doc.setTextColor(201, 162, 39);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('BALANCE DUE', pageWidth - 77, y + 8);
    doc.text(`$${(invoice.balance_due ?? invoice.total ?? 0).toFixed(2)}`, pageWidth - 14, y + 8, { align: 'right' });

    const pdfBase64 = doc.output('datauristring').split(',')[1];
    return Response.json({ success: true, pdfBase64, fileName: `invoice_${invoice.invoice_number || invoiceId}.pdf` });

  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}