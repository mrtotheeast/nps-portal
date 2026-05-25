import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id, client_data, deletion_reason, deleted_by_client } = await req.json();

    if (!client_id || !client_data) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create audit log entry
    const auditEntry = await base44.entities.DeletedClientAuditLog.create({
      client_id,
      client_name: client_data.name,
      primary_contact: client_data.primary_contact || {},
      service_type: client_data.service_type,
      contract_start_date: client_data.contract_start_date,
      contract_end_date: client_data.contract_end_date,
      status: client_data.status || 'deleted',
      deleted_by: user.email,
      deletion_reason: deletion_reason || '',
      deleted_by_client: deleted_by_client || false,
      archived_client_data: client_data
    });

    return Response.json({ 
      success: true, 
      message: 'Client archived to audit log',
      audit_log_id: auditEntry.id 
    });
  } catch (error) {
    console.error('Archive error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});