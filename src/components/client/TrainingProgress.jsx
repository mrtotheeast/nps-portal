import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, User, CheckCircle, Clock, AlertCircle } from "lucide-react";
import LoadingScreen from "@/components/shared/LoadingScreen";

export default function TrainingProgress({ clientId }) {
  const { data: sites = [] } = useQuery({ queryKey: ["client-sites", clientId], queryFn: () => base44.entities.Site.filter({ client_id: clientId }) });

  const { data: shifts = [] } = useQuery({
    queryKey: ["client-shifts"],
    queryFn: async () => {
      const siteIds = sites.map(s => s.id);
      if (siteIds.length === 0) return [];
      const allShifts = await base44.entities.Shift.list();
      return allShifts.filter(shift => siteIds.includes(shift.site_id));
    },
    enabled: sites.length > 0
  });

  const employeeIds = [...new Set(shifts.map(s => s.employee_id).filter(Boolean))];

  const { data: employees = [] } = useQuery({
    queryKey: ["client-employees", employeeIds],
    queryFn: async () => {
      if (employeeIds.length === 0) return [];
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => employeeIds.includes(u.id));
    },
    enabled: employeeIds.length > 0
  });

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["client-training-assignments", employeeIds],
    queryFn: async () => {
      if (employeeIds.length === 0) return [];
      const allAssignments = await base44.entities.TrainingAssignment.list();
      return allAssignments.filter(a => employeeIds.includes(a.employee_id));
    },
    enabled: employeeIds.length > 0
  });

  const { data: courses = [] } = useQuery({ queryKey: ["training-courses"], queryFn: () => base44.entities.TrainingCourse.list() });

  if (isLoading) return <LoadingScreen message="Loading training data..." />;

  const getStatusBadge = (status) => {
    const config = {
      not_started: { color: "bg-slate-100 text-slate-700", icon: Clock, label: "Not Started" },
      in_progress: { color: "bg-blue-100 text-blue-700", icon: Clock, label: "In Progress" },
      completed: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle, label: "Completed" }
    };
    const { color, icon: Icon, label } = config[status] || config.not_started;
    return <Badge className={color}><Icon className="w-3 h-3 mr-1" />{label}</Badge>;
  };

  const employeeProgress = employees.map(emp => {
    const empAssignments = assignments.filter(a => a.employee_id === emp.id);
    const completed = empAssignments.filter(a => a.status === 'completed').length;
    const total = empAssignments.length;
    return { employee: emp, assignments: empAssignments, completed, total, progress: total > 0 ? (completed / total) * 100 : 0 };
  });

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5" />Training Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg"><p className="text-sm text-slate-500">Total Employees</p><p className="text-2xl font-bold">{employees.length}</p></div>
            <div className="text-center p-4 bg-blue-50 rounded-lg"><p className="text-sm text-slate-500">Active Training</p><p className="text-2xl font-bold">{assignments.filter(a => a.status === 'in_progress').length}</p></div>
            <div className="text-center p-4 bg-emerald-50 rounded-lg"><p className="text-sm text-slate-500">Completed</p><p className="text-2xl font-bold">{assignments.filter(a => a.status === 'completed').length}</p></div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Employee Training Progress</h3>
        {employeeProgress.map(({ employee, assignments: empAssignments, completed, total, progress }) => (
          <Card key={employee.id} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1a2b4a] text-white flex items-center justify-center"><User className="w-5 h-5" /></div>
                  <div><p className="font-semibold">{employee.full_name}</p><p className="text-sm text-slate-500">{employee.role_type}</p></div>
                </div>
                <div className="text-right"><p className="text-sm font-semibold">{completed} / {total} Completed</p><Progress value={progress} className="w-32 mt-1" /></div>
              </div>
              {empAssignments.length > 0 ? (
                <div className="space-y-2">
                  {empAssignments.map(assignment => {
                    const course = courses.find(c => c.id === assignment.course_id);
                    return (
                      <div key={assignment.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <div className="flex-1"><p className="text-sm font-medium">{course?.title || 'Unknown Course'}</p>{assignment.progress > 0 && <Progress value={assignment.progress} className="w-full mt-1 h-1" />}</div>
                        <div className="ml-4">{getStatusBadge(assignment.status)}</div>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="text-center py-4 text-sm text-slate-500">No training assigned yet</div>}
            </CardContent>
          </Card>
        ))}
        {employeeProgress.length === 0 && (
          <Card className="shadow-sm"><CardContent className="p-8 text-center text-slate-500"><AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-400" /><p>No employees assigned to your sites yet</p></CardContent></Card>
        )}
      </div>
    </div>
  );
}