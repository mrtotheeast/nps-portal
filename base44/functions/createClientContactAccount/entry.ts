import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const { contact_id, email, full_name, password, client_id } = body;

    if (!contact_id || !email || !password) {
      return Response.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return Response.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Update the contact's full_name if provided
    if (full_name && full_name.trim()) {
      await base44.asServiceRole.entities.ClientContact.update(contact_id, {
        full_name: full_name.trim()
      });
    }

    // Invite user and set role to "client" via setUserRole function
    try {
      await base44.users.inviteUser(email, "user");
    } catch (inviteError) {
      // User may already exist — that's fine
      console.log("Invite note:", inviteError.message);
    }

    // Set user role to "client" so they get routed to ClientDashboard
    try {
      const allUsers = await base44.asServiceRole.entities.User.filter({ email: email });
      if (allUsers && allUsers.length > 0) {
        await base44.asServiceRole.entities.User.update(allUsers[0].id, { role: "client" });
      }
    } catch (roleError) {
      console.log("Role update note:", roleError.message);
    }

    return Response.json({
      success: true,
      message: 'Account set up successfully'
    });
  } catch (error) {
    console.error('Account creation error:', error);
    return Response.json(
      { success: false, error: error.message || 'Failed to create account' },
      { status: 500 }
    );
  }
});