import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

const NPS_NAVY = [26, 43, 74];
const NPS_GOLD = [201, 162, 39];

function addHeader(doc, title, subtitle) {
  doc.setFillColor(...NPS_NAVY);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setFillColor(...NPS_GOLD);
  doc.rect(0, 28, 210, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('NPS Portal — Nationwide Police Services', 14, 11);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 20);

  doc.setTextColor(30, 30, 30);

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(subtitle, 14, 36);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 210 - 14, 36, { align: 'right' });

  return 44;
}

function addSection(doc, label, y) {
  doc.setFillColor(240, 242, 246);
  doc.rect(12, y, 186, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NPS_NAVY);
  doc.text(label.toUpperCase(), 14, y + 5);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'normal');
  return y + 11;
}

function addRow(doc, label, value, y, indent = 14) {
  if (y > 275) {
    doc.addPage();
    y = 16;
  }
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text(`${label}:`, indent, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  const lines = doc.splitTextToSize(String(value || '—'), 140);
  doc.text(lines, indent + 42, y);
  return y + lines.length * 5 + 2;
}

function addFooter(doc) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFillColor(...NPS_NAVY);
    doc.rect(0, 288, 210, 9, 'F');
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(7);
    doc.text('CONFIDENTIAL — NPS Portal', 14, 294);
    doc.text(`Page ${i} of ${pages}`, 210 - 14, 294, { align: 'right' });
  }
}

async function generateIncidentPDF(incident) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = addHeader(doc, 'Incident Report', `Report ID: ${incident.id}`);

  y = addSection(doc, 'Incident Details', y);
  y = addRow(doc, 'Type', incident.incident_type?.replace(/_/g, ' '), y);
  y = addRow(doc, 'Severity', incident.severity?.toUpperCase(), y);
  y = addRow(doc, 'Date', incident.incident_date, y);
  y = addRow(doc, 'Time', incident.incident_time, y);
  y = addRow(doc, 'Status', incident.status?.toUpperCase(), y);
  y += 4;

  y = addSection(doc, 'Description', y);
  const descLines = doc.splitTextToSize(incident.description || '—', 182);
  if (y + descLines.length * 5 > 275) { doc.addPage(); y = 16; }
  doc.setFontSize(9);
  doc.text(descLines, 14, y);
  y += descLines.length * 5 + 6;

  addFooter(doc);
  return doc.output('arraybuffer');
}

async function generateTrainingSummaryPDF(assignment, course, user) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = addHeader(doc, 'Training Summary', `${course?.title || 'Training'}`);

  y = addSection(doc, 'Employee Information', y);
  y = addRow(doc, 'Name', user?.full_name, y);
  y = addRow(doc, 'Email', user?.email, y);
  y = addRow(doc, 'Role', user?.role_type, y);
  y += 4;

  y = addSection(doc, 'Course Information', y);
  y = addRow(doc, 'Course Title', course?.title, y);
  y = addRow(doc, 'Category', course?.category?.replace(/_/g, ' '), y);
  y = addRow(doc, 'Duration', course?.estimated_duration ? `${course.estimated_duration} min` : `${course?.duration_hours}h`, y);
  y += 4;

  y = addSection(doc, 'Completion Status', y);
  y = addRow(doc, 'Status', assignment.status?.toUpperCase().replace(/_/g, ' '), y);
  y = addRow(doc, 'Progress', `${assignment.progress || 0}%`, y);
  if (assignment.final_exam_score != null) y = addRow(doc, 'Final Score', `${assignment.final_exam_score}%`, y);

  addFooter(doc);
  return doc.output('arraybuffer');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { type, id } = await req.json();

    if (type === 'incident') {
      const incident = await base44.asServiceRole.entities.Incident.get(id);
      if (!incident) return Response.json({ error: 'Incident not found' }, { status: 404 });

      const pdfBytes = await generateIncidentPDF(incident);
      return new Response(pdfBytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="incident-report-${incident.id}.pdf"`
        }
      });
    }

    if (type === 'training') {
      const assignment = await base44.asServiceRole.entities.TrainingAssignment.get(id);
      if (!assignment) return Response.json({ error: 'Assignment not found' }, { status: 404 });

      const course = await base44.asServiceRole.entities.TrainingCourse.get(assignment.training_course_id);
      const users = await base44.asServiceRole.entities.User.filter({ id: assignment.assigned_to });
      const employee = users[0] || user;

      const pdfBytes = await generateTrainingSummaryPDF(assignment, course, employee);
      return new Response(pdfBytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="training-summary-${assignment.id}.pdf"`
        }
      });
    }

    return Response.json({ error: 'Invalid type. Use "incident" or "training".' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});