import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { userId, assignmentId, eventType } = await req.json();

    // Get assignment details
    const assignment = await base44.asServiceRole.entities.TrainingAssignment.get(assignmentId);
    
    // Get all badges
    const badges = await base44.asServiceRole.entities.TrainingBadge.filter({ is_active: true });

    // Check which badges to award
    const badgesToAward = [];

    for (const badge of badges) {
      const criteria = badge.criteria;
      let shouldAward = false;

      switch (criteria.type) {
        case 'module_completion':
          if (assignment.progress >= criteria.threshold) {
            shouldAward = true;
          }
          break;
        case 'high_score':
          if (assignment.final_exam_score >= criteria.threshold) {
            shouldAward = true;
          }
          break;
        case 'perfect_score':
          if (assignment.final_exam_score === 100) {
            shouldAward = true;
          }
          break;
        case 'early_completion':
          const dueDate = new Date(assignment.due_date);
          const completedDate = new Date(assignment.completed_at);
          const daysEarly = (dueDate - completedDate) / (1000 * 60 * 60 * 24);
          if (daysEarly >= criteria.threshold) {
            shouldAward = true;
          }
          break;
      }

      if (shouldAward) {
        // Check if already earned
        const existing = await base44.asServiceRole.entities.UserBadge.filter({
          user_id: userId,
          badge_id: badge.id
        });

        if (existing.length === 0) {
          badgesToAward.push(badge);
        }
      }
    }

    // Award badges and points
    let totalPointsAwarded = 0;

    for (const badge of badgesToAward) {
      await base44.asServiceRole.entities.UserBadge.create({
        user_id: userId,
        badge_id: badge.id,
        earned_at: new Date().toISOString(),
        training_assignment_id: assignmentId
      });

      totalPointsAwarded += badge.points_value || 0;
    }

    // Update user points
    const userPoints = await base44.asServiceRole.entities.UserTrainingPoints.filter({ user_id: userId });
    
    if (userPoints.length === 0) {
      await base44.asServiceRole.entities.UserTrainingPoints.create({
        user_id: userId,
        total_points: totalPointsAwarded,
        points_history: [{
          points: totalPointsAwarded,
          reason: `Earned badges: ${badgesToAward.map(b => b.name).join(', ')}`,
          assignment_id: assignmentId,
          earned_at: new Date().toISOString()
        }]
      });
    } else {
      const current = userPoints[0];
      await base44.asServiceRole.entities.UserTrainingPoints.update(current.id, {
        total_points: current.total_points + totalPointsAwarded,
        points_history: [
          ...(current.points_history || []),
          {
            points: totalPointsAwarded,
            reason: `Earned badges: ${badgesToAward.map(b => b.name).join(', ')}`,
            assignment_id: assignmentId,
            earned_at: new Date().toISOString()
          }
        ]
      });
    }

    // Send notification
    if (badgesToAward.length > 0) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: userId,
        title: "New Badge Earned!",
        message: `Congratulations! You earned: ${badgesToAward.map(b => b.name).join(', ')}`,
        type: "training",
        priority: "normal"
      });
    }

    return Response.json({
      success: true,
      badges_awarded: badgesToAward.map(b => b.name),
      points_awarded: totalPointsAwarded
    });
  } catch (error) {
    console.error('Error awarding badge:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});