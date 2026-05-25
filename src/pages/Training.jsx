import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { GraduationCap, Play, CheckCircle, Clock, ChevronRight, Award, BookOpen, AlertCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import TrainingBookingTab from "@/components/training/TrainingBookingTab";

export default function Training() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ["my-training", user?.id],
    queryFn: () => base44.entities.TrainingAssignment.filter({ employee_id: user?.id }),
    enabled: !!user?.id,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => base44.entities.TrainingCourse.filter({ status: "active" }),
  });

  const getCourseById = (id) => courses.find(c => c.id === id);

  const assignedCourses = assignments.filter(a => a.status === "not_started");
  const inProgressCourses = assignments.filter(a => a.status === "in_progress");
  const completedCourses = assignments.filter(a => a.status === "completed");

  const getStatusBadge = (status) => {
    const styles = {
      not_started: "bg-slate-100 text-slate-700",
      in_progress: "bg-blue-100 text-blue-700",
      completed: "bg-emerald-100 text-emerald-700"
    };
    const labels = {
      not_started: "Not Started",
      in_progress: "In Progress",
      completed: "Completed"
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  if (loadingAssignments) return <LoadingScreen />;

  const renderCourseList = (assignmentList) => (
    assignmentList.length > 0 ? (
      <div className="space-y-3">
        {assignmentList.map((assignment) => {
          const course = getCourseById(assignment.course_id);
          if (!course) return null;

          return (
            <Card 
              key={assignment.id}
              className="shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    assignment.status === "completed" ? "bg-emerald-100" :
                    assignment.status === "in_progress" ? "bg-blue-100" : "bg-slate-100"
                  }`}>
                    {assignment.status === "completed" ? (
                      <CheckCircle className="w-6 h-6 text-emerald-600" />
                    ) : assignment.status === "in_progress" ? (
                      <Play className="w-6 h-6 text-blue-600" />
                    ) : (
                      <BookOpen className="w-6 h-6 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{course.title}</p>
                      {course.is_required && (
                        <Badge className="bg-red-100 text-red-700 text-xs">Required</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-2">
                      {course.description || "No description"}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {course.duration_hours || 0}h
                      </div>
                      {getStatusBadge(assignment.status)}
                    </div>

                    {assignment.status === "in_progress" && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{assignment.progress || 0}%</span>
                        </div>
                        <Progress value={assignment.progress || 0} className="h-2" />
                      </div>
                    )}

                    {assignment.status === "completed" && assignment.completed_date && (
                      <p className="text-sm text-emerald-600 mt-2">
                        Completed on {format(new Date(assignment.completed_date), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                </div>

                <div className="mt-4 flex gap-2">
                  {assignment.status === "not_started" && (
                    <Button className="bg-[#1a2b4a] hover:bg-[#2d4a6f] w-full">
                      <Play className="w-4 h-4 mr-2" />
                      Start Course
                    </Button>
                  )}
                  {assignment.status === "in_progress" && (
                    <Button className="bg-blue-600 hover:bg-blue-700 w-full">
                      <Play className="w-4 h-4 mr-2" />
                      Continue
                    </Button>
                  )}
                  {assignment.status === "completed" && assignment.certificate_url && (
                    <Button variant="outline" className="w-full">
                      <Award className="w-4 h-4 mr-2" />
                      View Certificate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    ) : (
      <EmptyState 
        icon={GraduationCap}
        title="No courses"
        description="No courses in this category"
      />
    )
  );

  const totalCourses = assignments.length;
  const completedCount = completedCourses.length;
  const requiredCourses = assignments.filter(a => {
    const course = getCourseById(a.course_id);
    return course?.is_required;
  });
  const completedRequired = requiredCourses.filter(a => a.status === "completed").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader 
        title="Training" 
        subtitle="Complete required courses"
        showBack
      />

      <div className="max-w-3xl mx-auto px-4 py-6">
        <Card className="mb-6 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold">Training Progress</p>
                <p className="text-sm text-slate-500">
                  {completedCount} of {totalCourses} courses completed
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-[#c9a227]">
                  {totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 100}%
                </p>
              </div>
            </div>
            <Progress 
              value={totalCourses > 0 ? (completedCount / totalCourses) * 100 : 100} 
              className="h-3"
            />
            
            {requiredCourses.length > 0 && completedRequired < requiredCourses.length && (
              <div className="flex items-center gap-2 mt-4 p-3 bg-amber-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <p className="text-sm text-amber-800">
                  {requiredCourses.length - completedRequired} required course(s) remaining
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="assigned">
          <TabsList className="mb-6 w-full">
            <TabsTrigger value="assigned" className="flex-1 text-xs sm:text-sm">
              Assigned ({assignedCourses.length})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="flex-1 text-xs sm:text-sm">
              In Progress ({inProgressCourses.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-1 text-xs sm:text-sm">
              Completed ({completedCourses.length})
            </TabsTrigger>
            <TabsTrigger value="book" className="flex-1 text-xs sm:text-sm flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Schedule</span>
              <span className="sm:hidden">Book</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assigned">{renderCourseList(assignedCourses)}</TabsContent>
          <TabsContent value="in_progress">{renderCourseList(inProgressCourses)}</TabsContent>
          <TabsContent value="completed">{renderCourseList(completedCourses)}</TabsContent>
          <TabsContent value="book">
            <TrainingBookingTab user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}