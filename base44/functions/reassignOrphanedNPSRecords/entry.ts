import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Step 1: Find the NPS company
    const npsCompanies = await base44.asServiceRole.entities.Company.filter({ name: "Nationwide Police Services" });
    if (!npsCompanies || npsCompanies.length === 0) {
      return Response.json({ error: 'NPS company not found' }, { status: 404 });
    }
    const npsCompanyId = npsCompanies[0].id;

    // Step 2: Assign ALL employees to NPS (not just orphaned ones)
    const allEmployees = await base44.asServiceRole.entities.Employee.list("-created_date", 10000);
    let employeesAssigned = 0;
    for (const emp of allEmployees) {
      await base44.asServiceRole.entities.Employee.update(emp.id, { company_id: npsCompanyId });
      employeesAssigned++;
    }

    // Step 3: Assign ALL clients to NPS
    const allClients = await base44.asServiceRole.entities.Client.list("-created_date", 10000);
    let clientsAssigned = 0;
    for (const client of allClients) {
      await base44.asServiceRole.entities.Client.update(client.id, { company_id: npsCompanyId });
      clientsAssigned++;
    }

    // Step 4: Assign ALL sites to NPS
    const allSites = await base44.asServiceRole.entities.Site.list("-created_date", 10000);
    let sitesAssigned = 0;
    for (const site of allSites) {
      await base44.asServiceRole.entities.Site.update(site.id, { company_id: npsCompanyId });
      sitesAssigned++;
    }

    return Response.json({
      success: true,
      npsCompanyId,
      employeesAssigned,
      clientsAssigned,
      sitesAssigned,
      message: `Assigned ${employeesAssigned} employees, ${clientsAssigned} clients, and ${sitesAssigned} sites to NPS company`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});