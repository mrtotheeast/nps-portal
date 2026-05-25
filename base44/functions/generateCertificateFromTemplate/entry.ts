import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { assignmentId } = await req.json();
    if (!assignmentId) return Response.json({ error: 'assignmentId required' }, { status: 400 });

    const assignment = await base44.asServiceRole.entities.TrainingAssignment.get(assignmentId);
    const course = await base44.asServiceRole.entities.TrainingCourse.get(assignment.training_course_id);
    const trainee = await base44.asServiceRole.entities.User.get(assignment.assigned_to);

    const pdfWidth = 297;
    const pdfHeight = 210;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(26, 43, 74);
    doc.text('CERTIFICATE OF COMPLETION', pdfWidth / 2, 50, { align: 'center' });

    doc.setDrawColor(201, 162, 39);
    doc.setLineWidth(1.5);
    doc.rect(10, 10, pdfWidth - 20, pdfHeight - 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text('This is to certify that', pdfWidth / 2, 80, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(26, 43, 74);
    doc.text(trainee.full_name || 'N/A', pdfWidth / 2, 100, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text('has successfully completed', pdfWidth / 2, 118, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(26, 43, 74);
    doc.text(course.title || '', pdfWidth / 2, 134, { align: 'center' });

    const completedDate = assignment.completed_at
      ? new Date(assignment.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Completed: ${completedDate}`, pdfWidth / 2, 155, { align: 'center' });

    if (assignment.final_exam_score !== undefined && assignment.final_exam_score !== null) {
      doc.text(`Final Score: ${assignment.final_exam_score}%`, pdfWidth / 2, 165, { align: 'center' });
    }

    doc.setFontSize(10);
    doc.text('Issued by Nationwide Police Services', pdfWidth / 2, 178, { align: 'center' });
    doc.text(`Certificate ID: ${assignment.id}`, pdfWidth / 2, 185, { align: 'center' });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificate-${(trainee.full_name || 'trainee').replace(/\s+/g, '-')}.pdf"`,
      }
    });
  } catch (error) {
    console.error('Certificate generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});