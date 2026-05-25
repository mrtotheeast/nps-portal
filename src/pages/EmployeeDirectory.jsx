import React, { useState, useCallback, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantFilter } from "@/hooks/useTenantFilter";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Users, Search, Plus, Edit, Trash2, Mail, Phone,
  Loader2, Upload, List, Grid3x3, Key, Shield, Send,
  Check, X, RefreshCw, GraduationCap, UserCheck, UsersRound, LayoutDashboard
} from "lucide-react";
import {
  isOfficer, isSupervisor, isOfficeStaff, isEmployee, isAdminRole, isActive,
  getOfficers, getSupervisors, getOfficeStaff, getAdmins, getActiveEmployees
} from "@/lib/employeeQueries";

// Alias: getEmployees = getOfficeStaff (role === "employee")
const getEmployees = getOfficeStaff;
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import EditEmployeeDialog from "@/components/employees/EditEmployeeDialog";
import ChangePasswordModal from "@/components/shared/ChangePasswordModal";
import EmployeeDetailDialog from "@/components/employees/EmployeeDetailDialog";
import EmployeeOffboardingDialog from "@/components/employees/EmployeeOffboardingDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Per-employee, per-action button state ────────────────────────────────────
function useButtonStates() {
  const [states, setStates] = useState({});
  const getState = (id, action) => states[`${id}_${action}`] || "idle";
  const run = useCallback(async (id, action, asyncFn) => {
    const key = `${id}_${action}`;
    setStates(s => ({ ...s, [key]: "loading" }));
    try {
      await asyncFn();
      setStates(s => ({ ...s, [key]: "success" }));
      setTimeout(() => setStates(s => { const n = { ...s }; delete n[key]; return n; }), 3000);
    } catch (err) {
      setStates(s => ({ ...s, [key]: "error" }));
      setTimeout(() => setStates(s => { const n = { ...s }; delete n[key]; return n; }), 3000);
      throw err;
    }
  }, []);
  return { getState, run };
}

function EmpButton({ state, icon: Icon, title, onClick, className }) {
  const isLoading = state === "loading";
  const isSuccess = state === "success";
  const isError = state === "error";
  return (
    <Button
      variant="ghost"
      size="icon"
      title={title}
      disabled={isLoading || isSuccess || isError}
      onClick={onClick}
      className={cn(
        "h-8 w-8 transition-colors duration-200",
        isSuccess ? "text-emerald-600 bg-emerald-50" : isError ? "text-red-600 bg-red-50" : className
      )}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> :
       isSuccess ? <Check className="w-4 h-4" /> :
       isError   ? <X className="w-4 h-4" /> :
       <Icon className="w-4 h-4" />}
    </Button>
  );
}

// ─── Map URL filter param → dropdown display value ────────────────────────────
function filterParamToDropdown(param) {
  if (param === "officers")    return "officers";
  if (param === "supervisors") return "supervisors";
  if (param === "officestaff") return "officestaff";
  if (param === "admin")       return "admin";
  if (param === "active")      return "active";
  return "all";
}

// ─── Apply filter to employees using the EXACT same logic as employeeQueries.js ──
function applyFilter(employees, filterParam, search, positions, sites) {
  let result = employees;

  if (filterParam === "officers") {
    result = getOfficers(employees);
  } else if (filterParam === "supervisors") {
    result = getSupervisors(employees);
  } else if (filterParam === "officestaff") {
    result = getEmployees(employees); // role === "employee"
  } else if (filterParam === "admin") {
    result = getAdmins(employees);
  } else if (filterParam === "active") {
    result = getActiveEmployees(employees);
  }
  // "all" → no filter, show everyone

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(emp => {
      const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase();
      const position = positions.find(p => p.id === emp.positionId);
      const positionName = position?.title?.toLowerCase() || position?.name?.toLowerCase() || "";
      const empSites = (emp.siteIds || []).map(sid => sites.find(s => s.id === sid)?.name?.toLowerCase() || "").join(" ");
      return (
        fullName.includes(q) || emp.email?.toLowerCase().includes(q) ||
        positionName.includes(q) || empSites.includes(q) ||
        (emp.positionTitle || "").toLowerCase().includes(q)
      );
    });
  }

  return result;
}

