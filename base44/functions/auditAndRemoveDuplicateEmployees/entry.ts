import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.role_type !== 'super_admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all employees
    const employees = await base44.asServiceRole.entities.Employee.list();
    
    // Find duplicates by email
    const emailMap = {};
    const duplicates = [];
    const duplicateIds = [];

    employees.forEach(emp => {
      const email = emp.email?.toLowerCase();
      if (!email) return;
      
      if (!emailMap[email]) {
        emailMap[email] = [];
      }
      emailMap[email].push(emp);
    });

    // Identify duplicate groups (keep first, mark rest as duplicates)
    Object.entries(emailMap).forEach(([email, empList]) => {
      if (empList.length > 1) {
        duplicates.push({
          email,
          count: empList.length,
          employees: empList.map(e => ({
            id: e.id,
            firstName: e.firstName,
            lastName: e.lastName,
            createdAt: e.created_date
          }))
        });

        // Keep the oldest (first created), remove the rest
        const sorted = empList.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        for (let i = 1; i < sorted.length; i++) {
          duplicateIds.push(sorted[i].id);
        }
      }
    });

    // Delete duplicates
    let deletedCount = 0;
    for (const id of duplicateIds) {
      try {
        await base44.asServiceRole.entities.Employee.delete(id);
        deletedCount++;
      } catch (err) {
        console.error(`Failed to delete duplicate employee ${id}:`, err);
      }
    }

    return Response.json({
      message: `Audit completed: Found ${duplicates.length} duplicate groups, deleted ${deletedCount} duplicate records`,
      duplicatesFound: duplicates.length,
      recordsDeleted: deletedCount,
      duplicateDetails: duplicates
    });
  } catch (error) {
    console.error('Audit error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});