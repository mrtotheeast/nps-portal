import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Calendar, Send, CheckCircle, Clock, AlertCircle, Search, Filter, Download, Loader2, CalendarPlus } from "lucide-react";
import AdminAdvertisedClasses from "@/components/training/AdminAdvertisedClasses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";

export default function TrainingAssignments() {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const queryClient = useQueryClient();

  const { data: courses = [] } = useQuery({
    queryKey: ['training-courses'],
    queryFn: () => base44.entities.TrainingCourse.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['training-assignments'],
    queryFn: () => base44.entities.TrainingAssignment.list()
  });

  const assignMutation = useMutation({
    mutationFn: async ({ courseId, userIds, dueDate }) => {
      const currentUser = await base44.auth.me();
      const results = [];

      for (const userId of userIds) {
        const assignment = await base44.entities.TrainingAssignment.create({
          training_course_id: courseId,
          assigned_to: userId,
          assigned_by: currentUser.id,
          assigned_date: new Date().toISOString(),
          due_date: dueDate,
          status: "not_started",
          progress: 0
        });
        results.push(assignment);
      }

      await base44.functions.invoke('sendTrainingAssignmentNotification', {
        courseId,
        userIds,
        dueDate
      });

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['training-assignments']);
      toast.success("Training assigned successfully!");
      setAssignDialogOpen(false);
      setSelectedUsers([]);
      setSelectedCourse(null);
      setDueDate("");
    }
  });

  const [generatingCert, setGeneratingCert] = useState(null);

  const handleDownloadCertificate = async (assignmentId, userName) => {
    setGeneratingCert(assignmentId);
    try {
      const response = await base44.functions.invoke('generateCertificateFromTemplate', { assignmentId });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${(userName || 'trainee').replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("Certificate downloaded!");
    } catch (err) {
      toast.error("Failed to generate certificate");
    } finally {
      setGeneratingCert(null);
    }
  };

  const sendReminderMutation = useMutation({
    mutationFn: async (assignmentId) => {
      await base44.functions.invoke('sendTrainingReminder', { assignmentId });
      await base44.entities.TrainingAssignment.update(assignmentId, {
        reminder_sent: true,
        last_reminder_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['training-assignments']);
      toast.success("Reminder sent!");
    }
  });

  const handleBulkAssign = () => {
    if (!selectedCourse || selectedUsers.length === 0) {
      toast.error("Please select a course and at least one user");
      return;
    }
    if (!dueDate) {
      toast.error("Please set a due date");
      return;
    }

    assignMutation.mutate({
      courseId: selectedCourse,
      userIds: selectedUsers,
      dueDate: new Date(dueDate).toISOString()
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      case 'overdue': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const enrichedAssignments = assignments.map(assignment => {
    const course = courses.find(c => c.id === assignment.training_course_id);
    const user = users.find(u => u.id === assignment.assigned_to);
    return { ...assignment, course, user };
  });

  const filteredAssignments = enrichedAssignments.filter(a => {
    const matchesSearch = searchTerm === "" || 
      a.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.course?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || a.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleAddToCalendar = (assignment, type) => {
    const course = assignment.course;
    const title = encodeURIComponent(course?.title || "Training Assignment");
    const due = assignment.due_date ? new Date(assignment.due_date) : new Date();
    const startStr = due.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const endDate = new Date(due.getTime() + 60 * 60 * 1000);
    const endStr = endDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const details = encodeURIComponent(`Training assignment due: ${course?.title || ""}. Complete before the due date.`);

    if (type === "google") {
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}`;
      window.open(url, "_blank");
    } else {
      // Outlook / generic .ics
      const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//NPS Portal//Training//EN",
        "BEGIN:VEVENT",
        `SUMMARY:${course?.title || "Training Assignment"} Due`,
        `DTSTART:${startStr}`,
        `DTEND:${endStr}`,
        `DESCRIPTION:Training assignment due. Complete before ${due.toLocaleDateString()}.`,
        `END:VEVENT`,
        "END:VCALENDAR",
      ].join("\r\n");
      const blob = new Blob([icsContent], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `training-${(course?.title || "assignment").replace(/\s+/g, "-")}.ics`;
      a.click(); URL.revokeObjectURL(url);
    }
  };

  const groupedAssignments = {
    all: filteredAssignments,
    not_started: filteredAssignments.filter(a => a.status === 'not_started'),
    in_progress: filteredAssignments.filter(a => a.status === 'in_progress'),
    completed: filteredAssignments.filter(a => a.status === 'completed'),
    overdue: filteredAssignments.filter(a => a.status === 'overdue')
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Training Assignments"
        subtitle="Assign and track training programs"
        showBack
      />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex gap-3">
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]">
                <Users className="w-4 h-4 mr-2" />
                Assign Training
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Assign Training Program</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Select Training Course</Label>
                  <select
                    value={selectedCourse || ""}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border mt-2"
                  >
                    <option value="">Choose a course...</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.title} ({course.duration_hours}h)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Select Users</Label>
                  <div className="border rounded-lg p-4 mt-2 max-h-60 overflow-y-auto space-y-2">
                    {users.map(user => (
                      <label key={user.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span>{user.full_name}</span>
                        <Badge variant="outline" className="ml-auto text-xs">
                          {user.role_type}
                        </Badge>
                      </label>
                    ))}
                  </div>
                  <p className="text-sm text-slate-500 mt-2">
                    {selectedUsers.length} user(s) selected
                  </p>
                </div>

                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="mt-2"
                  />
                </div>

                <Button
                  onClick={handleBulkAssign}
                  disabled={assignMutation.isLoading}
                  className="w-full bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]"
                >
                  {assignMutation.isLoading ? "Assigning..." : "Assign to Selected Users"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 px-3 rounded-md border bg-white"
            >
              <option value="all">All Status</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-slate-600">Total Assigned</div>
              <div className="text-2xl font-bold">{assignments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-slate-600">Not Started</div>
              <div className="text-2xl font-bold">{groupedAssignments.not_started.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-slate-600">In Progress</div>
              <div className="text-2xl font-bold text-blue-600">{groupedAssignments.in_progress.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-slate-600">Completed</div>
              <div className="text-2xl font-bold text-green-600">{groupedAssignments.completed.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <AdminAdvertisedClasses />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All ({groupedAssignments.all.length})</TabsTrigger>
                <TabsTrigger value="not_started">Not Started ({groupedAssignments.not_started.length})</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress ({groupedAssignments.in_progress.length})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({groupedAssignments.completed.length})</TabsTrigger>
                <TabsTrigger value="overdue">Overdue ({groupedAssignments.overdue.length})</TabsTrigger>
              </TabsList>

              {Object.keys(groupedAssignments).map(status => (
                <TabsContent key={status} value={status} className="space-y-3 mt-4">
                  {groupedAssignments[status].length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      No assignments found
                    </div>
                  ) : (
                    groupedAssignments[status].map(assignment => (
                      <div key={assignment.id} className="border rounded-lg p-4 hover:bg-slate-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{assignment.course?.title || "Unknown Course"}</h3>
                              <Badge className={getStatusColor(assignment.status)}>
                                {getStatusIcon(assignment.status)}
                                <span className="ml-1">{assignment.status.replace('_', ' ')}</span>
                              </Badge>
                            </div>
                            <div className="text-sm text-slate-600 space-y-1">
                              <div>Assigned to: <strong>{assignment.user?.full_name || "Unknown User"}</strong></div>
                              <div>Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : "No date"}</div>
                              {assignment.progress > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-slate-200 rounded-full h-2">
                                    <div 
                                      className="bg-[#c9a227] h-2 rounded-full"
                                      style={{ width: `${assignment.progress}%` }}
                                    />
                                  </div>
                                  <span className="text-xs">{assignment.progress}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {assignment.status === 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-[#c9a227] text-[#1a2b4a] hover:bg-[#c9a227]/10"
                                onClick={() => handleDownloadCertificate(assignment.id, assignment.user?.full_name)}
                                disabled={generatingCert === assignment.id}
                              >
                                {generatingCert === assignment.id ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4 mr-1" />
                                )}
                                Certificate
                              </Button>
                            )}
                            {assignment.status !== 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendReminderMutation.mutate(assignment.id)}
                                disabled={sendReminderMutation.isLoading}
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Remind
                              </Button>
                            )}
                            {assignment.due_date && assignment.status !== 'completed' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Add to Google Calendar"
                                  className="text-blue-600 hover:bg-blue-50 px-2"
                                  onClick={() => handleAddToCalendar(assignment, "google")}
                                >
                                  <CalendarPlus className="w-4 h-4" />
                                  <span className="ml-1 hidden sm:inline text-xs">Google</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Add to Outlook / iCal"
                                  className="text-[#0078d4] hover:bg-blue-50 px-2"
                                  onClick={() => handleAddToCalendar(assignment, "outlook")}
                                >
                                  <CalendarPlus className="w-4 h-4" />
                                  <span className="ml-1 hidden sm:inline text-xs">Outlook</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}