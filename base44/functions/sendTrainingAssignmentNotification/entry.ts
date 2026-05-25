import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json();
    const { courseId, userIds, dueDate, userId, courseTitle, score, passed, assignmentId } = body;

    if (userId && courseTitle && score !== undefined) {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const admins = allUsers.filter(u => ['admin', 'manager', 'supervisor'].includes(u.role_type) || u.role === 'admin');
      const targetUser = allUsers.find(u => u.id === userId);

      const statusText = passed ? `PASSED with ${score}%` : `FAILED with ${score}%`;

      for (const admin of admins) {
        if (!admin.email) continue;
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: `Training ${passed ? 'Completed' : 'Failed'}: ${courseTitle}`,
          body: `${targetUser?.full_name || userId} has ${statusText} for: "${courseTitle}"\n\nNPS Portal`
        }).catch(() => {});

        await base44.asServiceRole.entities.Notification.create({
          user_id: admin.id,
          title: `Training ${passed ? 'Completed' : 'Failed'}: ${courseTitle}`,
          message: `${targetUser?.full_name || userId} scored ${score}% — ${passed ? 'Passed' : 'Failed'}`,
          type: "training",
          priority: passed ? "normal" : "high"
        }).catch(() => {});
      }

      return Response.json({ success: true, mode: 'quiz_result' });
    }

    if (!courseId || !userIds || !Array.isArray(userIds)) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const course = await base44.asServiceRole.entities.TrainingCourse.get(courseId);
    const notifications = [];

    for (const uid of userIds) {
      const targetUser = await base44.asServiceRole.entities.User.get(uid).catch(() => null);
      if (!targetUser) continue;

      await base44.asServiceRole.entities.Notification.create({
        user_id: uid,
        title: "New Training Assignment",
        message: `You have been assigned: ${course.title}. Due: ${dueDate ? new Date(dueDate).toLocaleDateString() : 'TBD'}`,
        type: "training",
        priority: "normal"
      }).catch(() => {});

      if (targetUser.email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: targetUser.email,
          subject: `New Training Assigned: ${course.title}`,
          body: `Hello ${targetUser.full_name},\n\nYou have been assigned: "${course.title}"\n\nDue Date: ${dueDate ? new Date(dueDate).toLocaleDateString() : 'TBD'}\n\nLog in to NPS Portal to begin.\n\nNationwide Police Services`
        }).catch(() => {});
        notifications.push({ userId: uid, status: 'sent' });
      }
    }

    return Response.json({ success: true, notifications });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});