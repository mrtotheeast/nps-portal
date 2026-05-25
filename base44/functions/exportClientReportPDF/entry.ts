import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filters, incidents, checkIns, patrols } = await req.json();

    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text('Security Report', 20, 20);

    doc.setFontSize(10);
    doc.text(`Date Range: ${filters.startDate} to ${filters.endDate}`, 20, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 35);

    // Summary
    doc.setFontSize(14);
    doc.text('Summary', 20, 50);
    doc.setFontSize(10);
    doc.text(`Total Incidents: ${incidents.length}`, 20, 60);
    doc.text(`Total Check-ins: ${checkIns.length}`, 20, 65);
    doc.text(`Total Patrol Sessions: ${patrols.length}`, 20, 70);

    // Incidents
    doc.setFontSize(14);
    doc.text('Incidents', 20, 85);
    doc.setFontSize(10);
    
    let y = 95;
    incidents.slice(0, 10).forEach((incident) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${incident.incident_type.replace('_', ' ')} - ${incident.severity}`, 20, y);
      doc.text(incident.description.substring(0, 80), 20, y + 5);
      y += 15;
    });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=report.pdf'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});