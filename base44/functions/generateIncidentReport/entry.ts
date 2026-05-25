import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { incidentId, format = 'text' } = await req.json();

    if (!incidentId) {
      return Response.json({ error: 'incidentId is required' }, { status: 400 });
    }

    const incident = await base44.asServiceRole.entities.Incident.get(incidentId);
    
    if (!incident) {
      return Response.json({ error: 'Incident not found' }, { status: 404 });
    }

    const site = await base44.asServiceRole.entities.Site.get(incident.site_id);
    const users = await base44.asServiceRole.entities.User.list();
    const reporter = users.find(u => u.id === incident.reporter_id);

    const reportContent = `
# INCIDENT REPORT

**Report ID:** ${incident.id}
**Date:** ${incident.incident_date}
**Time:** ${incident.incident_time}
**Location:** ${site?.name || 'Unknown'}
**Reported By:** ${reporter?.full_name || 'Unknown'}

## INCIDENT DETAILS

**Type:** ${incident.incident_type}
**Severity:** ${incident.severity}
**Status:** ${incident.status}

**Description:**
${incident.description}

${incident.tags && incident.tags.length > 0 ? `**Tags:** ${incident.tags.join(', ')}` : ''}

${incident.complainants && incident.complainants.length > 0 ? `
## COMPLAINANTS
${incident.complainants.map((c, i) => `
${i + 1}. **Name:** ${c.name}
   **Contact:** ${c.contact}
   **Relationship:** ${c.relationship}
`).join('\n')}
` : ''}

${incident.suspects && incident.suspects.length > 0 ? `
## SUSPECTS
${incident.suspects.map((s, i) => `
${i + 1}. **Description:** ${s.description || 'N/A'}
   **Direction Fled:** ${s.direction_fled || 'N/A'}
   **Vehicle Info:** ${s.vehicle_info || 'N/A'}
`).join('\n')}
` : ''}

${incident.property_damage?.has_damage ? `
## PROPERTY DAMAGE
**Description:** ${incident.property_damage.description}
**Estimated Value:** $${incident.property_damage.estimated_value || 0}
**Owner:** ${incident.property_damage.owner_info || 'N/A'}
` : ''}

${incident.injuries?.has_injuries ? `
## INJURIES
**Who Injured:** ${incident.injuries.who_injured}
**Nature:** ${incident.injuries.nature_of_injuries}
**Medical Treatment:** ${incident.injuries.medical_treatment ? 'Yes' : 'No'}
${incident.injuries.hospital_name ? `**Hospital:** ${incident.injuries.hospital_name}` : ''}
` : ''}

---
*Report generated on ${new Date().toISOString()}*
    `.trim();

    return Response.json({
      success: true,
      report: reportContent,
      format: format
    });

  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});