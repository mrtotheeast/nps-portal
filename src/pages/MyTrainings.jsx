import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, CheckCircle, Clock, Play, ArrowLeft, BookOpen, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import LessonPlayer from "@/components/training/LessonPlayer";
import { toast } from "sonner";

export default function MyTrainings() {
  const queryClient = useQueryClient();
  const [activeAssignment, setActiveAssignment] = useState(null); // { assignment, training }

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["my-training-assignments", user?.id],
    queryFn: () =>
      user?.id
        ? base44.entities.TrainingAssignment.filter({ employee_id: user.id })
        : Promise.resolve([]),
    enabled: !!user?.id,
  });

  const { data: trainings = [] } = useQuery({
    queryKey: ["trainings"],
    queryFn: () => base44.entities.Training?.list?.() || Promise.resolve([]),
  });

  const completeMutation = useMutation({
    mutationFn: async ({ assignmentId, quizScore }) => {
      await base44.entities.TrainingAssignment.update(assignmentId, {
        status: "completed",
        completion_date: new Date().toISOString(),
        progress_percentage: 100,
        quiz_score: quizScore ?? null,
        final_exam_passed: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["my-training-assignments", user?.id]);
      toast.success("Training completed! 🎉");
      setActiveAssignment(null);
    },
  });

  const startMutation = useMutation({
    mutationFn: async (assignmentId) => {
      await base44.entities.TrainingAssignment.update(assignmentId, {
        status: "in_progress",
        start_date: new Date().toISOString(),
        progress_percentage: 10,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["my-training-assignments", user?.id]);
    },
  });

  if (isLoading) return <LoadingScreen />;

  const getTraining = (trainingId) => trainings.find(t => t.id === trainingId);

  // If player is active, show it full-screen
  if (activeAssignment) {
    const { assignment, training } = activeAssignment;
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="sticky top-0 z-40 bg-[#1a2b4a] text-white px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10"
            onClick={() => setActiveAssignment(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-sm">{training?.title || "Training"}</h1>
            <p className="text-xs text-slate-300">{(training?.lessons || []).length} lessons</p>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <LessonPlayer
            training={training}
            assignment={assignment}
            onComplete={() => completeMutation.mutate({ assignmentId: assignment.id })}
          />
        </div>
      </div>
    );
  }

  const completed = assignments.filter(a => a.status === "completed");
  const inProgress = assignments.filter(a => a.status === "in_progress");
  const pending = assignments.filter(a => a.status === "not_started");

  const renderCard = (assignment) => {
    const training = getTraining(assignment.training_id);
    const name = training?.title || "Unknown Training";
    const lessonCount = (training?.lessons || []).length;
    const quizCount = (training?.lessons || []).filter(l => l?.quiz?.questions?.length > 0).length;

    return (
      <Card key={assignment.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              assignment.status === "completed" ? "bg-emerald-100" :
              assignment.status === "in_progress" ? "bg-blue-100" : "bg-slate-100"
            }`}>
              {assignment.status === "completed"
                ? <CheckCircle className="w-5 h-5 text-emerald-600" />
                : assignment.status === "in_progress"
                ? <Play className="w-5 h-5 text-blue-600" />
                : <BookOpen className="w-5 h-5 text-slate-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-semibold text-slate-900">{name}</p>
                {training?.is_required && <Badge className="bg-red-100 text-red-700 text-xs">Required</Badge>}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                {lessonCount > 0 && <span>{lessonCount} lesson{lessonCount !== 1 ? "s" : ""}</span>}
                {quizCount > 0 && <span>· {quizCount} quiz{quizCount !== 1 ? "zes" : ""}</span>}
                {training?.duration_hours > 0 && <span>· {training.duration_hours}h</span>}
              </div>
              {assignment.status === "in_progress" && (
                <div className="flex items-center gap-2 mb-2">
                  <Progress value={assignment.progress_percentage || 0} className="flex-1 h-1.5" />
                  <span className="text-xs text-slate-500">{assignment.progress_percentage || 0}%</span>
                </div>
              )}
              {assignment.status === "completed" && assignment.quiz_score != null && (
                <p className="text-xs text-emerald-600">Quiz score: {assignment.quiz_score}%</p>
              )}
              {assignment.due_date && assignment.status !== "completed" && (
                <p className="text-xs text-slate-400">Due: {new Date(assignment.due_date).toLocaleDateString()}</p>
              )}
            </div>
          </div>

          {assignment.status !== "completed" && (
            <Button
              className={`mt-3 w-full ${assignment.status === "in_progress" ? "bg-blue-600 hover:bg-blue-700" : "bg-[#1a2b4a] hover:bg-[#2d4a6f]"}`}
              onClick={() => {
                if (assignment.status === "not_started") {
                  startMutation.mutate(assignment.id);
                }
                setActiveAssignment({ assignment, training });
              }}
              disabled={!training || (training?.lessons || []).length === 0}
            >
              <Play className="w-4 h-4 mr-2" />
              {assignment.status === "in_progress" ? "Continue" : "Start Training"}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="My Trainings" subtitle="Track your training progress" />
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{completed.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Completed</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{inProgress.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">In Progress</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{pending.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Not Started</p>
          </CardContent></Card>
        </div>

        {assignments.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No trainings assigned" description="Your assigned trainings will appear here." />
        ) : (
          <div className="space-y-3">
            {pending.length > 0 && (
              <>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Not Started</h3>
                {pending.map(renderCard)}
              </>
            )}
            {inProgress.length > 0 && (
              <>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-4">In Progress</h3>
                {inProgress.map(renderCard)}
              </>
            )}
            {completed.length > 0 && (
              <>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-4">Completed</h3>
                {completed.map(renderCard)}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}