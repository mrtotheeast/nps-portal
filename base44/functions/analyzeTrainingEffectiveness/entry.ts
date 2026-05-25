import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if ((user?.role !== 'admin' && user?.role_type !== 'admin' && user?.role_type !== 'manager')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all training data
    const [moduleProgress, quizAttempts, courses] = await Promise.all([
      base44.asServiceRole.entities.TrainingModuleProgress.list(),
      base44.asServiceRole.entities.QuizAttempt.list(),
      base44.asServiceRole.entities.TrainingCourse.list()
    ]);

    // Analyze module completion rates
    const moduleAnalysis = {};
    moduleProgress.forEach(progress => {
      const key = `${progress.course_id}_${progress.module_index}`;
      if (!moduleAnalysis[key]) {
        moduleAnalysis[key] = {
          course_id: progress.course_id,
          module_index: progress.module_index,
          module_title: progress.module_title,
          total_attempts: 0,
          completed: 0,
          avg_time: 0,
          total_time: 0
        };
      }
      moduleAnalysis[key].total_attempts++;
      if (progress.status === 'completed') {
        moduleAnalysis[key].completed++;
        moduleAnalysis[key].total_time += progress.time_spent_minutes || 0;
      }
    });

    // Calculate averages
    Object.values(moduleAnalysis).forEach(module => {
      module.completion_rate = (module.completed / module.total_attempts * 100).toFixed(1);
      module.avg_time = module.completed > 0 ? (module.total_time / module.completed).toFixed(1) : 0;
    });

    // Analyze quiz performance by type and difficulty
    const quizAnalysis = {
      by_type: {},
      by_difficulty: {},
      problematic_questions: []
    };

    const questionStats = {};

    quizAttempts.forEach(attempt => {
      attempt.responses?.forEach(response => {
        // By type
        if (!quizAnalysis.by_type[response.question_type]) {
          quizAnalysis.by_type[response.question_type] = { total: 0, correct: 0 };
        }
        quizAnalysis.by_type[response.question_type].total++;
        if (response.is_correct) quizAnalysis.by_type[response.question_type].correct++;

        // By difficulty
        if (!quizAnalysis.by_difficulty[response.difficulty]) {
          quizAnalysis.by_difficulty[response.difficulty] = { total: 0, correct: 0 };
        }
        quizAnalysis.by_difficulty[response.difficulty].total++;
        if (response.is_correct) quizAnalysis.by_difficulty[response.difficulty].correct++;

        // Track individual questions
        const qKey = response.question_id || response.question_text;
        if (!questionStats[qKey]) {
          questionStats[qKey] = {
            question_text: response.question_text,
            type: response.question_type,
            difficulty: response.difficulty,
            total_attempts: 0,
            correct: 0
          };
        }
        questionStats[qKey].total_attempts++;
        if (response.is_correct) questionStats[qKey].correct++;
      });
    });

    // Find problematic questions (< 50% correct rate with at least 5 attempts)
    Object.entries(questionStats).forEach(([qKey, stats]) => {
      const correctRate = (stats.correct / stats.total_attempts * 100);
      if (correctRate < 50 && stats.total_attempts >= 5) {
        quizAnalysis.problematic_questions.push({
          ...stats,
          correct_rate: correctRate.toFixed(1)
        });
      }
    });

    // Calculate percentages for type/difficulty
    Object.keys(quizAnalysis.by_type).forEach(type => {
      const data = quizAnalysis.by_type[type];
      data.success_rate = (data.correct / data.total * 100).toFixed(1);
    });

    Object.keys(quizAnalysis.by_difficulty).forEach(diff => {
      const data = quizAnalysis.by_difficulty[diff];
      data.success_rate = (data.correct / data.total * 100).toFixed(1);
    });

    // Analyze final exam trends over time
    const finalExamTrends = quizAttempts
      .filter(attempt => attempt.is_final_exam)
      .sort((a, b) => new Date(a.attempted_at) - new Date(b.attempted_at))
      .reduce((acc, attempt) => {
        const month = new Date(attempt.attempted_at).toISOString().slice(0, 7);
        if (!acc[month]) {
          acc[month] = { total: 0, passed: 0, avg_score: 0, total_score: 0 };
        }
        acc[month].total++;
        if (attempt.passed) acc[month].passed++;
        acc[month].total_score += attempt.score;
        return acc;
      }, {});

    Object.keys(finalExamTrends).forEach(month => {
      const data = finalExamTrends[month];
      data.pass_rate = (data.passed / data.total * 100).toFixed(1);
      data.avg_score = (data.total_score / data.total).toFixed(1);
    });

    return Response.json({
      success: true,
      module_analysis: Object.values(moduleAnalysis),
      quiz_analysis: quizAnalysis,
      final_exam_trends: finalExamTrends
    });
  } catch (error) {
    console.error('Error analyzing training effectiveness:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});