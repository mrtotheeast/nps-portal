import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { description, incident_type } = await req.json();

    if (!description) {
      return Response.json({ error: 'Description is required' }, { status: 400 });
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analyze this incident and suggest tags and severity.

Incident Type: ${incident_type || 'Unknown'}
Description: ${description}

Provide:
1. 3-5 relevant tags
2. Severity level (low, medium, high)
3. Brief reasoning`,
      response_json_schema: {
        type: "object",
        properties: {
          tags: { type: "array", items: { type: "string" } },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          reasoning: { type: "string" }
        }
      }
    });

    return Response.json({ success: true, suggestions: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});