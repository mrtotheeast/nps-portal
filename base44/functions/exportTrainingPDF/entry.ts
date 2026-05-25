import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { courseId, includeAnswerKey = false } = await req.json();

    const course = await base44.asServiceRole.entities.TrainingCourse.get(courseId);

    // Generate markdown content
    let markdown = `# ${course.title}\n\n`;
    markdown += `**Category:** ${course.category?.replace(/_/g, ' ')}\n`;
    markdown += `**Duration:** ${course.estimated_duration || course.duration_hours * 60} minutes\n\n`;
    markdown += `## Description\n${course.description}\n\n`;

    if (course.learning_objectives?.length > 0) {
      markdown += `## Learning Objectives\n`;
      course.learning_objectives.forEach(obj => {
        markdown += `- ${obj}\n`;
      });
      markdown += `\n`;
    }

    if (course.modules?.length > 0) {
      markdown += `## Training Modules\n\n`;
      course.modules.forEach((module, i) => {
        markdown += `### Module ${i + 1}: ${module.title}\n\n`;
        markdown += `${module.summary}\n\n`;
        if (module.content) {
          markdown += `${module.content.replace(/<[^>]*>/g, '')}\n\n`;
        }
        if (module.key_takeaways?.length > 0) {
          markdown += `**Key Takeaways:**\n`;
          module.key_takeaways.forEach(kt => {
            markdown += `- ${kt}\n`;
          });
          markdown += `\n`;
        }
      });
    }

    if (course.media_resources?.length > 0) {
      markdown += `## Resources\n\n`;
      course.media_resources.forEach(resource => {
        markdown += `- **${resource.title}** (${resource.type})\n`;
        markdown += `  ${resource.url}\n`;
        if (resource.source) markdown += `  Source: ${resource.source}\n`;
        markdown += `\n`;
      });
    }

    if (course.quiz?.questions?.length > 0 && includeAnswerKey) {
      markdown += `## Quiz Questions & Answer Key\n\n`;
      course.quiz.questions.forEach((q, i) => {
        markdown += `**Question ${i + 1}:** ${q.question}\n`;
        markdown += `Type: ${q.type} | Difficulty: ${q.difficulty}\n\n`;
        if (q.options) {
          q.options.forEach((opt, oi) => {
            markdown += `${String.fromCharCode(65 + oi)}. ${opt}`;
            if (oi === q.correct_answer) markdown += ` ✓ **CORRECT**`;
            markdown += `\n`;
          });
        }
        markdown += `\n**Explanation:** ${q.explanation}\n\n`;
      });
    }

    if (course.sources?.length > 0) {
      markdown += `## Sources & Citations\n\n`;
      course.sources.forEach(source => {
        markdown += `- ${source.title} (${source.type})\n`;
        markdown += `  ${source.url}\n\n`;
      });
    }

    return Response.json({
      success: true,
      content: markdown,
      filename: `${course.title.replace(/[^a-z0-9]/gi, '_')}.md`
    });
  } catch (error) {
    console.error('Error exporting training:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});