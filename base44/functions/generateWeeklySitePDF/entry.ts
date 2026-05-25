import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const endDate = now.toISOString().slice(0, 10);
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [sites, allIncidents, allUsers] = await Promise.all([
      base44.asServiceRole.entities.Site.list(),
      base44.asServiceRole.entities.Incident.list('-incident_date', 500),
      base44.asServiceRole.entities.User.list(),
    ]);

    const activeSites = sites.filter(s => s.status === 'active');
    const weekIncidents = allIncidents.filter(i => i.incident_date >= startDate && i.incident_date <= endDate);
    const weekLabel = `${startDate} to ${endDate}`;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.width;
    const pageH = doc.internal.pageSize.height;
    let y = 20;

    // Header
    doc.setFillColor(26, 43, 74);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setFillColor(201, 162, 39);
    doc.rect(0, 28, pageW, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('WEEKLY SITE INCIDENT SUMMARY', pageW / 2, 12, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Report Period: ${weekLabel}  |  Generated: ${now.toLocaleDateString()}`, pageW / 2, 21, { align: 'center' });

    // Summary stats
    const totalIncidents = weekIncidents.length;
    const criticalCount = weekIncidents.filter(i => ['critical', 'urgent'].includes(i.severity)).length;
    const highCount = weekIncidents.filter(i => i.severity === 'high').length;
    const sitesWithIncidents = new Set(weekIncidents.map(i => i.site_id)).size;

    doc.setTextColor(0, 0, 0);
    y = 38;
    const stats = [
      { label: 'Total Incidents', value: totalIncidents },
      { label: 'Critical/Urgent', value: criticalCount },
      { label: 'High Severity', value: highCount },
      { label: 'Sites Affected', value: sitesWithIncidents }
    ];

    const boxW = (pageW - 20) / stats.length;
    stats.forEach((stat, i) => {
      const bx = 10 + i * boxW;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(bx, y, boxW - 2, 18, 2, 2, 'FD');
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(26, 43, 74);
      doc.text(String(stat.value), bx + (boxW - 2) / 2, y + 9, { align: 'center' });
      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(stat.label, bx + (boxW - 2) / 2, y + 15, { align: 'center' });
    });

    y += 25;
    doc.setTextColor(0, 0, 0);

    // Per-site incidents
    for (const site of activeSites) {
      const siteIncidents = weekIncidents.filter(i => i.site_id === site.id);

      if (y > pageH - 40) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(45, 74, 111);
      doc.rect(10, y, pageW - 20, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(`${site.name} (${siteIncidents.length} incident${siteIncidents.length !== 1 ? 's' : ''})`, 14, y + 6.5);
      doc.setTextColor(0, 0, 0);
      y += 12;

      if (siteIncidents.length === 0) {
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('No incidents recorded this week.', 14, y + 4);
        doc.setTextColor(0, 0, 0);
        y += 12;
        continue;
      }

      for (const inc of siteIncidents) {
        if (y > pageH - 20) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(30, 41, 59);
        doc.text(`${inc.incident_date} | ${(inc.incident_type || '').replace(/_/g, ' ')} | ${inc.severity}`, 14, y);
        y += 6;

        if (inc.description) {
          doc.setTextColor(71, 85, 105);
          doc.setFontSize(8);
          const descLines = doc.splitTextToSize(inc.description, pageW - 28);
          doc.text(descLines.slice(0, 2), 14, y);
          y += descLines.slice(0, 2).length * 4 + 2;
        }

        y += 3;
      }

      y += 4;
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=weekly-site-report-${endDate}.pdf`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});