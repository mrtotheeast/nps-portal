import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await req.json();

    // Get employee details
    const employee = await base44.asServiceRole.entities.User.get(employeeId);
    
    // Get employee's assignments (shifts to determine client)
    const shifts = await base44.asServiceRole.entities.Shift.filter({ employee_id: employeeId });
    const siteIds = [...new Set(shifts.map(s => s.site_id))];
    const sites = await Promise.all(
      siteIds.map(id => base44.asServiceRole.entities.Site.get(id))
    );
    const clientIds = [...new Set(sites.map(s => s.client_id).filter(Boolean))];

    // Get performance data
    const patrols = await base44.asServiceRole.entities.PatrolSession.filter({ officer_id: employeeId });
    const incidents = await base44.asServiceRole.entities.Incident.filter({ reporter_id: employeeId });
    const violations = await base44.asServiceRole.entities.GPSViolation.filter({ officer_id: employeeId });

    // Get onboarding tasks
    const tasks = await base44.asServiceRole.entities.OnboardingTask.filter({ employee_id: employeeId });

    // Get existing training assignments
    const existingAssignments = await base44.asServiceRole.entities.TrainingAssignment.filter({ employee_id: employeeId });
    const existingCourseIds = existingAssignments.map(a => a.course_id);

    // Get all available courses
    const allCourses = await base44.asServiceRole.entities.TrainingCourse.filter({ status: "active" });
    const availableCourses = allCourses.filter(c => !existingCourseIds.includes(c.id));

    // Calculate performance metrics
    const totalPatrols = patrols.length;
    const completedPatrols = patrols.filter(p => p.status === 'completed').length;
    const avgCheckpointCompletion = totalPatrols > 0
      ? patrols.reduce((sum, p) => sum + ((p.scanned_checkpoints || 0) / (p.total_checkpoints || 1)), 0) / totalPatrols * 100
      : 0;
    const violationCount = violations.length;
    const incidentCount = incidents.length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;

    // Use AI to determine training needs
    const aiRecommendation = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analyze this security officer's profile and recommend training courses:

Employee Role: ${employee.role_type || 'officer'}
Assigned Clients: ${clientIds.length} client(s)
Sites: ${sites.map(s => s.name).join(', ')}

Performance Metrics:
- Total Patrols: ${totalPatrols}
- Completed Patrols: ${completedPatrols}
- Avg Checkpoint Completion: ${avgCheckpointCompletion.toFixed(1)}%
- GPS Violations: ${violationCount}
- Incidents Reported: ${incidentCount}
- Pending Onboarding Tasks: ${pendingTasks}

New Tasks: ${tasks.filter(t => t.status === 'pending').map(t => t.task_title).join(', ')}

Available Training Courses:
${availableCourses.map(c => `- ${c.title}: ${c.description || 'N/A'}`).join('\n')}

Based on the employee's:
1. Role and responsibilities
2. Client/site assignments
3. Performance data (checkpoint completion, violations, incidents)
4. Pending tasks

Recommend which training courses to assign and why. Consider:
- Low checkpoint completion may need "Patrol Best Practices"
- GPS violations may need "Geofencing and GPS Protocol"
- Many incidents may need "Incident Report Writing"
- New role-specific tasks may need role-based training
- Client-specific requirements

Return recommended course titles with priority (high/medium/low) and brief reason.`,
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                course_title: { type: "string" },
                priority: { type: "string" },
                reason: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Auto-assign high priority courses
    const assignments = [];
    for (const rec of aiRecommendation.recommendations) {
      if (rec.priority === 'high') {
        const course = availableCourses.find(c => c.title === rec.course_title);
        if (course) {
          const assignment = await base44.asServiceRole.entities.TrainingAssignment.create({
            course_id: course.id,
            employee_id: employeeId,
            assigned_date: new Date().toISOString(),
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
            status: "not_started"
          });
          assignments.push({
            course: course.title,
            priority: rec.priority,
            reason: rec.reason
          });
        }
      }
    }

    return Response.json({
      success: true,
      assigned: assignments.length,
      assignments: assignments,
      allRecommendations: aiRecommendation.recommendations,
      metrics: {
        totalPatrols,
        completedPatrols,
        avgCheckpointCompletion: avgCheckpointCompletion.toFixed(1),
        violations: violationCount,
        incidents: incidentCount
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});