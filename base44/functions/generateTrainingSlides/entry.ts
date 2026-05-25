import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.role_type !== 'manager') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { training, topic } = await req.json();

    if (!training || !topic) {
      return Response.json({ error: 'Training data and topic are required' }, { status: 400 });
    }

    const prompt = `Create a PowerPoint-ready slide deck for: "${training.title || topic}"

Generate slides with:
- Title slide
- Agenda/Overview slide
- 2-3 slides per section with clear bullet points
- Summary slide
- Q&A slide

Each slide should have 3-5 concise bullet points and speaker notes.`;

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

    return Response.json({ success: true, slides: slides.slides });
  } catch (error) {
    console.error('Error generating slides:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});