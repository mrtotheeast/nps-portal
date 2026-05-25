import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role_type !== 'super_admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { documentId, versionId } = await req.json();

    const version = await base44.asServiceRole.entities.DocumentVersion.get(versionId);
    const document = await base44.asServiceRole.entities.Document.get(documentId);
    
    if (!version || version.document_id !== documentId) {
      return Response.json({ error: 'Version not found' }, { status: 404 });
    }

    const newVersionNumber = (document.version || 1) + 1;
    
    await base44.asServiceRole.entities.Document.update(documentId, {
      file_url: version.file_url,
      version: newVersionNumber
    });

    await base44.asServiceRole.entities.DocumentVersion.create({
      document_id: documentId,
      version_number: newVersionNumber,
      file_url: version.file_url,
      uploaded_by: user.id,
      uploaded_by_name: user.full_name,
      changes_summary: `Reverted to version ${version.version_number}`
    });

    return Response.json({ 
      success: true,
      newVersion: newVersionNumber 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});