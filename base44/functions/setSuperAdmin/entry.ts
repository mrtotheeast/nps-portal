import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email } = await req.json();

    const users = await base44.asServiceRole.entities.User.filter({ email: email });
    
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    await base44.asServiceRole.entities.User.update(user.id, {
      role_type: 'super_admin'
    });

    return Response.json({
      success: true,
      message: `${email} is now a super admin`,
      userId: user.id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});