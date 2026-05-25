import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PLATFORM_ROLE_MAP = {
  admin: 'admin',
  manager: 'user',
  supervisor: 'user',
  officer: 'user',
  employee: 'user',
  client: 'user',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser || currentUser.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { target_user_id, role } = await req.json();

    if (!target_user_id || !role) {
      return Response.json({ error: 'target_user_id and role are required' }, { status: 400 });
    }

    const platformRole = PLATFORM_ROLE_MAP[role] ?? 'user';

    // Update the User entity with both platform role and app role_type
    await base44.asServiceRole.entities.User.update(target_user_id, {
      role: platformRole,
      role_type: role
    });

    // Also sync role to the Employee entity so AuthContext reads it correctly
    try {
      const targetUser = await base44.asServiceRole.entities.User.list();
      const found = targetUser.find(u => u.id === target_user_id);
      if (found?.email) {
        const employees = await base44.asServiceRole.entities.Employee.filter({ email: found.email });
        if (employees.length > 0) {
          await base44.asServiceRole.entities.Employee.update(employees[0].id, { role });
        }
      }
    } catch (e) {
      // Non-fatal — User entity update already succeeded
      console.warn('Could not sync role to Employee entity:', e.message);
    }

    return Response.json({
      success: true,
      message: `User role updated to ${role}`,
      platform_role: platformRole,
      role_type: role
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});