import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import jsPDF from 'npm:jspdf@4.2.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role === 'admin' && user?.role !== 'super_admin' && user?.role_type !== 'super_admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { renewals } = body;

    if (!renewals || !Array.isArray(renewals)) {
      return Response.json({ error: 'Invalid renewals data' }, { status: 400 });
    }

    const doc = new jsPDF();
    const now = new Date();

    // Title
    doc.setFontSize(18);
    doc.text('Contract Renewals Report', 20, 20);

    // Date
    doc.setFontSize(10);
    doc.text(`Generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, 20, 28);
    doc.text(`Total Renewals Due: ${renewals.length}`, 20, 34);

    // Table headers
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    let y = 45;
    doc.text('Client Name', 20, y);
    doc.text('Service Type', 80, y);
    doc.text('Expires', 130, y);
    doc.text('Days Left', 170, y);

    // Table content
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    y += 8;

    renewals.forEach((client, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const expireDate = new Date(client.contract_end_date);
      const daysLeft = Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24));

      doc.text(client.name.substring(0, 35), 20, y);
      doc.text(client.service_type || 'N/A', 80, y);
      doc.text(expireDate.toLocaleDateString(), 130, y);
      doc.text(daysLeft.toString(), 170, y);

      y += 7;
    });

    // Footer
    doc.setFontSize(8);
    doc.text('This report is confidential and for internal use only.', 20, 285);

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="renewals-report-${now.getTime()}.pdf"`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});