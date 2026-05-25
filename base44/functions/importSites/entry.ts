import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role_type !== 'super_admin') {
      return Response.json({ error: 'Unauthorized - Super Admin only' }, { status: 403 });
    }

    const { githubUrl } = await req.json();
    
    const response = await fetch(githubUrl);
    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch from GitHub' }, { status: 400 });
    }

    const csvData = await response.text();
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const sites = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(v => v.trim());
      const site = {};
      headers.forEach((header, index) => {
        site[header] = values[index];
      });
      
      if (site.name) {
        sites.push(site);
      }
    }

    const imported = [];
    for (const siteData of sites) {
      try {
        await base44.asServiceRole.entities.Site.create({
          name: siteData.name,
          address: {
            street: siteData.street || '',
            city: siteData.city || '',
            state: siteData.state || '',
            zip: siteData.zip || ''
          },
          latitude: parseFloat(siteData.latitude) || 0,
          longitude: parseFloat(siteData.longitude) || 0,
          status: 'active'
        });
        imported.push(siteData.name);
      } catch (err) {
        console.log(`Failed to import ${siteData.name}: ${err.message}`);
      }
    }

    return Response.json({ 
      success: true,
      imported: imported.length,
      sites: imported
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});