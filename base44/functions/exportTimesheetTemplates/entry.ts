import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all timesheet templates
    const templates = await base44.entities.TimesheetTemplate.list('-created_date', 1000);
    
    // Fetch all employees to get names
    const employees = await base44.entities.Employee.list('', 1000);
    const employeeMap = new Map(employees.map(e => [e.id, `${e.firstName} ${e.lastName}`]));

    // Fetch all sites to get names
    const sites = await base44.entities.Site.list('', 1000);
    const siteMap = new Map(sites.map(s => [s.id, s.name]));

    // Build CSV data
    const headers = ['Employee Name', 'Template Name', 'Clock In Time', 'Clock Out Time', 'Typical Hours', 'Days of Week', 'Site Name', 'Created Date'];
    const rows = templates.map(t => {
      const employeeName = employeeMap.get(t.employee_id) || 'Unknown';
      const siteName = t.site_id ? (siteMap.get(t.site_id) || 'Unknown') : 'All Sites';
      const daysOfWeek = t.days_of_week ? t.days_of_week.map(d => {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return dayNames[d];
      }).join(',') : 'All Days';
      
      return [
        employeeName,
        t.name || '',
        t.clock_in_time || '',
        t.clock_out_time || '',
        t.typical_hours || '',
        daysOfWeek,
        siteName,
        t.created_date ? new Date(t.created_date).toLocaleDateString() : ''
      ];
    });

    // Generate CSV
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape commas and quotes in cell values
        const str = String(cell);
        if (str.includes(',') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(','))
    ].join('\n');

    const timestamp = new Date().toISOString().split('T')[0];
    
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=timesheet-templates-${timestamp}.csv`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});