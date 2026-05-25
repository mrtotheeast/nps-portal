import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * ONE-TIME MIGRATION: Assign company_id to all existing records.
 * Creates "NPS" company and assigns all existing data to it.
 * Super admin only.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'super_admin') {
      return Response.json({ error: 'Super admin only' }, { status: 403 });
    }

    // Check if NPS company already exists
    let npsCompany = await base44.asServiceRole.entities.Company.filter({ slug: 'nps' });
    
    if (npsCompany.length === 0) {
      // Create NPS company if it doesn't exist
      npsCompany = [await base44.asServiceRole.entities.Company.create({
        name: 'Nationwide Police Services',
        slug: 'nps',
        owner_email: 'admin@nationwidepolice.com',
        subscription_plan: 'enterprise',
        status: 'active',
        primary_color: '#1a2b4a',
        max_users: 1000
      })];
    }

    const npsId = npsCompany[0].id;

    // Migrate all entities by adding company_id
    const entities = [
      'Employee', 'Shift', 'Site', 'Incident', 'Timesheet',
      'PatrolSession', 'TrainingAssignment', 'Announcement',
      'Client', 'Invoice', 'Document', 'ChatChannel'
    ];

    let migratedCount = 0;
    const results = {};

    for (const entityName of entities) {
      try {
        const records = await base44.asServiceRole.entities[entityName].list();
        const filtered = records.filter(r => !r.company_id); // Only migrate records without company_id

        for (const record of filtered) {
          try {
            await base44.asServiceRole.entities[entityName].update(record.id, {
              company_id: npsId
            });
            migratedCount++;
          } catch (e) {
            console.warn(`Failed to migrate ${entityName} ${record.id}:`, e.message);
          }
        }

        results[entityName] = {
          total: records.length,
          migrated: filtered.length
        };
      } catch (e) {
        console.warn(`Could not migrate ${entityName}:`, e.message);
        results[entityName] = { error: e.message };
      }
    }

    return Response.json({
      success: true,
      message: 'Migration complete',
      nps_company_id: npsId,
      total_migrated: migratedCount,
      entity_results: results
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});