import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role_type !== 'super_admin') {
      return Response.json({ error: 'Unauthorized - Super Admin only' }, { status: 403 });
    }

    const { githubUrl } = await req.json();
    
    const response = await fetch(githubUrl);
    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch from GitHub' }, { status: 400 });
    }

    const csvData = await response.text();
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const employees = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(v => v.trim());
      const employee = {};
      headers.forEach((header, index) => {
        employee[header] = values[index];
      });
      
      if (employee.email) {
        employees.push(employee);
      }
    }

    const imported = [];
    for (const emp of employees) {
      try {
        await base44.asServiceRole.users.inviteUser(
          emp.email,
          emp.role || 'employee'
        );
        imported.push(emp.email);
      } catch (err) {
        console.log(`Failed to invite ${emp.email}: ${err.message}`);
      }
    }

    return Response.json({ 
      success: true,
      imported: imported.length,
      emails: imported
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});