export default function EmployeeDirectory() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tenantFilter = useTenantFilter();

  // Read filter from URL — this is the source of truth
  const urlParams = new URLSearchParams(location.search);
  const filterParam = urlParams.get("filter") || "all";

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("card");
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [detailEmployee, setDetailEmployee] = useState(null);
  const [saving, setSaving] = useState(false);
  const [roleEmployee, setRoleEmployee] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [changePwdEmployee, setChangePwdEmployee] = useState(null);
  const [offboardingEmployee, setOffboardingEmployee] = useState(null);
  const [savingRole, setSavingRole] = useState(false);
  const [roleSaved, setRoleSaved] = useState(false);
  const [showBulkTraining, setShowBulkTraining] = useState(false);
  const [showBulkStatus, setShowBulkStatus] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkTrainingId, setBulkTrainingId] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkSupervisorId, setBulkSupervisorId] = useState("");
  const [bulkManagerId, setBulkManagerId] = useState("");
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [showAssignTraining, setShowAssignTraining] = useState(false);
  const [trainingToAssign, setTrainingToAssign] = useState("");

  // New bulk action state
  const [showBulkMessage, setShowBulkMessage] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");
  const [showBulkRole, setShowBulkRole] = useState(false);
  const [bulkRole, setBulkRole] = useState("");
  const [showBulkTerminate, setShowBulkTerminate] = useState(false);
  const [terminateConfirmText, setTerminateConfirmText] = useState("");

  const { getState, run } = useButtonStates();

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: currentUserEmployee } = useQuery({
    queryKey: ["current-user-employee", currentUser?.email],
    queryFn: async () => {
      const emps = await base44.entities.Employee.filter({ email: currentUser.email });
      return emps[0] || null;
    },
    enabled: !!currentUser?.email,
  });

  const currentUserRole = currentUserEmployee?.role || currentUser?.role_type || currentUser?.role;

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees-all", tenantFilter],
    queryFn: () => base44.entities.Employee.filter(tenantFilter, "-created_date", 2000),
    staleTime: 300000,
    enabled: !!tenantFilter.company_id,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites", tenantFilter],
    queryFn: () => base44.entities.Site.filter(tenantFilter),
    enabled: !!tenantFilter.company_id,
  });

  const { data: positions = [] } = useQuery({
    queryKey: ["positions"],
    queryFn: async () => {
      try { return await base44.entities.Position.list(); } catch { return []; }
    },
  });

  const { data: trainings = [] } = useQuery({
    queryKey: ["trainings"],
    queryFn: async () => {
      try { return await base44.entities.Training.list(); } catch { return []; }
    },
  });

  // Exclude terminated employees from the directory entirely
  const nonTerminated = React.useMemo(
    () => employees.filter(e => e.status !== "terminated"),
    [employees]
  );

  // ─── Filter dropdown value mirrors URL param ───────────────────────────────
  const dropdownValue = filterParamToDropdown(filterParam);

  const handleFilterChange = (value) => {
    if (value === "all") {
      navigate("/EmployeeDirectory", { replace: true });
    } else {
      navigate(`/EmployeeDirectory?filter=${value}`, { replace: true });
    }
    setSelectedEmployees([]);
  };

  // ─── Filtered results using EXACT same logic as dashboard tiles ────────────
  const filtered = applyFilter(nonTerminated, filterParam, search, positions, sites);

  // ─── Subtitle shows active filter context ─────────────────────────────────
  const filterLabels = {
    all: `${nonTerminated.length} total in system`,
    officers: `${filtered.length} officers`,
    supervisors: `${filtered.length} supervisors`,
    officestaff: `${filtered.length} employees (staff)`,
    admin: `${filtered.length} admins`,
    active: `${filtered.length} active employees`,
  };
  const subtitle = filterLabels[filterParam] || `${employees.length} total in system`;

  // ─── Bulk actions ──────────────────────────────────────────────────────────
  const handleBulkAssignTraining = async () => {
    if (!bulkTrainingId || selectedEmployees.length === 0) return;
    setBulkProcessing(true);
    try {
      const training = trainings.find(t => t.id === bulkTrainingId);
      for (const empId of selectedEmployees) {
        await base44.entities.TrainingAssignment.create({
          employee_id: empId,
          training_id: bulkTrainingId,
          assigned_date: new Date().toISOString(),
          status: "not_started",
        });
      }
      toast.success(`Training "${training?.title || "Selected"}" assigned to ${selectedEmployees.length} employee(s)`);
      setBulkTrainingId("");
      setSelectedEmployees([]);
      setTimeout(() => setShowBulkTraining(false), 800);
    } catch (err) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleAssignSingleTraining = async () => {
    if (!trainingToAssign || !detailEmployee) return;
    try {
      await base44.entities.TrainingAssignment.create({
        employee_id: detailEmployee.id,
        training_id: trainingToAssign,
        assigned_date: new Date().toISOString(),
        status: "not_started",
      });
      const training = trainings.find(t => t.id === trainingToAssign);
      toast.success(`Training "${training?.title || "Selected"}" assigned to ${detailEmployee.firstName}`);
      setTrainingToAssign("");
      setShowAssignTraining(false);
      setDetailEmployee(null);
    } catch (err) {
      toast.error(`Failed: ${err.message}`);
    }
  };

  const handleBulkAssignSupervisor = async () => {
    if (!bulkSupervisorId && !bulkManagerId) return;
    if (selectedEmployees.length === 0) return;
    setBulkProcessing(true);
    try {
      const updateData = {};
      if (bulkSupervisorId) updateData.supervisor_id = bulkSupervisorId;
      if (bulkManagerId) updateData.manager_id = bulkManagerId;
      for (const empId of selectedEmployees) {
        await base44.entities.Employee.update(empId, updateData);
      }
      queryClient.invalidateQueries(["employees-all"]);
      const supName = employees.find(e => e.id === bulkSupervisorId);
      const mgrName = employees.find(e => e.id === bulkManagerId);
      const parts = [];
      if (supName) parts.push(`Supervisor: ${supName.firstName} ${supName.lastName}`);
      if (mgrName) parts.push(`Manager: ${mgrName.firstName} ${mgrName.lastName}`);
      toast.success(`${selectedEmployees.length} employee(s) assigned — ${parts.join(", ")}`);
      setBulkSupervisorId("");
      setBulkManagerId("");
      setSelectedEmployees([]);
      setTimeout(() => setShowBulkAssign(false), 800);
    } catch (err) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkUpdateStatus = async () => {
    if (!bulkStatus || selectedEmployees.length === 0) return;
    setBulkProcessing(true);
    try {
      for (const empId of selectedEmployees) {
        await base44.entities.Employee.update(empId, { status: bulkStatus });
      }
      queryClient.invalidateQueries(["employees-all"]);
      toast.success(`Status updated to "${bulkStatus}" for ${selectedEmployees.length} employee(s)`);
      setBulkStatus("");
      setSelectedEmployees([]);
      setTimeout(() => setShowBulkStatus(false), 800);
    } catch (err) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setBulkProcessing(false);
    }
  };

  // ─── Protected accounts (cannot be bulk-modified) ───────────────────────────
  const PROTECTED_EMAILS = ["aaron.williams@nationwidepolice.com", "justin.ashe@nationwidepolice.com"];

  const safeBulkTargets = (ids, skipFn) => employees.filter(e => ids.includes(e.id) && !PROTECTED_EMAILS.includes(e.email?.toLowerCase()) && (!skipFn || skipFn(e)));

  // ─── Bulk Send Invites ────────────────────────────────────────────────────────
  const handleBulkSendInvites = async () => {
    const targets = safeBulkTargets(selectedEmployees, e => e.invitation_status !== "active" && e.email);
    const skipped = selectedEmployees.length - targets.length;
    if (targets.length === 0) { toast.info("No eligible employees to invite (all already active or missing email)"); return; }
    setBulkProcessing(true);
    let sent = 0;
    for (const emp of targets) {
      try {
        await base44.functions.invoke("sendInvitationEmail", { employee_id: emp.id, email: emp.email, firstName: emp.firstName, full_name: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(), role: emp.role });
        await base44.entities.Employee.update(emp.id, { invitation_status: "invited", invitation_sent_at: new Date().toISOString() });
        sent++;
      } catch {}
    }
    queryClient.invalidateQueries(["employees-all"]);
    toast.success(`Invites sent to ${sent} employee(s)${skipped > 0 ? `. ${skipped} skipped (already active or missing email).` : ""}`);
    setSelectedEmployees([]);
    setBulkProcessing(false);
  };

  // ─── Bulk Send Message ────────────────────────────────────────────────────────
  const handleBulkSendMessage = async () => {
    if (!bulkMessage.trim()) return;
    const targets = safeBulkTargets(selectedEmployees);
    setBulkProcessing(true);
    for (const emp of targets) {
      try {
        await base44.entities.Notification.create({ user_id: emp.id, title: "Message from Admin", message: bulkMessage, notification_type: "announcement", destination_page: "Notifications" });
      } catch {}
    }
    toast.success(`Message sent to ${targets.length} employee(s)`);
    setBulkMessage("");
    setShowBulkMessage(false);
    setSelectedEmployees([]);
    setBulkProcessing(false);
  };

  // ─── Bulk Edit Role ───────────────────────────────────────────────────────────
  const handleBulkEditRole = async () => {
    if (!bulkRole) return;
    if (bulkRole === "admin") { toast.error("Admin role must be assigned individually"); return; }
    const targets = safeBulkTargets(selectedEmployees);
    setBulkProcessing(true);
    for (const emp of targets) {
      try {
        await base44.entities.Employee.update(emp.id, { role: bulkRole });
        if (emp.email) {
          const users = await base44.entities.User.filter({ email: emp.email });
          if (users[0]) await base44.functions.invoke("setUserRole", { target_user_id: users[0].id, role: bulkRole });
        }
      } catch {}
    }
    queryClient.invalidateQueries(["employees-all"]);
    toast.success(`Role updated to "${bulkRole}" for ${targets.length} employee(s)`);
    setBulkRole("");
    setShowBulkRole(false);
    setSelectedEmployees([]);
    setBulkProcessing(false);
  };

  // ─── Bulk Export CSV ──────────────────────────────────────────────────────────
  const handleBulkExport = () => {
    const toExport = employees.filter(e => selectedEmployees.includes(e.id));
    const rows = [
      ["Name", "Email", "Role", "Position Title", "Status", "Hire Date"],
      ...toExport.map(e => [`${e.firstName || ""} ${e.lastName || ""}`.trim(), e.email || "", e.role || "", e.positionTitle || "", e.status || "", e.hireDate || ""]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "employees_export.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Bulk Terminate ───────────────────────────────────────────────────────────
  const handleBulkTerminate = async () => {
    if (terminateConfirmText !== "CONFIRM") return;
    const targets = safeBulkTargets(selectedEmployees);
    setBulkProcessing(true);
    for (const emp of targets) {
      try {
        await base44.entities.Employee.update(emp.id, { status: "terminated", hasAppAccess: false, terminatedDate: new Date().toISOString().split("T")[0] });
      } catch {}
    }
    queryClient.invalidateQueries(["employees-all"]);
    toast.success(`${targets.length} employee(s) terminated`);
    setTerminateConfirmText("");
    setShowBulkTerminate(false);
    setSelectedEmployees([]);
    setBulkProcessing(false);
  };

  const handleSendInvite = async (emp) => {
    if (!emp.email) { toast.error("Employee has no email address"); return; }
    await run(emp.id, "invite", async () => {
      const resp = await base44.functions.invoke("sendInvitationEmail", {
        employee_id: emp.id,
        email: emp.email,
        firstName: emp.firstName,
        full_name: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
        role: emp.role,
      });
      if (resp?.data?.error) throw new Error(resp.data.error);
      await base44.entities.Employee.update(emp.id, {
        invitation_status: "invited",
        invitation_sent_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries(["employees-all"]);
      toast.success(`Invitation sent to ${emp.email}`);
    }).catch(err => toast.error(`Failed to send invite: ${err.message || "Unknown error"}`));
  };

  const handleDelete = (emp) => {
    setOffboardingEmployee(emp);
  };

  const handleAssignRole = async () => {
    if (!roleEmployee || !newRole) return;

    // Protect admin accounts
    const protectedAdmins = [
      "aaron.williams@nationwidepolice.com",
      "justin.ashe@nationwidepolice.com",
    ];
    const email = roleEmployee.email?.toLowerCase();
    
    if (email && protectedAdmins.includes(email)) {
      if (!window.confirm(`${roleEmployee.firstName} ${roleEmployee.lastName} is a protected admin account. Are you sure you want to change their role? This requires confirmation.`)) {
        return;
      }
    }

    setSavingRole(true);
    try {
      // Update Employee role
      await base44.entities.Employee.update(roleEmployee.id, { role: newRole });
      // Sync role to User entity if email exists
      if (roleEmployee.email) {
        // Look up the User record by email to get their user ID
        const users = await base44.entities.User.filter({ email: roleEmployee.email });
        const targetUser = users[0];
        if (targetUser) {
          await base44.functions.invoke("setUserRole", {
            target_user_id: targetUser.id,
            role: newRole,
          });
        }
      }
      queryClient.invalidateQueries(["employees-all"]);
      toast.success(`Role updated to ${newRole}`);
      setRoleSaved(true);
      setTimeout(() => {
        setRoleSaved(false);
        setNewRole("");
        setRoleEmployee(null);
      }, 1200);
    } catch (err) {
      toast.error(`Failed to update role: ${err.message}`);
    } finally {
      setSavingRole(false);
    }
  };

  const handleSaveEmployee = async (formData) => {
    setSaving(true);
    try {
      await base44.entities.Employee.update(editingEmployee.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        role: formData.role,
        employeeId: formData.employeeId,
        paychexWorkerId: formData.paychexWorkerId,
        baseHourlyRate: formData.baseHourlyRate ? parseFloat(formData.baseHourlyRate) : undefined,
        maxHours: formData.maxHours ? parseInt(formData.maxHours) : undefined,
        status: formData.isActive ? "active" : "inactive",
      });
      if (formData.send_invite && formData.email) {
        const resp = await base44.functions.invoke("sendInvitationEmail", {
          employee_id: editingEmployee.id,
          email: formData.email,
          firstName: formData.firstName,
          full_name: `${formData.firstName || ""} ${formData.lastName || ""}`.trim(),
          role: formData.role,
        });
        if (resp?.data?.error) throw new Error(resp.data.error);
        await base44.entities.Employee.update(editingEmployee.id, {
          invitation_status: "invited",
          invitation_sent_at: new Date().toISOString(),
        });
        toast.success(`Changes saved and invitation sent to ${formData.email}`);
      } else {
        toast.success("Employee updated successfully");
      }
      queryClient.invalidateQueries(["employees-all"]);
      setEditingEmployee(null);
      setSaving(false);
    } catch (err) {
      toast.error(`Save failed: ${err.message || "Unknown error"}`);
      setSaving(false);
    }
  };

  const inviteStatusBadge = (emp) => {
    if (emp.invitation_status === "active") return <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>;
    if (emp.invitation_status === "invited") return <Badge className="bg-blue-100 text-blue-700">Invited</Badge>;
    return <Badge className="bg-slate-100 text-slate-500">Not Invited</Badge>;
  };

  const roleColors = {
    officer: "bg-blue-100 text-blue-700",
    employee: "bg-slate-100 text-slate-700",
    supervisor: "bg-amber-100 text-amber-700",
    admin: "bg-[#c9a227]/15 text-[#c9a227] border border-[#c9a227]/30",
  };

  const toggleEmployee = (id) => setSelectedEmployees(prev =>
    prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
  );
  const toggleAll = () => setSelectedEmployees(
    selectedEmployees.length === filtered.length ? [] : filtered.map(e => e.id)
  );

  const InviteIcon = (emp) => emp.invitation_status === "invited" ? RefreshCw : Send;

  const canAssignTraining = currentUserRole && ['supervisor', 'manager', 'admin', 'super_admin'].includes(currentUserRole);

  const renderActions = (emp) => (
    <>
      <EmpButton state={getState(emp.id, "view")} icon={Users} title="View details"
        className="text-slate-500 hover:text-slate-700"
        onClick={() => setDetailEmployee(emp)} />
      <EmpButton state={getState(emp.id, "edit")} icon={Edit} title="Edit employee"
        className="text-slate-600 hover:text-slate-900"
        onClick={() => setEditingEmployee(emp)} />
      {canAssignTraining && (
        <EmpButton state={getState(emp.id, "training")} icon={GraduationCap} title="Assign training"
          className="text-purple-600 hover:text-purple-700"
          onClick={() => { setDetailEmployee(emp); setShowAssignTraining(true); }} />
      )}
      <EmpButton state={getState(emp.id, "role")} icon={Shield} title="Assign role"
        className="text-blue-600 hover:text-blue-700"
        onClick={() => { setRoleEmployee(emp); setNewRole(emp.role || "employee"); }} />
      <EmpButton state={getState(emp.id, "invite")} icon={InviteIcon(emp)}
        title={emp.invitation_status === "invited" ? "Resend invite" : "Send invite"}
        className="text-emerald-600 hover:text-emerald-700"
        onClick={() => handleSendInvite(emp)} />
      <EmpButton state={getState(emp.id, "pwd")} icon={Key} title="Change password"
        className="text-amber-600 hover:text-amber-700"
        onClick={() => setChangePwdEmployee(emp)} />
      <EmpButton state={getState(emp.id, "delete")} icon={Trash2} title="Delete employee"
        className="text-red-400 hover:text-red-600"
        onClick={() => handleDelete(emp)} />
    </>
  );

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50 overflow-y-auto">
      <PageHeader title="Employee Directory" subtitle={subtitle} />
      <div className="max-w-7xl mx-auto px-4 py-6 pb-32">

        {/* Top action buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button onClick={() => navigate("/NewEmployee")} className="bg-[#1a2b4a] hover:bg-[#2d4a6f] gap-2">
            <Plus className="w-4 h-4" /> Add Employee
          </Button>
          <Button onClick={() => navigate("/DataImport")} variant="outline" className="gap-2">
            <Upload className="w-4 h-4" /> Bulk Import
          </Button>
          {currentUserRole === "supervisor" && (
            <Button onClick={() => navigate("/SupervisorDashboard")} variant="outline" className="gap-2 border-[#1a2b4a] text-[#1a2b4a] ml-auto">
              <LayoutDashboard className="w-4 h-4" /> My Dashboard
            </Button>
          )}
          {(currentUserRole === "manager") && (
            <Button onClick={() => navigate("/AdminDashboard")} variant="outline" className="gap-2 border-[#1a2b4a] text-[#1a2b4a] ml-auto">
              <LayoutDashboard className="w-4 h-4" /> My Dashboard
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by name, position, or site..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Role/filter dropdown — value mirrors URL param */}
              <Select value={dropdownValue} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  <SelectItem value="officers">Officers</SelectItem>
                  <SelectItem value="officestaff">Employees (Staff)</SelectItem>
                  <SelectItem value="supervisors">Supervisors</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="active">All Active</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2 bg-slate-100 rounded-lg p-1">
                <Button variant={viewMode === "card" ? "default" : "ghost"} size="sm"
                  onClick={() => setViewMode("card")} className="h-8 px-3">
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm"
                  onClick={() => setViewMode("list")} className="h-8 px-3">
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions Toolbar — sticky, slide in when rows selected */}
        <div
          style={{
            maxHeight: selectedEmployees.length > 0 ? "200px" : "0",
            opacity: selectedEmployees.length > 0 ? 1 : 0,
            overflow: "hidden",
            transition: "max-height 0.25s ease, opacity 0.2s ease",
            marginBottom: selectedEmployees.length > 0 ? "16px" : "0",
          }}
        >
          <div className="sticky top-0 z-30 bg-[#1a2b4a] text-white rounded-xl shadow-lg px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sm whitespace-nowrap mr-2">
                {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? "s" : ""} selected
              </span>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={bulkProcessing} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={handleBulkSendInvites}>
                  <Send className="w-3.5 h-3.5" /> Send Invite
                </Button>
                <Button size="sm" disabled={bulkProcessing} className="bg-blue-600 hover:bg-blue-700 text-white gap-1" onClick={() => setShowBulkMessage(true)}>
                  <Mail className="w-3.5 h-3.5" /> Send Message
                </Button>
                <Button size="sm" disabled={bulkProcessing} className="bg-purple-600 hover:bg-purple-700 text-white gap-1" onClick={() => { setBulkRole(""); setShowBulkRole(true); }}>
                  <Shield className="w-3.5 h-3.5" /> Edit Role
                </Button>
                <Button size="sm" disabled={bulkProcessing} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold gap-1" onClick={() => setShowBulkTraining(true)}>
                  <GraduationCap className="w-3.5 h-3.5" /> Training
                </Button>
                <Button size="sm" disabled={bulkProcessing} className="bg-white/10 hover:bg-white/20 text-white border border-white/30 gap-1" onClick={() => setShowBulkStatus(true)}>
                  <UserCheck className="w-3.5 h-3.5" /> Status
                </Button>
                <Button size="sm" disabled={bulkProcessing} className="bg-white/10 hover:bg-white/20 text-white border border-white/30 gap-1" onClick={handleBulkExport}>
                  <Upload className="w-3.5 h-3.5" /> Export CSV
                </Button>
                <Button size="sm" disabled={bulkProcessing} className="bg-red-600 hover:bg-red-700 text-white gap-1" onClick={() => { setTerminateConfirmText(""); setShowBulkTerminate(true); }}>
                  <Trash2 className="w-3.5 h-3.5" /> Terminate
                </Button>
                <Button size="sm" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 gap-1" onClick={() => setSelectedEmployees([])}>
                  <X className="w-3.5 h-3.5" /> Clear
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Select All (card view) */}
        {viewMode === "card" && filtered.length > 0 && (
          <div className="flex items-center gap-2 mb-3 px-1">
            <Checkbox
              checked={selectedEmployees.length === filtered.length && filtered.length > 0}
              onCheckedChange={toggleAll}
            />
            <span className="text-sm text-slate-500 cursor-pointer" onClick={toggleAll}>
              {selectedEmployees.length === filtered.length ? "Deselect all" : "Select all"}
            </span>
          </div>
        )}

        {/* Employee list */}
        {filtered.length > 0 ? (
          viewMode === "card" ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((emp) => (
                <Card key={emp.id} className="hover:shadow-md transition-shadow" style={selectedEmployees.includes(emp.id) ? { backgroundColor: "#fefbf0", borderColor: "#c9a227" } : {}}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-4">
                      <Checkbox
                        checked={selectedEmployees.includes(emp.id)}
                        onCheckedChange={() => toggleEmployee(emp.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-12 h-12 rounded-full bg-[#1a2b4a] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-base">{emp.firstName} {emp.lastName}</h3>
                            <Badge className={roleColors[emp.role] || roleColors.employee}>{emp.role}</Badge>
                          </div>
                        </div>
                        {inviteStatusBadge(emp)}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600 mb-4">
                      {emp.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{emp.email}</span>
                        </div>
                      )}
                      {emp.phoneNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          {emp.phoneNumber}
                        </div>
                      )}
                      {emp.positionTitle && (
                        <div className="text-slate-700 font-medium">{emp.positionTitle}</div>
                      )}
                    </div>
                    <div className="flex gap-1 justify-between pt-4 border-t">
                      {renderActions(emp)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 rounded-lg">
                <Checkbox
                  checked={selectedEmployees.length === filtered.length && filtered.length > 0}
                  onCheckedChange={toggleAll}
                />
                <span className="text-sm font-medium text-slate-600">{selectedEmployees.length} selected</span>
              </div>
              {filtered.map((emp) => (
                <Card key={emp.id} className="hover:shadow-sm transition-shadow" style={selectedEmployees.includes(emp.id) ? { backgroundColor: "#fefbf0", borderColor: "#c9a227" } : {}}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedEmployees.includes(emp.id)}
                        onCheckedChange={() => toggleEmployee(emp.id)}
                      />
                      <div className="w-10 h-10 rounded-full bg-[#1a2b4a] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{emp.firstName} {emp.lastName}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-600 flex-wrap">
                          {inviteStatusBadge(emp)}
                          <Badge className={roleColors[emp.role] || roleColors.employee}>{emp.role}</Badge>
                        </div>
                      </div>
                      <div className="hidden sm:block text-xs text-slate-500 flex-shrink-0 max-w-[160px] truncate">
                        {emp.email}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {renderActions(emp)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          <EmptyState icon={Users} title="No employees found" description="Try adjusting your filters" />
        )}
      </div>

      {/* Bulk Send Message Modal */}
      <Dialog open={showBulkMessage} onOpenChange={setShowBulkMessage}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Mail className="w-5 h-5" />Send Message</DialogTitle></DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-slate-600">Broadcast a message to <strong>{selectedEmployees.length} selected employee(s)</strong> as an in-app notification.</p>
            <Label>Message</Label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 border border-input rounded-md text-sm resize-none"
              placeholder="Type your message here..."
              value={bulkMessage}
              onChange={e => setBulkMessage(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowBulkMessage(false); setBulkMessage(""); }}>Cancel</Button>
            <Button onClick={handleBulkSendMessage} disabled={!bulkMessage.trim() || bulkProcessing} className="bg-blue-600 hover:bg-blue-700">
              {bulkProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Send to {selectedEmployees.length} Employee{selectedEmployees.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Role Modal */}
      <Dialog open={showBulkRole} onOpenChange={setShowBulkRole}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Edit Role</DialogTitle></DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-slate-600">Set a new role for <strong>{selectedEmployees.length} selected employee(s)</strong>. Protected accounts will be skipped automatically.</p>
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">Admin role cannot be bulk-assigned. Select individually.</div>
            <Label>New Role</Label>
            <Select value={bulkRole} onValueChange={setBulkRole}>
              <SelectTrigger><SelectValue placeholder="Choose role..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="officer">Officer</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="admin" disabled>Admin (individual assignment only)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowBulkRole(false); setBulkRole(""); }}>Cancel</Button>
            <Button onClick={handleBulkEditRole} disabled={!bulkRole || bulkProcessing} className="bg-purple-600 hover:bg-purple-700">
              {bulkProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Apply to {selectedEmployees.length} Employee{selectedEmployees.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Terminate Modal */}
      <Dialog open={showBulkTerminate} onOpenChange={(o) => { if (!o) { setShowBulkTerminate(false); setTerminateConfirmText(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700"><Trash2 className="w-5 h-5" />Bulk Terminate Employees</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-semibold text-red-800 mb-2">The following employees will be terminated:</p>
              <ul className="text-sm text-red-700 space-y-0.5 max-h-40 overflow-y-auto">
                {employees
                  .filter(e => selectedEmployees.includes(e.id) && !PROTECTED_EMAILS.includes(e.email?.toLowerCase()))
                  .map(e => <li key={e.id}>• {e.firstName} {e.lastName} ({e.role})</li>)
                }
              </ul>
              {selectedEmployees.some(id => { const e = employees.find(x => x.id === id); return e && PROTECTED_EMAILS.includes(e.email?.toLowerCase()); }) && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-1 mt-2">Protected admin accounts will be skipped.</p>
              )}
            </div>
            <p className="text-sm text-slate-600">This will set their status to <strong>Terminated</strong> and revoke app access. Type <strong>CONFIRM</strong> to proceed.</p>
            <input
              type="text"
              className="w-full px-3 py-2 border border-input rounded-md text-sm font-mono"
              placeholder="Type CONFIRM to proceed"
              value={terminateConfirmText}
              onChange={e => setTerminateConfirmText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowBulkTerminate(false); setTerminateConfirmText(""); }}>Cancel</Button>
            <Button
              onClick={handleBulkTerminate}
              disabled={terminateConfirmText !== "CONFIRM" || bulkProcessing}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {bulkProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Terminate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Role Modal */}
      <Dialog open={!!roleEmployee} onOpenChange={() => setRoleEmployee(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign Role</DialogTitle></DialogHeader>
          <div className="py-2">
            <p className="text-sm text-slate-600 mb-4">
              Updating role for <strong>{roleEmployee?.firstName} {roleEmployee?.lastName}</strong>
            </p>
            <Label className="mb-2 block">Role</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="officer">Officer</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="admin">Admin (Super Admin only)</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleEmployee(null)}>Cancel</Button>
            <Button
              onClick={handleAssignRole}
              disabled={savingRole || roleSaved}
              className={roleSaved ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-[#1a2b4a] hover:bg-[#2d4a6f]"}
            >
              {savingRole ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : roleSaved ? <Check className="w-4 h-4 mr-2" /> : null}
              {roleSaved ? "Saved!" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditEmployeeDialog
        open={!!editingEmployee}
        employee={editingEmployee}
        onClose={() => setEditingEmployee(null)}
        onSave={handleSaveEmployee}
        saving={saving}
        positions={positions}
      />

      <ChangePasswordModal
        open={!!changePwdEmployee}
        onClose={() => setChangePwdEmployee(null)}
        employeeEmail={changePwdEmployee?.email}
        employeeName={changePwdEmployee ? `${changePwdEmployee.firstName} ${changePwdEmployee.lastName}` : null}
        employeeRole={changePwdEmployee?.role}
      />

      <EmployeeDetailDialog
        open={!!detailEmployee}
        employee={detailEmployee}
        onClose={() => setDetailEmployee(null)}
      />

      <EmployeeOffboardingDialog
        open={!!offboardingEmployee}
        employee={offboardingEmployee}
        onClose={() => setOffboardingEmployee(null)}
        onComplete={() => {
          queryClient.invalidateQueries(["employees-all"]);
          setOffboardingEmployee(null);
          toast.success("Employee offboarded successfully");
        }}
      />

      {/* Bulk Assign Training Modal */}
      <Dialog open={showBulkTraining} onOpenChange={setShowBulkTraining}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5" />Assign Training</DialogTitle></DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-slate-600">
              Assign a training course to <strong>{selectedEmployees.length} selected employee(s)</strong>.
            </p>
            <Label>Select Training Course</Label>
            <Select value={bulkTrainingId} onValueChange={setBulkTrainingId}>
              <SelectTrigger><SelectValue placeholder="Choose a training..." /></SelectTrigger>
              <SelectContent>
                {trainings.length === 0
                  ? <SelectItem value="_none" disabled>No trainings available</SelectItem>
                  : trainings.map(t => <SelectItem key={t.id} value={t.id}>{t.title || t.name}</SelectItem>)
                }
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowBulkTraining(false); setBulkTrainingId(""); }}>Cancel</Button>
            <Button onClick={handleBulkAssignTraining} disabled={!bulkTrainingId || bulkProcessing} className="bg-[#1a2b4a] hover:bg-[#2d4a6f]">
              {bulkProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Assign to {selectedEmployees.length} Employee{selectedEmployees.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Update Status Modal */}
      <Dialog open={showBulkStatus} onOpenChange={setShowBulkStatus}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserCheck className="w-5 h-5" />Update Status</DialogTitle></DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-slate-600">
              Set a new employment status for <strong>{selectedEmployees.length} selected employee(s)</strong>.
            </p>
            <Label>New Status</Label>
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger><SelectValue placeholder="Choose status..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowBulkStatus(false); setBulkStatus(""); }}>Cancel</Button>
            <Button onClick={handleBulkUpdateStatus} disabled={!bulkStatus || bulkProcessing} className="bg-[#1a2b4a] hover:bg-[#2d4a6f]">
              {bulkProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update {selectedEmployees.length} Employee{selectedEmployees.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Single Training Modal */}
      <Dialog open={showAssignTraining} onOpenChange={setShowAssignTraining}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5" />Assign Training</DialogTitle></DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-slate-600">
              Assign training to <strong>{detailEmployee?.firstName} {detailEmployee?.lastName}</strong> based on performance review.
            </p>
            <Label>Select Training Course</Label>
            <Select value={trainingToAssign} onValueChange={setTrainingToAssign}>
              <SelectTrigger><SelectValue placeholder="Choose a training..." /></SelectTrigger>
              <SelectContent>
                {trainings.length === 0
                  ? <SelectItem value="_none" disabled>No trainings available</SelectItem>
                  : trainings.map(t => <SelectItem key={t.id} value={t.id}>{t.title || t.name}</SelectItem>)
                }
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAssignTraining(false); setTrainingToAssign(""); }}>Cancel</Button>
            <Button onClick={handleAssignSingleTraining} disabled={!trainingToAssign} className="bg-purple-600 hover:bg-purple-700">
              Assign Training
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Supervisor/Manager Modal */}
      <Dialog open={showBulkAssign} onOpenChange={(open) => { if (!open) { setShowBulkAssign(false); setBulkSupervisorId(""); setBulkManagerId(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UsersRound className="w-5 h-5" /> Assign Supervisor / Manager
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-sm text-slate-600">
              Assign a supervisor and/or manager to <strong>{selectedEmployees.length} selected employee(s)</strong>.
              You can set one or both. Leave blank to skip that assignment.
            </p>

            <div className="space-y-2">
              <Label>Supervisor <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Select value={bulkSupervisorId} onValueChange={setBulkSupervisorId}>
                <SelectTrigger><SelectValue placeholder="Select a supervisor..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— No supervisor (leave unchanged) —</SelectItem>
                  {employees
                    .filter(e => ["supervisor", "manager", "admin"].includes(e.role) && e.status === "active")
                    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
                    .map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.firstName} {e.lastName} ({e.role})
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Manager <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Select value={bulkManagerId} onValueChange={setBulkManagerId}>
                <SelectTrigger><SelectValue placeholder="Select a manager..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— No manager (leave unchanged) —</SelectItem>
                  {employees
                    .filter(e => ["manager", "admin"].includes(e.role) && e.status === "active")
                    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
                    .map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.firstName} {e.lastName} ({e.role})
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            {(bulkSupervisorId && bulkSupervisorId !== "_none") || (bulkManagerId && bulkManagerId !== "_none") ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
                Will update <strong>{selectedEmployees.length} employee(s)</strong>
                {bulkSupervisorId && bulkSupervisorId !== "_none" && (() => { const s = employees.find(e => e.id === bulkSupervisorId); return s ? ` · Supervisor → ${s.firstName} ${s.lastName}` : ""; })()}
                {bulkManagerId && bulkManagerId !== "_none" && (() => { const m = employees.find(e => e.id === bulkManagerId); return m ? ` · Manager → ${m.firstName} ${m.lastName}` : ""; })()}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowBulkAssign(false); setBulkSupervisorId(""); setBulkManagerId(""); }}>Cancel</Button>
            <Button
              onClick={handleBulkAssignSupervisor}
              disabled={(!bulkSupervisorId || bulkSupervisorId === "_none") && (!bulkManagerId || bulkManagerId === "_none") || bulkProcessing}
              className="bg-[#1a2b4a] hover:bg-[#2d4a6f]"
            >
              {bulkProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Assign {selectedEmployees.length} Employee{selectedEmployees.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}