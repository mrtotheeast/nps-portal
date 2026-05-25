import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser || currentUser.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const users = await base44.asServiceRole.entities.User.list();
    const user = users.find(u => u.email === email);

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    await base44.asServiceRole.entities.User.update(user.id, {
      role_type: 'admin'
    });

    return Response.json({ 
      success: true, 
      message: `User ${email} is now an admin`,
      user: {
        id: user.id,
        email: user.email,
        role_type: 'admin'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});