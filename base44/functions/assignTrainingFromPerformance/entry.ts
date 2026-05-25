import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employee_id, training_id } = await req.json();
    
    if (!employee_id || !training_id) {
      return Response.json({ error: 'Missing employee_id or training_id' }, { status: 400 });
    }

    // Create training assignment
    const assignment = await base44.entities.TrainingAssignment.create({
      employee_id,
      training_id,
      assigned_date: new Date().toISOString(),
      status: 'not_started',
    });

    // Send notification to employee
    const employee = await base44.entities.Employee.filter({ id: employee_id });
    const training = await base44.entities.Training.filter({ id: training_id });
    
    if (employee.length > 0 && employee[0].email) {
      await base44.integrations.Core.SendEmail({
        to: employee[0].email,
        subject: `New Training Assignment: ${training[0]?.title || 'Training Course'}`,
        body: `You have been assigned a new training course based on your recent performance. Please log in to the system to view and complete it.`
      });
    }

    return Response.json({ success: true, assignment });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});