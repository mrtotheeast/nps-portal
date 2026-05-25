import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { clientId } = await req.json();

    if (!clientId) {
      return Response.json({ error: 'clientId is required' }, { status: 400 });
    }

    // Get client info
    const client = await base44.asServiceRole.entities.Client.get(clientId);
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get client's sites
    const allSites = await base44.asServiceRole.entities.Site.list();
    const clientSites = allSites.filter(s => s.client_id === clientId);
    const siteIds = clientSites.map(s => s.id);

    if (siteIds.length === 0) {
      return Response.json({ error: 'No sites found for this client' }, { status: 404 });
    }

    // Get check-ins for the last year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const allCheckIns = await base44.asServiceRole.entities.SiteCheckIn.list();
    const clientCheckIns = allCheckIns.filter(ci => 
      siteIds.includes(ci.siteId) &&
      new Date(ci.checkInTime) >= oneYearAgo
    );

    // Get employees for names
    const employees = await base44.asServiceRole.entities.Employee.list();

    // Prepare spreadsheet data
    const rows = [
      ['Date', 'Time', 'Site', 'Officer Name', 'Location', 'QR Code ID']
    ];

    for (const checkIn of clientCheckIns) {
      const site = clientSites.find(s => s.id === checkIn.siteId);
      const employee = employees.find(e => e.id === checkIn.employeeId);
      const checkInDate = new Date(checkIn.checkInTime);
      
      rows.push([
        checkInDate.toLocaleDateString(),
        checkInDate.toLocaleTimeString(),
        site?.name || 'Unknown',
        employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
        checkIn.location?.latitude && checkIn.location?.longitude 
          ? `${checkIn.location.latitude}, ${checkIn.location.longitude}` 
          : 'N/A',
        checkIn.qrCodeId || 'N/A'
      ]);
    }

    // Return data for client to handle Google Sheets export
    return Response.json({
      success: true,
      data: rows,
      clientName: client.name,
      checkInCount: clientCheckIns.length,
      message: `Prepared ${clientCheckIns.length} check-ins for export`
    });

  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ 
      error: error.message
    }, { status: 500 });
  }
});