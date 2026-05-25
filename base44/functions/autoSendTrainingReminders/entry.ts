import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Scheduled daily — sends reminders for training due in 1, 3, or 7 days, and for overdue assignments
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const assignments = await base44.asServiceRole.entities.TrainingAssignment.list();
    const now = new Date();
    const reminderDays = [1, 3, 7];
    let sent = 0;

    for (const assignment of assignments) {
      if (assignment.status === "completed" || !assignment.due_date) continue;

      const due = new Date(assignment.due_date);
      const daysLeft = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

      const shouldRemind = daysLeft < 0 || reminderDays.includes(daysLeft);
      if (!shouldRemind) continue;

      // Fire-and-forget individual reminder via existing function
      try {
        await base44.asServiceRole.functions.invoke("sendTrainingReminder", { assignmentId: assignment.id });
        sent++;
      } catch (e) {
        console.error(`Failed reminder for assignment ${assignment.id}:`, e.message);
      }
    }

    return Response.json({ success: true, reminders_sent: sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});