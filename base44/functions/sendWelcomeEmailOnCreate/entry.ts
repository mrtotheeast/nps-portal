import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process create events
    if (event.type !== 'create') {
      return Response.json({ skipped: true, reason: 'Not a create event' });
    }

    const employee = data;
    if (!employee || !employee.email) {
      return Response.json({ error: 'Invalid employee data' }, { status: 400 });
    }

    // Send welcome email with temporary password
    await base44.functions.invoke('sendWelcomeEmail', {
      employee_id: employee.id,
      email: employee.email,
      firstName: employee.firstName,
      full_name: `${employee.firstName} ${employee.lastName}`,
      role: employee.role,
    });

    return Response.json({ 
      success: true, 
      message: `Welcome email sent to ${employee.email}`,
      employee_id: employee.id 
    });
  } catch (error) {
    console.error('Welcome email automation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});