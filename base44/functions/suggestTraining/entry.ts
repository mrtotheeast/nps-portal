import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { employee_id } = await req.json();

    if (!employee_id) {
      return Response.json({ error: 'Missing employee_id' }, { status: 400 });
    }

    const employees = await base44.asServiceRole.entities.User.filter({ id: employee_id });
    const employee = employees[0];
    
    if (!employee) {
      return Response.json({ error: 'Employee not found' }, { status: 404 });
    }

    const reviews = await base44.asServiceRole.entities.PerformanceReview.filter({ employee_id });
    const courses = await base44.asServiceRole.entities.TrainingCourse.filter({ status: 'active' });
    const assignments = await base44.asServiceRole.entities.TrainingAssignment.filter({ employee_id });

    const certifications = employee.certifications?.map(c => c.name).join(', ') || 'None';
    const recentReview = reviews[0];
    const areasForImprovement = recentReview?.areas_for_improvement || 'Not specified';

    const prompt = `Based on this employee profile, suggest relevant training courses:

Employee Role: ${employee.role_type}
Current Certifications: ${certifications}
Areas for Improvement: ${areasForImprovement}

Available Courses:
${courses.map(c => `- ${c.title}`).join('\n')}

Provide JSON with recommendations array.`;

    const suggestions = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                course_title: { type: "string" },
                reasoning: { type: "string" },
                priority: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({ success: true, suggestions: suggestions.recommendations });
  } catch (error) {
    console.error('Training suggestion error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});