import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { swap_request_id, requester_name, shift_id, target_employee_id, reason } = await req.json();

    const shifts = await base44.asServiceRole.entities.Shift.filter({ id: shift_id });
    const shift = shifts[0];

    let siteName = "Unknown Site";
    if (shift?.site_id) {
      const sites = await base44.asServiceRole.entities.Site.filter({ id: shift.site_id });
      if (sites[0]) siteName = sites[0].name;
    }

    const allUsers = await base44.asServiceRole.entities.User.list();
    const targetUser = allUsers.find(u => u.id === target_employee_id);
    const targetName = targetUser?.full_name || "Unknown Officer";

    const admins = allUsers.filter(u => ["admin", "manager"].includes(u.role_type) && u.email);

    const shiftDate = shift?.date || "N/A";
    const shiftTime = shift ? `${shift.start_time} – ${shift.end_time}` : "N/A";

    const subject = `Shift Swap Request — ${requester_name}`;
    const body = `Shift Swap Request: ${requester_name} requested to swap with ${targetName} on ${shiftDate} at ${siteName}. Reason: ${reason || 'Not provided'}`;

    const emailPromises = admins.map(admin =>
      base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject,
        body
      })
    );
    await Promise.allSettled(emailPromises);

    const notifPromises = admins.map(admin =>
      base44.asServiceRole.entities.Notification.create({
        user_id: admin.id,
        title: "Shift Swap Request",
        message: `${requester_name} requested to swap their shift on ${shiftDate} with ${targetName}.`,
        type: "shift_swap",
        reference_id: swap_request_id,
        is_read: false
      }).catch(() => null)
    );
    await Promise.allSettled(notifPromises);

    return Response.json({ success: true, admins_notified: admins.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});