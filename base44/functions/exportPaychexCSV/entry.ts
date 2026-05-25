import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || !['admin', 'super_admin'].includes(user.role_type)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { startDate, endDate, companyId, payDate } = await req.json();

    if (!startDate || !endDate || !companyId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get all employees with Paychex Worker ID
    const employees = await base44.asServiceRole.entities.Employee.filter({ 
      status: 'active' 
    });

    const employeesWithWorkerId = employees.filter(e => e.paychexWorkerId);

    // Get timesheets for the period
    const timesheets = await base44.asServiceRole.entities.Timesheet.filter({
      date: { $gte: startDate, $lte: endDate },
      status: 'approved'
    });

    // Get PTO requests for the period
    const ptoRequests = await base44.asServiceRole.entities.PTORequest.filter({
      start_date: { $lte: endDate },
      end_date: { $gte: startDate },
      status: 'approved'
    });

    const csvRows = [];
    const header = 'Company ID,Worker ID,Org,Job Number,Pay Component,Rate,Rate Number,Hours,Units';
    csvRows.push(header);

    // Process each employee
    for (const employee of employeesWithWorkerId) {
      const employeeTimesheets = timesheets.filter(t => t.employee_id === employee.id);
      const employeePTO = ptoRequests.filter(p => p.employee_id === employee.id);

      // Calculate hours by week for overtime
      const weeklyHours = {};
      
      for (const timesheet of employeeTimesheets) {
        if (!timesheet.clock_in || !timesheet.clock_out) continue;
        
        const hours = timesheet.total_hours || 0;
        const date = new Date(timesheet.date);
        const weekStart = getWeekStart(date);
        
        if (!weeklyHours[weekStart]) {
          weeklyHours[weekStart] = { regular: 0, overtime: 0 };
        }
        
        const currentTotal = weeklyHours[weekStart].regular + weeklyHours[weekStart].overtime;
        
        if (currentTotal < 40) {
          const regularHours = Math.min(hours, 40 - currentTotal);
          weeklyHours[weekStart].regular += regularHours;
          
          if (hours > regularHours) {
            weeklyHours[weekStart].overtime += hours - regularHours;
          }
        } else {
          weeklyHours[weekStart].overtime += hours;
        }
      }

      // Calculate total regular and overtime hours
      let totalRegular = 0;
      let totalOvertime = 0;
      
      for (const week in weeklyHours) {
        totalRegular += weeklyHours[week].regular;
        totalOvertime += weeklyHours[week].overtime;
      }

      const baseRate = employee.baseHourlyRate || 0;
      const overtimeRate = baseRate * 1.5;

      // Add regular hours row
      if (totalRegular > 0) {
        csvRows.push(`${companyId},${employee.paychexWorkerId},,,Regular,${baseRate.toFixed(2)},,${totalRegular.toFixed(2)},`);
      }

      // Add overtime hours row
      if (totalOvertime > 0) {
        csvRows.push(`${companyId},${employee.paychexWorkerId},,,Overtime,${overtimeRate.toFixed(2)},,${totalOvertime.toFixed(2)},`);
      }

      // Add PTO hours
      for (const pto of employeePTO) {
        const ptoHours = (pto.total_days || 0) * 8;
        if (ptoHours > 0) {
          csvRows.push(`${companyId},${employee.paychexWorkerId},,,Paid Time Off,${baseRate.toFixed(2)},,${ptoHours.toFixed(2)},`);
        }
      }
    }

    const csv = csvRows.join('\n');

    return Response.json({
      success: true,
      csv,
      recordCount: csvRows.length - 1,
      employeesProcessed: employeesWithWorkerId.length,
      periodStart: startDate,
      periodEnd: endDate,
      payDate
    });

  } catch (error) {
    console.error('Paychex export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}