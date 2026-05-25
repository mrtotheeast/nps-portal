import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if ((user?.role !== 'admin' && user?.role_type !== 'admin' && user?.role_type !== 'manager')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { reportId } = await req.json();

    const report = await base44.asServiceRole.entities.PendingAIReport.get(reportId);
    const schedule = await base44.asServiceRole.entities.ScheduledAIReport.get(report.scheduled_report_id);

    // Send to all recipients
    for (const recipient of schedule.recipients) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: recipient,
        subject: `${schedule.report_name} - ${new Date().toLocaleDateString()}`,
        body: report.report_content
      });
    }

    // Update report status
    await base44.asServiceRole.entities.PendingAIReport.update(reportId, {
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      sent_at: new Date().toISOString()
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error approving report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});