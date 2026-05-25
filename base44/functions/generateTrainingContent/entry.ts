import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['super_admin', 'admin'].includes(user.role_type)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { title, description, topics, durationHours, level } = await req.json();

    const content = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an expert training content developer specializing in security training.

Create a comprehensive training course with:
- Title: ${title}
- Description: ${description}
- Topics: ${topics}
- Duration: ${durationHours} hours
- Level: ${level}

Generate:
1. Learning objectives
2. Multiple sections with detailed content
3. Practical examples and scenarios
4. Key takeaways for each section
5. Assessment questions
6. Resources and references

Make it professional and practical for security officers.`,
      response_json_schema: {
        type: "object",
        properties: {
          learning_objectives: {
            type: "array",
            items: { type: "string" }
          },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                section_title: { type: "string" },
                section_content: { type: "string" },
                key_takeaways: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          },
          assessment_questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                options: {
                  type: "array",
                  items: { type: "string" }
                },
                correct_answer: { type: "string" }
              }
            }
          },
          resources: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    return Response.json({ success: true, content });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});