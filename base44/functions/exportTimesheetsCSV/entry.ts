import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employee_id } = await req.json();

    const [users, timesheets, sites] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Timesheet.filter({ employee_id }),
      base44.asServiceRole.entities.Site.list()
    ]);

    const employee = users.find(u => u.id === employee_id);
    if (!employee) {
      return Response.json({ error: 'Employee not found' }, { status: 404 });
    }

    const headers = [
      'Employee ID',
      'Employee Name',
      'Date',
      'Clock In',
      'Clock Out',
      'Total Hours',
      'Department',
      'Status',
      'Regular Hours',
      'Overtime Hours',
      'Pay Rate'
    ];

    const rows = timesheets
      .filter(t => t.clock_in && t.clock_out)
      .map(timesheet => {
        const site = sites.find(s => s.id === timesheet.site_id);
        const totalHours = timesheet.total_hours || 0;
        const regularHours = Math.min(totalHours, 8);
        const overtimeHours = Math.max(totalHours - 8, 0);

        return [
          employee_id,
          employee.full_name,
          format(new Date(timesheet.date), 'MM/dd/yyyy'),
          format(new Date(timesheet.clock_in), 'HH:mm'),
          format(new Date(timesheet.clock_out), 'HH:mm'),
          totalHours.toFixed(2),
          site?.name || 'General',
          timesheet.status,
          regularHours.toFixed(2),
          overtimeHours.toFixed(2),
          employee.base_hourly_rate || '0.00'
        ];
      });

    const csvLines = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ];

    const csv = csvLines.join('\n');

    return Response.json({
      success: true,
      csv,
      filename: `${employee.full_name.replace(/\s+/g, '_')}_timesheets_${format(new Date(), 'yyyy-MM-dd')}.csv`
    });
  } catch (error) {
    console.error('CSV export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});