import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { timesheet_id } = body;

    // Get timesheet
    const timesheet = await base44.entities.Timesheet.list("-created_date", 1);
    if (!timesheet || timesheet.length === 0) {
      return Response.json({ error: 'Timesheet not found' }, { status: 400 });
    }

    const ts = timesheet[0];
    if (ts.status !== 'approved') {
      return Response.json({ success: false, reason: 'Only approved timesheets accrue PTO' });
    }

    // Get employee
    const employee = await base44.entities.Employee.list();
    const emp = employee.find(e => e.id === ts.employee_id);
    if (!emp) return Response.json({ error: 'Employee not found' }, { status: 400 });

    // Check probation period
    const startDate = new Date(emp.hireDate);
    const probationEndDate = new Date(startDate);
    probationEndDate.setDate(probationEndDate.getDate() + 90);
    
    if (new Date() < probationEndDate) {
      return Response.json({ success: false, reason: 'Employee still in probation period' });
    }

    // Get app settings for accrual rates
    const settings = await base44.entities.AppSettings.list();
    const fullTimeRate = parseFloat(settings.find(s => s.setting_key === 'pto_accrual_fulltime')?.setting_value || '0.0462');
    const fullTimeThreshold = parseFloat(settings.find(s => s.setting_key === 'fulltime_threshold')?.setting_value || '30');

    const hoursWorked = ts.total_hours || 0;
    const isFullTime = hoursWorked >= fullTimeThreshold;
    const accrualRate = isFullTime ? fullTimeRate : parseFloat(settings.find(s => s.setting_key === 'pto_accrual_parttime')?.setting_value || '0.0231');
    const hoursToAccrue = hoursWorked * accrualRate;

    // Update employee PTO balance
    const maxBalance = parseFloat(settings.find(s => s.setting_key === 'pto_max_balance')?.setting_value || '240');
    const newBalance = Math.min((emp.ptoBalance || 0) + hoursToAccrue, maxBalance);

    await base44.entities.Employee.update(emp.id, {
      ptoBalance: newBalance,
    });

    return Response.json({
      success: true,
      hours_accrued: hoursToAccrue,
      new_balance: newBalance,
      accrual_rate: accrualRate,
    });
  } catch (error) {
    console.error('Error calculating PTO:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});