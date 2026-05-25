import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { siteId, checkpointId } = await req.json();
    
    const site = await base44.asServiceRole.entities.Site.get(siteId);
    if (!site) {
      return Response.json({ error: 'Site not found' }, { status: 404 });
    }

    const checkpoint = site.checkpoints?.find(cp => cp.id === checkpointId);
    if (!checkpoint) {
      return Response.json({ error: 'Checkpoint not found' }, { status: 404 });
    }

    const qrData = checkpoint.qr_code || `${siteId}-${checkpointId}`;

    return Response.json({
      success: true,
      qrData: qrData,
      checkpointName: checkpoint.name,
      siteName: site.name
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});