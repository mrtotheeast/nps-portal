import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can run this
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    // Protected admin emails - never change their roles
    const protectedAdmins = ['aaron.williams@nationwidepolice.com', 'justin.ashe@nationwidepolice.com'];

    // Get all employees
    const employees = await base44.entities.Employee.list();
    
    // Get all Base44 users
    const users = await base44.entities.User.list();
    const userMap = {};
    users.forEach(u => {
      userMap[u.email] = u;
    });

    let corrected = 0;
    let protected_ = 0;
    const corrections = [];

    // Process each employee
    for (const emp of employees) {
      const email = emp.email?.toLowerCase();
      
      // Skip protected admins
      if (email && protectedAdmins.includes(email)) {
        protected_++;
        continue;
      }

      let shouldUpdate = false;
      let newRole = emp.role;

      // Check if email is protected
      const isProtectedAdmin = email && protectedAdmins.includes(email);

      // Null/undefined/empty role → set to "employee"
      if (!emp.role || emp.role.trim() === '') {
        newRole = 'employee';
        shouldUpdate = true;
      }
      // Role is "admin" but no linked admin user account → set to "employee"
      else if (emp.role === 'admin' && !isProtectedAdmin) {
        const linkedUser = userMap[email];
        if (!linkedUser || linkedUser.role !== 'admin') {
          newRole = 'employee';
          shouldUpdate = true;
        }
      }

      if (shouldUpdate) {
        await base44.entities.Employee.update(emp.id, { role: newRole });
        corrected++;
        corrections.push({
          name: `${emp.firstName} ${emp.lastName}`,
          email: emp.email,
          oldRole: emp.role || 'null',
          newRole,
        });
      }
    }

    return Response.json({
      success: true,
      summary: {
        totalEmployees: employees.length,
        corrected,
        protected: protected_,
        corrections,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});