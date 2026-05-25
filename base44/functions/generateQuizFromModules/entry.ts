import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.role_type !== 'manager') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { modules, questionCount = 10 } = await req.json();

    const prompt = `Generate ${questionCount} quiz questions based on these training modules:

${modules.map((m, i) => `
Module ${i + 1}: ${m.title}
${m.summary}
`).join('\n')}

Create questions that:
- Cover all modules proportionally
- Mix difficulty levels (30% easy, 50% medium, 20% hard)
- Use multiple choice, true/false, and short answer formats
- Test understanding, not just memorization`;

    const questions = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                type: { type: "string", enum: ["multiple_choice", "true_false", "short_answer"] },
                difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                options: { type: "array", items: { type: "string" } },
                correct_answer: { type: "number" },
                explanation: { type: "string" },
                module_index: { type: "number" }
              }
            }
          }
        }
      }
    });

    return Response.json(questions);
  } catch (error) {
    console.error('Error generating quiz:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});