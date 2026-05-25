import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // No auth required — unauthenticated forgot-password flow
        const { target_email, code, new_password } = await req.json();

        if (!target_email || !code || !new_password) {
            return Response.json({ error: 'Email, code, and new password are required' }, { status: 400 });
        }

        if (new_password.length < 8) {
            return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }

        const emailToReset = target_email.toLowerCase().trim();

        // Look up Employee record where we stored the reset code
        const employees = await base44.asServiceRole.entities.Employee.filter({ email: emailToReset });
        if (!employees || employees.length === 0) {
            return Response.json({ error: 'No account found for that email' }, { status: 404 });
        }

        const employee = employees[0];

        if (!employee.password_reset_code || employee.password_reset_code !== code.trim()) {
            return Response.json({ error: 'Invalid reset code' }, { status: 400 });
        }

        if (employee.password_reset_expires && new Date() > new Date(employee.password_reset_expires)) {
            return Response.json({ error: 'Reset code has expired. Please request a new one.' }, { status: 400 });
        }

        // Try to find and reset User account if it exists
        const users = await base44.asServiceRole.entities.User.filter({ email: emailToReset });
        if (users && users.length > 0) {
            const targetUser = users[0];
            await base44.asServiceRole.auth.resetUserPassword({
                userId: targetUser.id,
                newPassword: new_password,
            });
            console.log('Password reset for existing user:', emailToReset);
        } else {
            // User has no platform account yet — register them directly with the desired password
            try {
                const displayName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || emailToReset;
                await base44.auth.register({
                    email: emailToReset,
                    password: new_password,
                    full_name: displayName,
                });
                console.log('User registered with password via reset flow:', emailToReset);
            } catch (regErr) {
                // May already exist — try password reset as fallback
                console.log('Register note:', regErr.message);
                try {
                    await base44.auth.inviteUser(emailToReset, 'user');
                    await new Promise(r => setTimeout(r, 2000));
                    const retryUsers = await base44.asServiceRole.entities.User.filter({ email: emailToReset });
                    if (retryUsers && retryUsers.length > 0) {
                        await base44.asServiceRole.auth.resetUserPassword({
                            userId: retryUsers[0].id,
                            newPassword: new_password,
                        });
                        console.log('Password set after invite retry:', emailToReset);
                    }
                } catch (e2) {
                    console.log('Fallback also failed:', e2.message);
                }
            }
        }

        // Clear the reset code from Employee record
        await base44.asServiceRole.entities.Employee.update(employee.id, {
            password_reset_code: null,
            password_reset_expires: null,
            must_change_password: false,
            invitation_status: 'active',
        });

        return Response.json({ success: true });

    } catch (error) {
        console.error('verifyPasswordResetCode error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});