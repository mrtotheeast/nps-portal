import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { current_password, new_password } = await req.json();

        if (!current_password || !new_password) {
            return Response.json({ error: 'Current and new password are required' }, { status: 400 });
        }

        if (new_password.length < 6) {
            return Response.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
        }

        await base44.auth.changePassword({
            userId: user.id,
            currentPassword: current_password,
            newPassword: new_password,
        });

        return Response.json({ success: true });

    } catch (error) {
        console.error('Error changing password:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});