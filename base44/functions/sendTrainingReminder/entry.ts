import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // This function is called by scheduled automations (no user context) and by admins
    const { assignmentId } = await req.json();

    if (!assignmentId) {
      return Response.json({ error: 'Assignment ID required' }, { status: 400 });
    }

    const assignment = await base44.asServiceRole.entities.TrainingAssignment.get(assignmentId);
    const course = await base44.asServiceRole.entities.TrainingCourse.get(assignment.training_course_id);
    const targetUser = await base44.asServiceRole.entities.User.get(assignment.assigned_to);

    const daysLeft = Math.ceil((new Date(assignment.due_date) - new Date()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysLeft < 0;

    await base44.asServiceRole.entities.Notification.create({
      user_id: assignment.assigned_to,
      title: isOverdue ? "Training Overdue!" : "Training Reminder",
      message: isOverdue 
        ? `"${course.title}" is overdue. Please complete it immediately.`
        : `Reminder: "${course.title}" is due in ${daysLeft} day(s).`,
      type: "training",
      priority: isOverdue ? "urgent" : "high",
      action_url: "/Training"
    });

    const body = `Hello ${targetUser.full_name},

${isOverdue 
  ? `Your training "${course.title}" is overdue. Please complete it as soon as possible.` 
  : `Reminder: Your training "${course.title}" is due in ${daysLeft} day(s).`}

Training: ${course.title}
Due Date: ${new Date(assignment.due_date).toLocaleDateString()}
Progress: ${assignment.progress || 0}%

Log in to continue.

Training Team`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: targetUser.email,
      subject: isOverdue ? `Training Overdue: ${course.title}` : `Training Reminder: ${course.title}`,
      body
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error sending reminder:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});