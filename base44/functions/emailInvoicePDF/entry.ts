import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { invoiceId, recipientEmail, recipientName } = await req.json();
    if (!invoiceId || !recipientEmail) {
      return Response.json({ error: 'Missing invoiceId or recipientEmail' }, { status: 400 });
    }

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

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('BILL TO', 14, y + 7);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(26, 43, 74);
    doc.text(client.name || recipientName || 'Client', 14, y + 14);

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

    y += 9;
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

    y += 2;
    doc.setFillColor(26, 43, 74);
    doc.roundedRect(pageWidth - 80, y, 66, 12, 2, 2, 'F');
    doc.setTextColor(201, 162, 39);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('BALANCE DUE', pageWidth - 77, y + 8);
    doc.text(`$${(invoice.balance_due ?? invoice.total ?? 0).toFixed(2)}`, pageWidth - 14, y + 8, { align: 'right' });

    const pdfBase64 = doc.output('datauristring').split(',')[1];

    // Send via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Nationwide Police Services <noreply@npsportal.app>',
        to: [recipientEmail],
        subject: `Invoice ${invoice.invoice_number || ''} from Nationwide Police Services`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1a2b4a; padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: #c9a227; margin: 0; font-size: 24px;">Nationwide Police Services</h1>
              <p style="color: #c8d2e6; margin: 4px 0 0;">Invoice Attached</p>
            </div>
            <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
              <p style="color: #1e293b;">Dear ${recipientName || 'Valued Client'},</p>
              <p style="color: #475569;">Please find your invoice <strong>${invoice.invoice_number || ''}</strong> attached to this email.</p>
              <p style="color: #475569;">Amount Due: <strong style="color: #1a2b4a;">$${(invoice.balance_due ?? invoice.total ?? 0).toFixed(2)}</strong></p>
              <p style="color: #475569;">Due Date: <strong>${formatDate(invoice.due_date)}</strong></p>
              <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">If you have any questions, please contact us at (240) 749-1141.</p>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: `invoice_${invoice.invoice_number || invoiceId}.pdf`,
            content: pdfBase64,
          }
        ],
      }),
    });

    if (!resendResponse.ok) {
      const err = await resendResponse.text();
      throw new Error(`Resend error: ${err}`);
    }

    return Response.json({ success: true, message: `Invoice emailed to ${recipientEmail}` });
  } catch (error) {
    console.error('emailInvoicePDF error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}