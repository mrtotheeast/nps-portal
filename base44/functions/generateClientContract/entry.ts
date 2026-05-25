import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role_type !== 'super_admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { clientId } = await req.json();

    // Get client details
    const client = await base44.asServiceRole.entities.Client.get(clientId);
    const sites = await base44.asServiceRole.entities.Site.filter({ client_id: clientId });

    // Generate contract content using AI
    const contractData = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Generate a professional security services contract for:

Client: ${client.name}
Contact: ${client.contact_person}
Email: ${client.email}
Phone: ${client.phone}

Services:
- Security patrol services at ${sites.length} location(s)
${sites.map(s => `  - ${s.name}: ${s.address?.street}, ${s.address?.city}, ${s.address?.state}`).join('\n')}

Create a structured contract with sections:
1. Contract Header (parties, date, agreement title)
2. Services Provided (detailed list)
3. Term and Termination
4. Payment Terms
5. Insurance and Liability
6. Confidentiality
7. Signatures

Return as structured JSON with section titles and content.`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                heading: { type: "string" },
                content: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      contract: contractData,
      clientName: client.name,
      message: 'Contract generated successfully'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});