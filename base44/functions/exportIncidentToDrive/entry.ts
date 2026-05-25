import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { incidentId } = await req.json();
    
    // Get incident data
    const incident = await base44.asServiceRole.entities.Incident.get(incidentId);
    if (!incident) {
      return Response.json({ error: 'Incident not found' }, { status: 404 });
    }

    // Generate PDF via backend function
    const pdfResponse = await base44.asServiceRole.functions.invoke('exportReportPDF', { 
      type: 'incident',
      id: incidentId 
    });

    // Update incident with export record
    await base44.asServiceRole.entities.Incident.update(incidentId, {
      last_exported_at: new Date().toISOString(),
      export_count: (incident.export_count || 0) + 1
    });

    return Response.json({ 
      success: true, 
      message: 'Incident PDF generated successfully'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});