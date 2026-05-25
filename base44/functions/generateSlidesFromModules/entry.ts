import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.role_type !== 'manager') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { title, modules } = await req.json();

    const prompt = `Create a PowerPoint-ready slide deck for: "${title}"

Modules:
${modules.slice(0, 5).map((m, i) => `
${i + 1}. ${m.title}
${m.summary}
`).join('\n')}

Generate slides with:
- Title slide
- Agenda slide
- 2-3 slides per module with clear bullet points
- Summary slide
- Q&A slide`;

    const slides = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          slides: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                bullets: { type: "array", items: { type: "string" } },
                speaker_notes: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json(slides);
  } catch (error) {
    console.error('Error generating slides:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});