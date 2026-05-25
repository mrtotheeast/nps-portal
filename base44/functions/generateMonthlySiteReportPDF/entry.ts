import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { site_name, month, incidents, timesheets, summary } = await req.json();

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 16;

    // Header bar
    doc.setFillColor(26, 43, 74); // #1a2b4a
    doc.rect(0, 0, pageW, 28, 'F');

    doc.setFontSize(16);
    doc.setTextColor(201, 162, 39); // #c9a227
    doc.setFont(undefined, 'bold');
    doc.text('Monthly Site Report', margin, 12);

    doc.setFontSize(9);
    doc.setTextColor(200, 210, 230);
    doc.setFont(undefined, 'normal');
    doc.text(`Nationwide Police Services  ·  ${site_name}  ·  ${month}`, margin, 21);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - margin, 21, { align: 'right' });

    let y = 38;

    // Summary boxes
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.setFont(undefined, 'bold');
    doc.text('Executive Summary', margin, y);
    y += 6;

    const boxW = (pageW - margin * 2 - 9) / 4;
    const boxes = [
      { label: 'Total Hours', value: summary.totalHours?.toFixed(1) ?? '0', color: [201, 162, 39] },
      { label: 'Approved Shifts', value: String(summary.approvedShifts ?? 0), color: [16, 185, 129] },
      { label: 'Total Incidents', value: String(incidents.length), color: [245, 158, 11] },
      { label: 'High / Critical', value: String(summary.criticalIncidents ?? 0), color: [220, 50, 47] },
    ];

    boxes.forEach((b, i) => {
      const bx = margin + i * (boxW + 3);
      doc.setFillColor(...b.color);
      doc.roundedRect(bx, y, boxW, 18, 2, 2, 'F');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.text(b.value, bx + boxW / 2, y + 9, { align: 'center' });
      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      doc.text(b.label, bx + boxW / 2, y + 15, { align: 'center' });
    });

    y += 26;

    // --- Incident Reports Section ---
    doc.setFontSize(11);
    doc.setTextColor(26, 43, 74);
    doc.setFont(undefined, 'bold');
    doc.text('Incident Reports', margin, y);
    y += 5;

    // Table header
    const incCols = [
      { label: 'Date', w: 28 },
      { label: 'Type', w: 40 },
      { label: 'Severity', w: 24 },
      { label: 'Status', w: 26 },
      { label: 'Reporter', w: 40 },
      { label: 'Description', w: 0 }, // fill rest
    ];
    const totalFixed = incCols.slice(0, 5).reduce((s, c) => s + c.w, 0);
    incCols[5].w = pageW - margin * 2 - totalFixed;

    doc.setFillColor(240, 243, 248);
    doc.rect(margin, y, pageW - margin * 2, 7, 'F');
    doc.setFontSize(8);
    doc.setTextColor(80, 90, 110);
    doc.setFont(undefined, 'bold');
    let cx = margin;
    incCols.forEach((col) => {
      doc.text(col.label, cx + 2, y + 5);
      cx += col.w;
    });
    y += 8;

    doc.setFont(undefined, 'normal');
    doc.setTextColor(40, 40, 40);

    if (!incidents || incidents.length === 0) {
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.text('No incidents recorded for this period.', margin + 2, y + 5);
      y += 12;
    } else {
      incidents.forEach((inc, idx) => {
        if (y > 265) { doc.addPage(); y = 20; }
        if (idx % 2 === 0) {
          doc.setFillColor(250, 250, 252);
          doc.rect(margin, y - 1, pageW - margin * 2, 8, 'F');
        }
        doc.setFontSize(7.5);
        doc.setTextColor(40, 40, 40);
        const row = [
          inc.date ? inc.date.substring(0, 10) : '—',
          inc.type || '—',
          inc.severity || '—',
          inc.status || '—',
          (inc.reporter || '').substring(0, 18),
          (inc.description || '—').substring(0, 50),
        ];
        cx = margin;
        row.forEach((val, i) => {
          doc.text(String(val), cx + 2, y + 5);
          cx += incCols[i].w;
        });
        y += 8;
      });
    }

    y += 6;

    // --- Timesheet Hours Section ---
    if (y > 240) { doc.addPage(); y = 20; }

    doc.setFontSize(11);
    doc.setTextColor(26, 43, 74);
    doc.setFont(undefined, 'bold');
    doc.text('Timesheet Hours', margin, y);
    y += 5;

    const tsCols = [
      { label: 'Date', w: 30 },
      { label: 'Employee', w: 52 },
      { label: 'Hours', w: 22 },
      { label: 'Status', w: 30 },
      { label: 'Notes', w: 0 },
    ];
    const tsFixed = tsCols.slice(0, 4).reduce((s, c) => s + c.w, 0);
    tsCols[4].w = pageW - margin * 2 - tsFixed;

    doc.setFillColor(240, 243, 248);
    doc.rect(margin, y, pageW - margin * 2, 7, 'F');
    doc.setFontSize(8);
    doc.setTextColor(80, 90, 110);
    doc.setFont(undefined, 'bold');
    cx = margin;
    tsCols.forEach((col) => {
      doc.text(col.label, cx + 2, y + 5);
      cx += col.w;
    });
    y += 8;

    doc.setFont(undefined, 'normal');
    doc.setTextColor(40, 40, 40);

    if (!timesheets || timesheets.length === 0) {
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.text('No timesheet entries for this period.', margin + 2, y + 5);
      y += 12;
    } else {
      timesheets.forEach((ts, idx) => {
        if (y > 265) { doc.addPage(); y = 20; }
        if (idx % 2 === 0) {
          doc.setFillColor(250, 250, 252);
          doc.rect(margin, y - 1, pageW - margin * 2, 8, 'F');
        }
        doc.setFontSize(7.5);
        const row = [
          ts.date || '—',
          (ts.employee || '').substring(0, 24),
          ts.hours != null ? String(parseFloat(ts.hours).toFixed(1)) : '—',
          ts.status || '—',
          (ts.notes || '—').substring(0, 40),
        ];
        cx = margin;
        row.forEach((val, i) => {
          doc.text(String(val), cx + 2, y + 5);
          cx += tsCols[i].w;
        });
        y += 8;
      });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 160);
      doc.text(
        `Confidential — Nationwide Police Services  |  Page ${p} of ${pageCount}`,
        pageW / 2, doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    }

    const pdfBytes = doc.output('arraybuffer');

    // Upload to storage and return URL
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });

    return Response.json({ pdf_url: uploadResult.file_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});