import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.2.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { incidents = [], start_date, end_date, site_name } = body;

    if (!incidents || incidents.length === 0) {
      return Response.json({ error: 'No incidents provided' }, { status: 400 });
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(26, 43, 74);
    doc.text('Incident Summary Report', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Report details
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    const dateRange = `${start_date} to ${end_date}`;
    doc.text(`Date Range: ${dateRange}`, 15, yPosition);
    yPosition += 6;
    if (site_name) {
      doc.text(`Site: ${site_name}`, 15, yPosition);
      yPosition += 6;
    }
    doc.text(`Generated: ${new Date().toLocaleString()}`, 15, yPosition);
    yPosition += 6;
    doc.text(`Total Incidents: ${incidents.length}`, 15, yPosition);
    yPosition += 10;

    // Summary by severity
    const severityCounts = {};
    incidents.forEach(inc => {
      const sev = inc.severity || 'unknown';
      severityCounts[sev] = (severityCounts[sev] || 0) + 1;
    });

    doc.setFontSize(11);
    doc.setTextColor(26, 43, 74);
    doc.text('Summary by Severity', 15, yPosition);
    yPosition += 6;

    doc.setFontSize(9);
    doc.setTextColor(80, 90, 100);
    Object.entries(severityCounts).forEach(([sev, count]) => {
      doc.text(`${sev.charAt(0).toUpperCase() + sev.slice(1)}: ${count}`, 20, yPosition);
      yPosition += 5;
    });
    yPosition += 5;

    // Detailed incidents
    doc.setFontSize(11);
    doc.setTextColor(26, 43, 74);
    doc.text('Incident Details', 15, yPosition);
    yPosition += 8;

    // Table headers
    doc.setFontSize(9);
    doc.setTextColor(26, 43, 74);
    doc.setFillColor(201, 162, 39);
    doc.rect(15, yPosition - 4, pageWidth - 30, 6, 'F');
    doc.text('Date', 17, yPosition);
    doc.text('Type', 45, yPosition);
    doc.text('Description', 95, yPosition);
    doc.text('Severity', 160, yPosition);
    doc.text('Status', 185, yPosition);
    yPosition += 8;

    // Table rows
    doc.setFontSize(8);
    doc.setTextColor(50, 60, 70);
    incidents.forEach((inc, idx) => {
      const date = inc.incident_date ? new Date(inc.incident_date).toLocaleDateString() : 'N/A';
      const type = inc.incident_type || 'Unknown';
      const desc = (inc.description || '').substring(0, 40) + (inc.description?.length > 40 ? '...' : '');
      const severity = inc.severity || 'Unknown';
      const status = inc.status || 'Unknown';

      // Page break if needed
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }

      // Alternate row coloring
      if (idx % 2 === 0) {
        doc.setFillColor(242, 244, 246);
        doc.rect(15, yPosition - 4, pageWidth - 30, 5, 'F');
      }

      doc.text(date, 17, yPosition);
      doc.text(type, 45, yPosition);
      doc.text(desc, 95, yPosition);
      doc.text(severity, 160, yPosition);
      doc.text(status, 185, yPosition);
      yPosition += 5;
    });

    // Footer
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 160, 170);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Generate PDF as base64
    const pdfBuffer = doc.output('arraybuffer');
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
    const dataUrl = `data:application/pdf;base64,${base64Pdf}`;

    return Response.json({ pdf_url: dataUrl });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});