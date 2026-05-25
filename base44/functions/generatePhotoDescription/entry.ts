import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, context } = await req.json();

    const description = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are analyzing a photo taken during a security patrol. 
      
Context: ${context || 'Security patrol photo'}

Please provide:
1. A detailed description of what you see in the image
2. Any security concerns or notable observations
3. Suggested follow-up actions if needed

Be specific and professional.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          description: { type: "string" },
          security_concerns: { type: "array", items: { type: "string" } },
          suggested_actions: { type: "array", items: { type: "string" } },
          severity: { 
            type: "string",
            enum: ["none", "low", "medium", "high"]
          }
        }
      }
    });

    return Response.json({
      success: true,
      ...description
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});