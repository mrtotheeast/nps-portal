import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'super_admin', 'manager'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { employee_id, reason, notes, terminated_date, is_rehirable } = await req.json();
    if (!employee_id) return Response.json({ error: 'employee_id is required' }, { status: 400 });

    let credentials_archived = 0;
    let timesheets_finalized = 0;
    let sites_removed = 0;

    // 1. Update employee record to terminated
    await base44.entities.Employee.update(employee_id, {
      status: 'terminated',
      terminatedDate: terminated_date || new Date().toISOString().split('T')[0],
      isRehirable: is_rehirable !== false,
      supervisor_notes: notes
        ? `[Offboarding - ${new Date().toLocaleDateString()}] ${reason}. ${notes}`
        : undefined,
    });

    // 2. Archive all credentials linked to this employee
    try {
      const credentials = await base44.entities.Credential.filter({ employee_id });
      for (const cred of credentials) {
        await base44.entities.Credential.update(cred.id, {
          status: 'expired',
          notes: `Archived on offboarding: ${reason}`,
        });
        credentials_archived++;
      }
    } catch (e) {
      console.warn('Credential archive partial failure:', e.message);
    }

    // 3. Finalize pending timesheets — mark them approved so the data is saved
    try {
      const timesheets = await base44.entities.Timesheet.filter({ employee_id, status: 'pending' });
      for (const ts of timesheets) {
        await base44.entities.Timesheet.update(ts.id, {
          status: 'approved',
          notes: (ts.notes ? ts.notes + ' | ' : '') + `Auto-approved on offboarding ${terminated_date || new Date().toISOString().split('T')[0]}`,
        });
        timesheets_finalized++;
      }
    } catch (e) {
      console.warn('Timesheet finalization partial failure:', e.message);
    }

    // 4. Remove employee from site assignments
    try {
      const sites = await base44.entities.Site.filter({});
      for (const site of sites) {
        const assignedOfficers = site.assigned_officers || [];
        if (assignedOfficers.includes(employee_id)) {
          await base44.entities.Site.update(site.id, {
            assigned_officers: assignedOfficers.filter(id => id !== employee_id),
          });
          sites_removed++;
        }
      }
    } catch (e) {
      console.warn('Site unassignment partial failure:', e.message);
    }

    // 5. Cancel any future scheduled shifts
    try {
      const now = new Date().toISOString();
      const shifts = await base44.entities.Shift.filter({ employee_id, status: 'scheduled' });
      for (const shift of shifts) {
        if (shift.start_time && shift.start_time > now) {
          await base44.entities.Shift.update(shift.id, { status: 'cancelled' });
        }
      }
    } catch (e) {
      console.warn('Shift cancellation partial failure:', e.message);
    }

    // 6. Log audit trail
    try {
      await base44.functions.invoke('logAuditTrail', {
        action: 'employee_offboarded',
        entity: 'Employee',
        entity_id: employee_id,
        performed_by: user.email,
        details: `Terminated. Reason: ${reason}. Rehirable: ${is_rehirable !== false}. Credentials archived: ${credentials_archived}. Timesheets finalized: ${timesheets_finalized}.`,
      });
    } catch (e) {
      console.warn('Audit log failed:', e.message);
    }

    return Response.json({
      success: true,
      credentials_archived,
      timesheets_finalized,
      sites_removed,
    });
  } catch (error) {
    console.error('offboardEmployee error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});