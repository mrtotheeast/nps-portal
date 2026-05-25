import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role_type !== 'admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { shiftId } = await req.json();

    // Get the shift
    const shift = await base44.asServiceRole.entities.Shift.get(shiftId);
    
    if (shift.employee_id) {
      return Response.json({ error: 'Shift already assigned' }, { status: 400 });
    }

    // Get site to check requirements
    const site = await base44.asServiceRole.entities.Site.get(shift.site_id);
    
    // Get all active employees
    const employees = await base44.asServiceRole.entities.Employee.filter({ 
      status: 'active' 
    });

    // Get employee availability for this date
    const availabilities = await base44.asServiceRole.entities.EmployeeAvailability.filter({
      start_date: { $lte: shift.date },
      end_date: { $gte: shift.date }
    });

    // Get credentials
    const credentials = await base44.asServiceRole.entities.Credential.list();

    // Score each employee
    const scoredEmployees = employees.map(emp => {
      let score = 0;

      // Check if assigned to this site
      if (emp.siteIds?.includes(shift.site_id)) {
        score += 50;
      }

      // Check availability
      const unavailable = availabilities.find(a => 
        a.employee_id === emp.id && !a.is_available
      );
      if (unavailable) {
        return { employee: emp, score: -1000 }; // Disqualify
      }

      // Check credentials if site requires them
      if (site.requirements?.required_certifications?.length > 0) {
        const empCredentials = credentials.filter(c => 
          c.employee_id === emp.id && 
          c.status === 'active' &&
          site.requirements.required_certifications.includes(c.credential_name)
        );
        
        if (empCredentials.length === site.requirements.required_certifications.length) {
          score += 30;
        } else {
          return { employee: emp, score: -1000 }; // Missing required cert
        }
      }

      // Prefer employees with matching position
      if (emp.positionId === shift.position) {
        score += 20;
      }

      // Check if they have bids for this shift
      // (This would be async in real implementation)
      score += 10; // Base preference score

      return { employee: emp, score };
    });

    // Filter and sort
    const qualified = scoredEmployees
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);

    if (qualified.length === 0) {
      return Response.json({ 
        success: false,
        message: 'No qualified employees available for this shift'
      });
    }

    // Assign to top candidate
    const selected = qualified[0].employee;
    
    await base44.asServiceRole.entities.Shift.update(shiftId, {
      employee_id: selected.id,
      status: 'confirmed'
    });

    // Send notification
    await base44.asServiceRole.functions.invoke('sendNotification', {
      user_id: selected.id,
      title: 'New Shift Assigned',
      message: `You've been assigned to a shift on ${shift.date} at ${shift.start_time}`,
      type: 'shift_assignment',
      priority: 'high',
      send_email: true
    });

    return Response.json({
      success: true,
      assignedTo: {
        id: selected.id,
        name: `${selected.firstName} ${selected.lastName}`
      },
      score: qualified[0].score
    });

  } catch (error) {
    console.error('Auto-assign error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});