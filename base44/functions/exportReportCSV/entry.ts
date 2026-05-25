import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportType, dateRange } = await req.json();

    let csvData = '';
    let filename = 'report.csv';

    if (reportType === 'patrols') {
      const patrols = await base44.entities.PatrolSession.list('-start_time', 500);
      csvData = 'Date,Site,Duration (min),Checkpoints Scanned,Status\n';
      
      patrols.forEach(patrol => {
        const duration = patrol.end_time 
          ? ((new Date(patrol.end_time) - new Date(patrol.start_time)) / (1000 * 60)).toFixed(0)
          : 'N/A';
        
        csvData += `${new Date(patrol.start_time).toLocaleDateString()},`;
        csvData += `Site ${patrol.site_id},`;
        csvData += `${duration},`;
        csvData += `${patrol.scanned_checkpoints || 0}/${patrol.total_checkpoints || 0},`;
        csvData += `${patrol.status}\n`;
      });
      filename = 'patrols-report.csv';
    } else if (reportType === 'incidents') {
      const incidents = await base44.entities.Incident.list('-incident_date', 500);
      csvData = 'Date,Type,Severity,Status,Description\n';
      
      incidents.forEach(incident => {
        csvData += `${incident.incident_date || 'N/A'},`;
        csvData += `${incident.incident_type},`;
        csvData += `${incident.severity},`;
        csvData += `${incident.status},`;
        csvData += `"${(incident.description || '').replace(/"/g, '""')}"\n`;
      });
      filename = 'incidents-report.csv';
    } else if (reportType === 'timesheets') {
      const timesheets = await base44.entities.Timesheet.list('-date', 500);
      csvData = 'Date,Employee,Site,Hours,Status\n';
      
      timesheets.forEach(timesheet => {
        csvData += `${timesheet.date},`;
        csvData += `${timesheet.employee_id},`;
        csvData += `${timesheet.site_id || 'N/A'},`;
        csvData += `${timesheet.total_hours || 0},`;
        csvData += `${timesheet.status}\n`;
      });
      filename = 'timesheets-report.csv';
    } else if (reportType === 'training') {
      const training = await base44.entities.TrainingAssignment.list('-assigned_date', 500);
      csvData = 'Employee,Course,Status,Progress,Completion Date\n';
      
      training.forEach(assignment => {
        csvData += `${assignment.employee_id},`;
        csvData += `${assignment.course_id},`;
        csvData += `${assignment.status},`;
        csvData += `${assignment.progress || 0}%,`;
        csvData += `${assignment.completed_date || 'N/A'}\n`;
      });
      filename = 'training-report.csv';
    }

    return new Response(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=${filename}`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});