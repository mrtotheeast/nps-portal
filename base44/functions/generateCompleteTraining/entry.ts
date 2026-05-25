import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.role_type !== 'manager') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { topic, audience, duration, tone, jurisdiction, include_scenarios, quiz_count, slide_count, uploaded_files } = await req.json();

    let documentContext = "";
    if (uploaded_files && uploaded_files.length > 0) {
      for (const file of uploaded_files) {
        try {
          const extractResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Extract key information, policies, procedures, and important details from this document relevant for creating training content on "${topic}". Focus on factual content, policies, and procedures.`,
            file_urls: [file.url]
          });
          documentContext += `\n\nFrom ${file.name}:\n${extractResult}`;
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
        }
      }
    }

    const trainingPrompt = `Create a comprehensive ${duration}-hour training program for ${audience} on: "${topic}"

Tone: ${tone}
Jurisdiction: ${jurisdiction}
${include_scenarios ? "Include scenario-based exercises and case studies" : ""}

${documentContext ? `Source documents context (use as authoritative reference):\n${documentContext}\n\n` : ''}

Generate:
1. TRAINING OVERVIEW
   - Title
   - Description (2-3 sentences)
   - Category (one of: use_of_force, report_writing, de_escalation, firearms_safety, spo, legal_compliance, customer_service, emergency_response, other)
   - Learning objectives (3-5 specific outcomes)
   - Prerequisites (if any)

2. MODULE BREAKDOWN (divide ${duration} hours into 3-6 modules)
   For each module:
   - Title
   - Summary (2-3 sentences)
   - Detailed content (step-by-step lesson with key points)
   - Key takeaways (3-5 bullet points)

3. QUIZ QUESTIONS (${quiz_count} total)
   - Mix of difficulties (30% easy, 50% medium, 20% hard)
   - Multiple choice, true/false, and short answer
   - Include correct answers and explanations
   - Link questions to specific modules

4. POWERPOINT SLIDES (${slide_count} slides)
   - Title slide
   - Overview slide
   - Module slides with bullet points
   - Summary slide
   - Include speaker notes for instructors

5. SOURCES LIST
   - All cited resources with URLs
   - Proper attribution`;

    const training = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: trainingPrompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
          estimated_duration: { type: "number" },
          learning_objectives: { type: "array", items: { type: "string" } },
          prerequisites: { type: "array", items: { type: "string" } },
          modules: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
                content: { type: "string" },
                key_takeaways: { type: "array", items: { type: "string" } }
              }
            }
          },
          quiz: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    type: { type: "string" },
                    difficulty: { type: "string" },
                    options: { type: "array", items: { type: "string" } },
                    correct_answer: { type: "number" },
                    explanation: { type: "string" },
                    module_index: { type: "number" }
                  }
                }
              }
            }
          },
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

    return Response.json({
      success: true,
      ...training
    });
  } catch (error) {
    console.error('Error generating training:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});