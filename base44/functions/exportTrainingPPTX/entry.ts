import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.role_type !== 'manager') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { courseId } = await req.json();

    const course = await base44.asServiceRole.entities.TrainingCourse.get(courseId);

    if (!course.slides || course.slides.length === 0) {
      return Response.json({ error: 'No slides found for this training' }, { status: 400 });
    }

    // Return slides data for client to generate PowerPoint
    return Response.json({
      success: true,
      title: course.title,
      slides: course.slides,
      message: 'Slides data prepared for PowerPoint generation'
    });
  } catch (error) {
    console.error('Error exporting PowerPoint:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});