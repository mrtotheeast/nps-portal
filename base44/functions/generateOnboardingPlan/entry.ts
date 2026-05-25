import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role_type !== 'admin')) {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { employee_id, role_type, client_id, start_date } = await req.json();

    const trainingCourses = await base44.asServiceRole.entities.TrainingCourse.filter({ status: 'active' });

    const plan = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Generate a comprehensive onboarding plan for a new security officer.

Role: ${role_type || 'Security Officer'}
Start Date: ${start_date || 'Not specified'}

Available Training Courses:
${trainingCourses.slice(0, 5).map(c => `- ${c.title}`).join('\n')}

Create a detailed onboarding plan including:
1. Week-by-week tasks for the first month
2. Recommended training courses (from available list)
3. Key milestones and checkpoints
4. Required documentation

Format as a structured plan.`,
      response_json_schema: {
        type: "object",
        properties: {
          welcome_message: { type: "string" },
          week_1_tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task: { type: "string" },
                task_type: { type: "string" },
                priority: { type: "string" }
              }
            }
          },
          week_2_tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task: { type: "string" },
                task_type: { type: "string" },
                priority: { type: "string" }
              }
            }
          },
          week_3_tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task: { type: "string" },
                task_type: { type: "string" },
                priority: { type: "string" }
              }
            }
          },
          week_4_tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task: { type: "string" },
                task_type: { type: "string" },
                priority: { type: "string" }
              }
            }
          },
          recommended_training_courses: {
            type: "array",
            items: { type: "string" }
          },
          key_milestones: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    return Response.json({
      success: true,
      plan
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});