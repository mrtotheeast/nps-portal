import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  User, Mail, Phone, MapPin, Briefcase, Calendar, Loader2, Save,
  Award, AlertCircle, GraduationCap, Eye, Lock, LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";
import { format, parseISO, differenceInDays } from "date-fns";

export default function EmployeeProfile() {
  const params = new URLSearchParams(window.location.search);
  const empId = params.get("id");
  const viewerRole = params.get("viewer"); // "supervisor" = limited edit mode
  const isSupervisorView = viewerRole === "supervisor";
  // Supervisors can edit basic info but NOT pay rate, role, or system fields
  const isSupervisorSensitive = isSupervisorView; // alias for clarity below

  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [supervisorNotes, setSupervisorNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const queryClient = useQueryClient();

  const { data: employee, isLoading } = useQuery({
    queryKey: ["employee", empId],
    queryFn: async () => {
      if (!empId) return null;
      const emps = await base44.entities.Employee.filter({ id: empId });
      return emps[0];
    },
    enabled: !!empId,
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ["credentials", empId],
    queryFn: () => empId ? base44.entities.Credential.filter({ employee_id: empId }) : [],
    enabled: !!empId,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: () => base44.entities.Site.list(),
  });

  const { data: supervisors = [] } = useQuery({
    queryKey: ["supervisors-list"],
    queryFn: async () => {
      const emps = await base44.entities.Employee.filter({ status: "active" });
      return emps.filter(e => ["supervisor", "manager", "admin"].includes(e.role));
    },
  });

  const { data: trainingAssignments = [] } = useQuery({
    queryKey: ["training-assignments", empId],
    queryFn: () => base44.entities.TrainingAssignment.filter({ employee_id: empId }),
    enabled: !!empId,
  });

  const { data: trainings = [] } = useQuery({
    queryKey: ["trainings-list"],
    queryFn: () => base44.entities.Training.list(),
  });

  const { data: currentViewer } = useQuery({
    queryKey: ["current-viewer-user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: viewerEmployee } = useQuery({
    queryKey: ["viewer-employee-record", currentViewer?.email],
    queryFn: async () => {
      const emps = await base44.entities.Employee.filter({ email: currentViewer.email });
      return emps[0] || null;
    },
    enabled: !!currentViewer?.email,
  });

  const viewerAppRole = viewerEmployee?.role || currentViewer?.role_type || currentViewer?.role;

  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (employee) {
      setFormData(employee);
      setSupervisorNotes(employee.supervisor_notes || "");
    }
  }, [employee]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.update(empId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["employee", empId]);
      setEditMode(false);
      toast.success("Profile updated");
    },
  });

  if (isLoading) return <LoadingScreen />;
  if (!employee) return <div className="p-8 text-center text-slate-500">Employee not found.</div>;

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleSaveSupervisorNotes = async () => {
    setSavingNotes(true);
    await base44.entities.Employee.update(empId, { supervisor_notes: supervisorNotes });
    queryClient.invalidateQueries(["employee", empId]);
    setSavingNotes(false);
    toast.success("Supervisor notes saved");
  };

  const probationEndDate = employee?.probationEndDate ? parseISO(employee.probationEndDate) : null;
  const inProbation = probationEndDate && new Date() < probationEndDate;
  const daysRemaining = inProbation ? differenceInDays(probationEndDate, new Date()) : 0;
  const employeeSites = employee?.siteIds?.map(id => sites.find(s => s.id === id)?.name).filter(Boolean) || [];
  const assignedSupervisor = supervisors.find(s => s.id === employee.supervisor_id);

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Employee Profile"
        subtitle={`${employee?.firstName} ${employee?.lastName}`}
        showBack
      />

      {isSupervisorView && (
        <div className="max-w-4xl mx-auto px-4 pt-4 space-y-2">
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 flex-shrink-0" />
              Supervisor view — pay rate, role, and system settings are hidden.
            </div>
            {viewerAppRole === "supervisor" && (
              <Button
                size="sm"
                className="bg-[#1a2b4a] hover:bg-[#2d4a6f] text-white ml-3 flex-shrink-0"
                onClick={() => navigate(createPageUrl("SupervisorDashboard"))}
              >
                <LayoutDashboard className="w-4 h-4 mr-1" /> My Dashboard
              </Button>
            )}
            {(viewerAppRole === "manager" || viewerAppRole === "admin") && (
              <Button
                size="sm"
                className="bg-[#1a2b4a] hover:bg-[#2d4a6f] text-white ml-3 flex-shrink-0"
                onClick={() => navigate(createPageUrl("AdminDashboard"))}
              >
                <LayoutDashboard className="w-4 h-4 mr-1" /> My Dashboard
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">PTO Balance</p>
              <p className="text-2xl font-bold text-[#1a2b4a]">{(employee?.ptoBalance || 0).toFixed(1)}h</p>
            </CardContent>
          </Card>
          {!isSupervisorView && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 mb-1">Employment Type</p>
                <Badge className="bg-[#c9a227] text-[#1a2b4a]">{employee?.employmentClassification || 'N/A'}</Badge>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Status</p>
              <Badge className={employee?.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                {employee?.status || "active"}
              </Badge>
            </CardContent>
          </Card>
          {inProbation && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <p className="text-xs text-amber-600 mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Probation
                </p>
                <p className="text-lg font-bold text-amber-700">{daysRemaining} days</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Personal Information */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Personal Information</CardTitle>
            {!editMode && (
              <Button variant="outline" onClick={() => setEditMode(true)}>Edit</Button>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input value={formData.firstName || ""} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} disabled={!editMode} />
                </div>
                <div>
                  <Label>Middle Name</Label>
                  <Input value={formData.middleName || ""} onChange={(e) => setFormData({ ...formData, middleName: e.target.value })} disabled={!editMode} />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input value={formData.lastName || ""} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} disabled={!editMode} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" value={formData.dateOfBirth || ""} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} disabled={!editMode} />
                </div>
                <div>
                  <Label>Hire Date</Label>
                  <Input type="date" value={formData.hireDate || ""} onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })} disabled={!editMode} />
                </div>
              </div>

              <div>
                <Label>Street Address</Label>
                <Input value={formData.address?.street || ""} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })} disabled={!editMode} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>City</Label>
                  <Input value={formData.address?.city || ""} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })} disabled={!editMode} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={formData.address?.state || ""} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })} disabled={!editMode} />
                </div>
                <div>
                  <Label>ZIP Code</Label>
                  <Input value={formData.address?.zip || ""} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, zip: e.target.value } })} disabled={!editMode} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} disabled={!editMode} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={formData.phoneNumber || ""} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} disabled={!editMode} />
                </div>
              </div>

              {editMode && (
                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => { setEditMode(false); setFormData(employee); }}>Cancel</Button>
                  <Button className="bg-[#1a2b4a]" disabled={updateMutation.isPending}>
                    {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader><CardTitle>Emergency Contact</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Name:</span> {employee?.emergencyContactName || 'N/A'}</p>
              <p><span className="font-medium">Phone:</span> {employee?.emergencyContactPhone || 'N/A'}</p>
              <p><span className="font-medium">Relationship:</span> {employee?.emergencyContactRelation || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Work Assignment */}
        <Card>
          <CardHeader><CardTitle>Work Assignment</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-slate-500 text-xs uppercase tracking-wide mb-1">Role</p>
                <Badge className="capitalize">{employee?.role || 'N/A'}</Badge>
              </div>
              <div>
                <p className="font-medium text-slate-500 text-xs uppercase tracking-wide mb-1">Position Title</p>
                <p className="text-slate-800">{employee?.positionTitle || 'N/A'}</p>
              </div>
              <div>
                <p className="font-medium text-slate-500 text-xs uppercase tracking-wide mb-1">Assigned Sites</p>
                <p className="text-slate-800">{employeeSites.length > 0 ? employeeSites.join(", ") : 'None'}</p>
              </div>
              <div>
                <p className="font-medium text-slate-500 text-xs uppercase tracking-wide mb-1">Assigned Supervisor</p>
                <p className="text-slate-800">
                  {assignedSupervisor
                    ? `${assignedSupervisor.firstName} ${assignedSupervisor.lastName}`
                    : 'Unassigned'}
                </p>
              </div>
            </div>

            {/* Assigned Supervisor field — admin only */}
            {!isSupervisorView && (
              <div className="pt-3 border-t">
                <Label>Assigned Supervisor</Label>
                <Select
                  value={formData.supervisor_id || "none"}
                  onValueChange={(val) => {
                    const newVal = val === "none" ? null : val;
                    setFormData({ ...formData, supervisor_id: newVal });
                    base44.entities.Employee.update(empId, { supervisor_id: newVal })
                      .then(() => {
                        queryClient.invalidateQueries(["employee", empId]);
                        toast.success("Supervisor assignment saved");
                      });
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select supervisor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Unassigned —</SelectItem>
                    {supervisors.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Pay rate — hidden from supervisor */}
            {!isSupervisorView && (
              <div className="pt-3 border-t grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Base Hourly Rate</p>
                  <p className="text-slate-800">${(employee?.baseHourlyRate || 0).toFixed(2)}/hr</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Max Hours/Week</p>
                  <p className="text-slate-800">{employee?.maxHours || 40} hrs</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supervisor Notes — visible to supervisors and admins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-500" />
              Supervisor Notes
              <Badge variant="outline" className="text-xs ml-auto">Supervisor & Admin only</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={supervisorNotes}
              onChange={e => setSupervisorNotes(e.target.value)}
              placeholder="Add private notes about this employee (visible only to supervisors and admins)..."
              rows={3}
            />
            <Button
              size="sm"
              className="bg-[#1a2b4a] hover:bg-[#2d4a6f]"
              onClick={handleSaveSupervisorNotes}
              disabled={savingNotes}
            >
              {savingNotes ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Notes
            </Button>
          </CardContent>
        </Card>

        {/* Credentials */}
        {credentials.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" /> Credentials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {credentials.map((cred) => (
                  <div key={cred.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium">{cred.credential_name}</p>
                      {cred.expiry_date && (
                        <p className="text-xs text-slate-500">Expires: {format(parseISO(cred.expiry_date), 'MMM dd, yyyy')}</p>
                      )}
                    </div>
                    <Badge className={cred.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                      {cred.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Training Progress */}
        {trainingAssignments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-purple-600" /> Training Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trainingAssignments.map((assignment) => {
                  const course = trainings.find(t => t.id === assignment.training_id);
                  const progress = assignment.progress_percentage || 0;
                  const statusColors = {
                    completed: "bg-emerald-100 text-emerald-700",
                    in_progress: "bg-blue-100 text-blue-700",
                    not_started: "bg-slate-100 text-slate-600",
                    overdue: "bg-red-100 text-red-700",
                  };
                  return (
                    <div key={assignment.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{course?.title || course?.name || "Unknown Course"}</p>
                        <Badge className={statusColors[assignment.status] || statusColors.not_started}>
                          {(assignment.status || "not_started").replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={progress} className="h-2 flex-1" />
                        <span className="text-xs text-slate-500 w-8 text-right">{progress}%</span>
                      </div>
                      {assignment.due_date && (
                        <p className="text-xs text-slate-400">Due: {format(parseISO(assignment.due_date), "MMM d, yyyy")}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}