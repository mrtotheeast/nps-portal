import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Users, GraduationCap, Loader2, TrendingUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";

export default function TrainingSuggestions() {
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [suggestions, setSuggestions] = useState(null);

  const { data: employees = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["training-courses"],
    queryFn: () => base44.entities.TrainingCourse.filter({ status: "active" }),
  });

  const generateSuggestionsMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('suggestTraining', {
        employeeId: selectedEmployee
      });
      return response.data;
    },
    onSuccess: (data) => {
      setSuggestions(data);
    }
  });

  const assignTrainingMutation = useMutation({
    mutationFn: async (courseTitle) => {
      const course = courses.find(c => c.title === courseTitle);
      if (course) {
        return base44.entities.TrainingAssignment.create({
          course_id: course.id,
          employee_id: selectedEmployee,
          assigned_date: new Date().toISOString(),
          status: "not_started"
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["training-assignments"]);
      alert("Training assigned successfully!");
    }
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="AI Training Suggestions"
        subtitle="Get AI-powered training recommendations based on performance"
        showBack
      />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card className="shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Select Employee
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an employee..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name} - {emp.role_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={() => generateSuggestionsMutation.mutate()}
              disabled={!selectedEmployee || generateSuggestionsMutation.isLoading}
              className="w-full bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]"
            >
              {generateSuggestionsMutation.isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate AI Suggestions
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {suggestions && (
          <>
            <Card className="shadow-sm mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">Checkpoint Completion</p>
                    <p className="text-2xl font-bold">{suggestions.metrics?.avgCheckpointCompletion || "N/A"}</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">GPS Violations</p>
                    <p className="text-2xl font-bold">{suggestions.metrics?.gpsViolations || 0}</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">Incidents Reported</p>
                    <p className="text-2xl font-bold">{suggestions.metrics?.incidentsReported || 0}</p>
                  </div>
                </div>
                {suggestions.assessment && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900 mb-2">AI Assessment:</p>
                    <p className="text-sm text-blue-800">{suggestions.assessment}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Recommended Training
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {suggestions.suggestions?.map((suggestion, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{suggestion.course_title}</h3>
                            <Badge className={
                              suggestion.priority === 'high' ? 'bg-red-100 text-red-700' :
                              suggestion.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-blue-100 text-blue-700'
                            }>
                              {suggestion.priority} priority
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">{suggestion.reason}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => assignTrainingMutation.mutate(suggestion.course_title)}
                        disabled={assignTrainingMutation.isLoading}
                        className="bg-[#1a2b4a] hover:bg-[#2d4a6f]"
                      >
                        Assign Training
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}