import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assignmentId } = await req.json();

    if (!assignmentId) {
      return Response.json({ error: 'Assignment ID required' }, { status: 400 });
    }

    const assignment = await base44.asServiceRole.entities.TrainingAssignment.get(assignmentId);
    const course = await base44.asServiceRole.entities.TrainingCourse.get(assignment.training_course_id);
    const users = await base44.asServiceRole.entities.User.filter({ id: assignment.assigned_to });
    const trainee = users[0];

    const certificateContent = `
CERTIFICATE OF COMPLETION

This certifies that

${trainee?.full_name || 'Student'}

has successfully completed the training program

${course?.title || 'Training'}

Duration: ${course?.duration_hours || 0} hours
Completion Date: ${assignment.completed_at ? new Date(assignment.completed_at).toLocaleDateString() : 'TBD'}
Final Score: ${assignment.final_exam_score}%

Issued by Nationwide Police Services
Certificate ID: ${assignment.id}
Issue Date: ${new Date().toLocaleDateString()}
`;

    return Response.json({
      success: true,
      certificate_content: certificateContent,
      trainee_name: trainee?.full_name || 'Student',
      course_title: course?.title || 'Training'
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});