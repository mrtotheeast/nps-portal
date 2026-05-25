import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { incidentId } = await req.json();
    const incident = await base44.asServiceRole.entities.Incident.get(incidentId);

    if (!incident) {
      return Response.json({ error: 'Incident not found' }, { status: 404 });
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let y = 20;

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('INCIDENT REPORT', pageWidth / 2, y, { align: 'center' });
    
    y += 10;
    doc.setFontSize(12);
    doc.text(incident.cc_number || 'N/A', pageWidth / 2, y, { align: 'center' });
    
    y += 15;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    const addSection = (title, content) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont(undefined, 'bold');
      doc.text(title, 20, y);
      y += 7;
      doc.setFont(undefined, 'normal');
      
      const lines = doc.splitTextToSize(content || 'N/A', pageWidth - 40);
      doc.text(lines, 20, y);
      y += (lines.length * 5) + 8;
    };

    addSection('DATE/TIME:', `${incident.incident_date} ${incident.incident_time || ''}`);
    addSection('INCIDENT TYPE:', incident.incident_type);
    addSection('SEVERITY:', incident.severity);
    addSection('DESCRIPTION:', incident.description);
    addSection('STATUS:', incident.status);

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 290, { align: 'center' });
      doc.text('CONFIDENTIAL - FOR OFFICIAL USE ONLY', pageWidth / 2, 285, { align: 'center' });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=incident-${incident.cc_number || incident.id}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});