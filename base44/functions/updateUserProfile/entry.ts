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

    const { target_user_id, full_name, phone, position, role_type } = await req.json();

    if (!target_user_id) {
      return Response.json({ error: 'target_user_id is required' }, { status: 400 });
    }

    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;
    if (position !== undefined) updateData.position = position;
    if (role_type !== undefined) {
      updateData.role_type = role_type;
      updateData.role = PLATFORM_ROLE_MAP[role_type] ?? 'user';
    }

    await base44.asServiceRole.entities.User.update(target_user_id, updateData);

    return Response.json({
      success: true,
      message: `User ${target_user_id} updated successfully`,
      updated_fields: Object.keys(updateData)
    });
  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});