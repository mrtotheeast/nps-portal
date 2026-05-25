import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Admin Hard Delete Employee
 *
 * Permanently deletes an employee profile + user auth record (all account types:
 * email, Google, Sign in with Apple). For Apple accounts, attempts to call Apple's
 * token revocation API if credentials are configured.
 *
 * Required payload:
 *   - employee_id  (string|null) — Employee entity record ID
 *   - user_id      (string|null) — User auth record ID
 *   - user_email   (string|null) — Email address (for audit + Apple detection)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth check: must be a logged-in admin
    const admin = await base44.auth.me();
    if (!admin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const employee_id = body.employee_id || null;
    const user_id = body.user_id || null;
    const user_email = body.user_email || null;

    if (!employee_id && !user_id) {
      return Response.json({ error: 'Must provide employee_id or user_id' }, { status: 400 });
    }

    const deletedItems = [];
    const warnings = [];

    // Detect Apple Sign In account
    const isAppleAccount = !!(user_email && (
      user_email.toLowerCase().includes('privaterelay.appleid.com') ||
      user_email.toLowerCase().includes('@appleid.com')
    ));

    // ----------------------------------------------------------------
    // Step 1: Apple token revocation (non-fatal — proceeds even if fails)
    // ----------------------------------------------------------------
    let appleRevoked = false;
    if (isAppleAccount && user_id) {
      const revokeResult = await revokeAppleToken(base44, user_id);
      appleRevoked = revokeResult.revoked;
      if (revokeResult.warning) warnings.push(revokeResult.warning);
      if (appleRevoked) deletedItems.push('apple_token_revoked');
    }

    // ----------------------------------------------------------------
    // Step 2: Delete Employee entity record
    // ----------------------------------------------------------------
    if (employee_id) {
      try {
        await base44.asServiceRole.entities.Employee.delete(employee_id);
        deletedItems.push('employee_record');
      } catch (err) {
        warnings.push(`Employee record deletion warning: ${err.message}`);
      }
    }

    // ----------------------------------------------------------------
    // Step 3: Clean up related records
    // ----------------------------------------------------------------
    const refId = employee_id || user_id;
    const entityCleanup = [
      ['Timesheet',       'employee_id'],
      ['Shift',           'employee_id'],
      ['PatrolSession',   'officer_id'],
      ['PTORequest',      'employee_id'],
      ['Credential',      'employee_id'],
      ['GPSViolation',    'officer_id'],
      ['OfficerLocation', 'officer_id'],
    ];

    for (const [entityName, fieldName] of entityCleanup) {
      try {
        const records = await base44.asServiceRole.entities[entityName].filter({ [fieldName]: refId });
        if (records.length > 0) {
          await Promise.all(records.map(r => base44.asServiceRole.entities[entityName].delete(r.id)));
          deletedItems.push(`${entityName.toLowerCase()}(${records.length})`);
        }
      } catch (_) { /* entity may not exist — skip silently */ }
    }

    // Clean up notifications by user_id
    if (user_id) {
      try {
        const notifs = await base44.asServiceRole.entities.Notification.filter({ user_id });
        if (notifs.length > 0) {
          await Promise.all(notifs.map(n => base44.asServiceRole.entities.Notification.delete(n.id)));
          deletedItems.push(`notifications(${notifs.length})`);
        }
      } catch (_) {}
    }

    // ----------------------------------------------------------------
    // Step 4: Delete the User auth record (works for ALL providers)
    // ----------------------------------------------------------------
    let userAuthDeleted = false;
    if (user_id) {
      try {
        await base44.asServiceRole.entities.User.delete(user_id);
        userAuthDeleted = true;
        deletedItems.push('user_auth_record');
      } catch (err) {
        // This is the critical step — if it fails, flag it clearly
        const errMsg = `Auth record deletion failed: ${err.message}`;

        // Write audit log before returning the error
        await writeAuditLog(base44, admin, employee_id, user_id, user_email, isAppleAccount, deletedItems, [errMsg]);

        return Response.json({
          success: false,
          partial: true,
          deleted: deletedItems,
          warnings: [errMsg],
          message: `The employee profile was removed but the authentication record could not be deleted. This user may still be able to log in. Please contact support to manually remove the auth account for: ${user_email || user_id}`,
        }, { status: 207 });
      }
    }

    // ----------------------------------------------------------------
    // Step 5: Audit log
    // ----------------------------------------------------------------
    await writeAuditLog(base44, admin, employee_id, user_id, user_email, isAppleAccount, deletedItems, warnings);

    // Build response message
    let message = 'Account permanently deleted from all systems.';
    if (isAppleAccount) {
      message = appleRevoked
        ? 'Account permanently deleted and Apple Sign In authorization revoked.'
        : 'Account permanently deleted. Apple ID disconnected from the app.';
    }

    return Response.json({
      success: true,
      message,
      deleted: deletedItems,
      warnings: warnings.length > 0 ? warnings : undefined,
      apple_revoked: isAppleAccount ? appleRevoked : undefined,
    });

  } catch (error) {
    console.error('[AdminHardDelete] Unexpected error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ----------------------------------------------------------------
// Attempt Apple token revocation — non-fatal helper
// ----------------------------------------------------------------
async function revokeAppleToken(base44, user_id) {
  try {
    // Try to get stored Apple refresh token from user record
    let appleRefreshToken = null;
    try {
      const records = await base44.asServiceRole.entities.User.filter({ id: user_id });
      const rec = records[0];
      appleRefreshToken = rec?.apple_refresh_token || rec?.oauth_refresh_token || null;
    } catch (_) {}

    if (!appleRefreshToken) {
      return { revoked: false, warning: null };
    }

    // Get Apple credentials from environment
    const appleEnv = getAppleEnv();
    if (!appleEnv) {
      return { revoked: false, warning: 'Apple credentials not configured in environment — token not revoked. Account is still fully deleted.' };
    }

    const clientSecret = await buildAppleClientSecret(appleEnv);
    const params = new URLSearchParams({
      client_id: appleEnv.clientId,
      client_secret: clientSecret,
      token: appleRefreshToken,
      token_type_hint: 'refresh_token',
    });

    const res = await fetch('https://appleid.apple.com/auth/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (res.ok || res.status === 200) {
      return { revoked: true, warning: null };
    }

    const body = await res.text().catch(() => '');
    return { revoked: false, warning: `Apple revoke returned ${res.status}: ${body}` };
  } catch (err) {
    return { revoked: false, warning: `Apple revocation error: ${err.message}` };
  }
}

function getAppleEnv() {
  // Read Apple credentials from env — all are optional
  // Set these in Dashboard > Settings > Environment Variables if you use Sign in with Apple
  const env = Deno.env.toObject();
  const teamId   = env['APPLE_TEAM_ID']    || null;
  const clientId = env['APPLE_CLIENT_ID']  || env['APPLE_BUNDLE_ID'] || null;
  const keyId    = env['APPLE_KEY_ID']     || null;
  const privKey  = env['APPLE_PRIVATE_KEY']|| null;
  if (!teamId || !clientId || !keyId || !privKey) return null;
  return { teamId, clientId, keyId, privateKey: privKey };
}

async function buildAppleClientSecret({ teamId, clientId, keyId, privateKey: pemKey }) {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: 'ES256', kid: keyId })).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const payload = btoa(JSON.stringify({ iss: teamId, iat: now, exp: now + 3600, aud: 'https://appleid.apple.com', sub: clientId })).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const sigInput = `${header}.${payload}`;

  const pem = pemKey.replace(/-----[^-]+-----/g,'').replace(/\s/g,'');
  const keyData = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('pkcs8', keyData, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sigBytes = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, cryptoKey, new TextEncoder().encode(sigInput));
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBytes))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');

  return `${sigInput}.${sig}`;
}

async function writeAuditLog(base44, admin, employee_id, user_id, user_email, isAppleAccount, deletedItems, warnings) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: admin.id,
      user_name: admin.full_name,
      user_email: admin.email,
      action: 'permanent_deletion',
      entity_type: 'Employee',
      entity_id: employee_id || user_id,
      severity: 'critical',
      metadata: {
        deleted_user_email: user_email || 'unknown',
        deleted_user_id: user_id || null,
        deleted_employee_id: employee_id || null,
        account_type: isAppleAccount ? 'apple_sign_in' : 'standard',
        items_deleted: deletedItems,
        warnings,
        deleted_by: admin.email,
        deleted_at: new Date().toISOString(),
      }
    });
  } catch (_) { /* audit failure is non-fatal */ }
}