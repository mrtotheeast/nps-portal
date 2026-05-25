import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import ListSkeleton from "@/components/shared/ListSkeleton";
import {
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
  Building2,
  GraduationCap,
  Receipt,
  Shield,
  MapPin,
  Bell,
  Settings,
  RefreshCw,
  TrendingUp,
  UserCheck,
  ClipboardList,
  Award,
  Folder,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatCard from "@/components/shared/StatCard";
import { useTenantFilter } from "@/hooks/useTenantFilter";
import { useCompany } from "@/context/CompanyContext";
import QuickActionTile from "@/components/shared/QuickActionTile";
import LoadingScreen from "@/components/shared/LoadingScreen";
import IncidentMap from "@/components/dashboard/IncidentMap";
import { getCategorizedCounts, isActive } from "@/lib/employeeQueries";
import StatCardSkeleton from "@/components/dashboard/StatCardSkeleton";
import ShiftCalendar from "@/components/dashboard/ShiftCalendar";
import ShiftConflictWarnings from "@/components/dashboard/ShiftConflictWarnings";
import PatrolProgressReport from "@/components/dashboard/PatrolProgressReport";
import AdminShiftCalendarView from "@/components/dashboard/AdminShiftCalendarView";
import UnregisteredScheduleEmployees from "@/components/dashboard/UnregisteredScheduleEmployees";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import PortalLoginChart from "@/components/dashboard/PortalLoginChart";
import PTOCalendarView from "@/components/dashboard/PTOCalendarView";
import AdminQuickAccess from "@/components/dashboard/AdminQuickAccess";
import PlanLimitBanner from "@/components/billing/PlanLimitBanner";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isImpersonating, stopImpersonating, company } = useCompany();
  const tenantFilter = useTenantFilter();
  const [error, setError] = useState(null);
  const [showClientForm, setShowClientForm] = useState(false);
  const [staffFilter, setStaffFilter] = useState("active");
  const [reassigningRecords, setReassigningRecords] = useState(false);

  // Stagger queries into batches to avoid 429 rate limiting
  // Batch 1 — most critical (load immediately)
  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["employees-all", tenantFilter],
    queryFn: async () => {
      const all = await base44.entities.Employee.filter(tenantFilter, "-created_date", 2000);
      return all.filter(e => !e.archived);
    },
    staleTime: 300000,
    gcTime: 600000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    enabled: !!tenantFilter.company_id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", tenantFilter],
    queryFn: async () => {
      const all = await base44.entities.Client.filter(tenantFilter, "-created_date", 200);
      return all.filter(c => c.status !== "deleted");
    },
    staleTime: 600000,
    gcTime: 900000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    enabled: !!tenantFilter.company_id,
  });

  const { data: timesheets = [], isLoading: loadingTimesheets } = useQuery({
    queryKey: ["timesheets-pending", tenantFilter],
    queryFn: () => base44.entities.Timesheet.filter({ ...tenantFilter, status: "pending" }, "", 50),
    staleTime: 300000,
    gcTime: 600000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    enabled: !!tenantFilter.company_id,
  });

  const { data: incidents = [], isLoading: loadingIncidents } = useQuery({
    queryKey: ["incidents-pending", tenantFilter],
    queryFn: () => base44.entities.Incident.filter({ ...tenantFilter, status: "pending" }, "", 50),
    staleTime: 300000,
    gcTime: 600000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    enabled: !!tenantFilter.company_id,
  });

  // Batch 2 — deferred (wait 1.5s before firing)
  const [batch2Ready, setBatch2Ready] = useState(false);
  useEffect(() => {
    if (!tenantFilter.company_id) return;
    const t = setTimeout(() => setBatch2Ready(true), 1500);
    return () => clearTimeout(t);
  }, [tenantFilter.company_id]);

  const { data: ptoRequests = [], isLoading: loadingPTO } = useQuery({
    queryKey: ["pto-pending", tenantFilter],
    queryFn: () => base44.entities.PTORequest.filter({ ...tenantFilter, status: "pending" }, "", 50),
    staleTime: 300000,
    gcTime: 600000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    enabled: !!tenantFilter.company_id && batch2Ready,
  });

  const { data: activePatrols = [] } = useQuery({
    queryKey: ["patrols-active", tenantFilter],
    queryFn: () => base44.entities.PatrolSession.filter({ ...tenantFilter, status: "active" }, "", 50),
    staleTime: 120000,
    gcTime: 300000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    enabled: !!tenantFilter.company_id && batch2Ready,
  });

  const { data: violations = [] } = useQuery({
    queryKey: ["violations-pending", tenantFilter],
    queryFn: () => base44.entities.GPSViolation.filter({ ...tenantFilter, status: "pending" }, "", 100),
    staleTime: 300000,
    gcTime: 600000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    enabled: !!tenantFilter.company_id && batch2Ready,
  });

  // Batch 3 — least urgent (wait 3s before firing)
  const [batch3Ready, setBatch3Ready] = useState(false);
  useEffect(() => {
    if (!tenantFilter.company_id) return;
    const t = setTimeout(() => setBatch3Ready(true), 3000);
    return () => clearTimeout(t);
  }, [tenantFilter.company_id]);

  const { data: approvedPTOs = [] } = useQuery({
    queryKey: ["pto-approved", tenantFilter],
    queryFn: () => base44.entities.PTORequest.filter({ ...tenantFilter, status: "approved" }, "", 200),
    staleTime: 300000,
    gcTime: 600000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    enabled: !!tenantFilter.company_id && batch3Ready,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites", tenantFilter],
    queryFn: () => base44.entities.Site.filter(tenantFilter),
    staleTime: 600000,
    gcTime: 900000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    enabled: !!tenantFilter.company_id && batch3Ready,
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ["credentials-expiring", tenantFilter],
    queryFn: () => base44.entities.Credential.filter({ ...tenantFilter, status: "active" }, "", 200),
    staleTime: 600000,
    gcTime: 900000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    enabled: !!tenantFilter.company_id && batch3Ready,
  });

  const { data: trainingAssignments = [] } = useQuery({
    queryKey: ["training-assignments", tenantFilter],
    queryFn: () => base44.entities.TrainingAssignment.filter({ ...tenantFilter, status: "not_started" }, "", 200),
    staleTime: 600000,
    gcTime: 900000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    enabled: !!tenantFilter.company_id && batch3Ready,
  });

  const { data: onboardingDocs = [] } = useQuery({
    queryKey: ["onboarding-docs-required", tenantFilter],
    queryFn: () => base44.entities.OnboardingDocument.filter({ ...tenantFilter, is_required: true, is_archived: false }, "", 200),
    staleTime: 600000,
    gcTime: 900000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    enabled: !!tenantFilter.company_id && batch3Ready,
  });

  const { data: docAcknowledgments = [] } = useQuery({
    queryKey: ["doc-acknowledgments", tenantFilter],
    queryFn: () => base44.entities.DocumentAcknowledgment.filter(tenantFilter, "", 2000),
    staleTime: 300000,
    gcTime: 600000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    enabled: !!tenantFilter.company_id && batch3Ready,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices-dashboard", tenantFilter],
    queryFn: () => base44.entities.Invoice.filter({ ...tenantFilter, status: "overdue" }, "-updated_date", 100),
    staleTime: 600000,
    gcTime: 900000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    enabled: !!tenantFilter.company_id && batch3Ready,
  });

  // Real-time refresh: invalidate employee counts on any Employee CRUD
  useEffect(() => {
    const unsubscribe = base44.entities.Employee.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["employees-all"] });
    });
    return unsubscribe;
  }, [queryClient]);

  const isSuperAdmin = user?.role_type === "super_admin";

  // Compliance stats
  const expiredCredentials = credentials.filter(c => 
    c.expiry_date && new Date(c.expiry_date) < new Date()
  ).length;

  const expiringCredentials = credentials.filter(c => {
    if (!c.expiry_date) return false;
    const daysUntilExpiry = (new Date(c.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  }).length;

  // Onboarding completion stats
  const activeEmployees = employees.filter(e => e.status === "active");
  const onboardingCompletionPct = (() => {
    if (!onboardingDocs.length || !activeEmployees.length) return null;
    const completedEmployeeIds = new Set(
      docAcknowledgments
        .filter(a => a.status === "signed" || a.status === "acknowledged" || a.signed_at)
        .map(a => a.employee_id)
    );
    // Employee is "complete" if they have at least one acknowledgment per required doc
    const employeesComplete = activeEmployees.filter(emp => {
      const empAcks = docAcknowledgments.filter(a =>
        a.employee_id === emp.id && (a.status === "signed" || a.status === "acknowledged" || a.signed_at)
      );
      const ackedDocIds = new Set(empAcks.map(a => a.document_id));
      return onboardingDocs.every(doc => ackedDocIds.has(doc.id));
    });
    return Math.round((employeesComplete.length / activeEmployees.length) * 100);
  })();

  const pendingTraining = trainingAssignments.filter(t => t.status === "not_started").length;
  const overdueTraining = trainingAssignments.filter(t => 
    t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed"
  ).length;

  // Invoice calculations (invoices query only fetches overdue)
  const today = new Date();
  const overdueInvoices = invoices.length;

  // Stats by role — scoped to the selected staffFilter
  const pendingInvitations = employees.filter(e => isActive(e) && (e.invitation_status === "not_invited" || !e.invitation_status)).length;

  const staffFilteredEmployees = (() => {
    switch (staffFilter) {
      case "active":      return employees.filter(e => e.status === "active");
      case "pending":     return employees.filter(e => e.status === "active" && (e.invitation_status === "not_invited" || !e.invitation_status));
      case "on_leave":    return employees.filter(e => e.status === "on_leave");
      case "terminated":  return employees.filter(e => e.status === "terminated");
      case "inactive":    return employees.filter(e => e.status === "inactive");
      default:            return employees.filter(e => e.status === "active");
    }
  })();

  // Role counts always reflect ALL active employees regardless of staffFilter
  const statsByRole = getCategorizedCounts(employees.filter(e => e.status === "active"));

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const handleDownloadRenewalsReport = async () => {
    try {
      const response = await base44.functions.invoke('generateRenewalsReportPDF', { renewals: renewalsDue });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `renewals-report-${new Date().getTime()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download report:', err);
    }
  };

  const handleReassignOrphanedRecords = async () => {
    setReassigningRecords(true);
    try {
      const response = await base44.functions.invoke('reassignOrphanedNPSRecords', {});
      if (response.data?.success) {
        queryClient.invalidateQueries({ queryKey: ["employees-all"] });
        queryClient.invalidateQueries({ queryKey: ["clients"] });
        alert(`Migration complete: ${response.data.employeesAssigned} employees, ${response.data.clientsAssigned} clients, ${response.data.sitesAssigned} sites assigned to NPS`);
      }
    } catch (err) {
      console.error('Failed to reassign records:', err);
      alert('Error reassigning records: ' + err.message);
    } finally {
      setReassigningRecords(false);
    }
  };

  // Calculate renewals due (contracts expiring within 90 days)
  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const renewalsDue = clients.filter(client => {
    if (!client.contract_end_date) return false;
    const endDate = new Date(client.contract_end_date);
    return endDate > now && endDate <= in90Days;
  }).sort((a, b) => new Date(a.contract_end_date) - new Date(b.contract_end_date));

  if (loadingTimesheets && loadingIncidents && loadingEmployees && !timesheets.length && !incidents.length && !employees.length) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary error={error} resetError={() => setError(null)}>
    <PullToRefresh onRefresh={() => queryClient.invalidateQueries()}>
    <div className="min-h-screen bg-background dark:bg-slate-950">
      {/* Impersonation Banner — only visible to super admin when impersonating */}
      {isImpersonating && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-semibold">
            🔍 Impersonating: {company?.name || 'Unknown Company'}
          </span>
          <button
            onClick={stopImpersonating}
            className="text-xs underline hover:no-underline font-medium"
          >
            Exit Impersonation
          </button>
        </div>
      )}
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-950 border-b dark:border-slate-800">
        <div className="w-full px-4 md:max-w-7xl md:mx-auto py-4 md:py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              {isSuperAdmin ? "Super Admin Dashboard" : "Admin Dashboard"}
            </h1>
            {isSuperAdmin && (
              <Button 
                onClick={handleReassignOrphanedRecords}
                disabled={reassigningRecords}
                className="bg-amber-500 hover:bg-amber-600 text-white"
                size="sm"
              >
                {reassigningRecords ? "Reassigning..." : "Fix Missing Records"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:max-w-7xl md:mx-auto py-4 md:py-6 pb-32 md:pb-6">
        {/* Plan limit warnings — hidden for platform owner */}
        {!company?.is_platform_owner && (
          <PlanLimitBanner
            count={employees.filter(e => e.status === "active").length}
            plan={company?.plan_tier || "single"}
            onUpgrade={() => window.location.href = "/CompanySettings"}
          />
        )}
        {/* Tabs Section */}
         <Tabs defaultValue="overview" className="mb-8">
           <TabsList className="w-full overflow-x-auto">
             <TabsTrigger value="overview">Overview</TabsTrigger>
             <TabsTrigger value="renewals" className="flex items-center gap-1">
               <AlertTriangle className="w-4 h-4" />
               Renewals Due ({renewalsDue.length})
             </TabsTrigger>
             <TabsTrigger value="clients" className="flex items-center gap-1">
               <Building2 className="w-4 h-4" />
               Clients
             </TabsTrigger>
           </TabsList>

          <TabsContent value="overview" className="space-y-6">
        {/* Users by Role — live data from getCategorizedCounts */}
        <Card className="mb-6 shadow-sm border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-4 h-4" />
                Staff Overview
              </CardTitle>
              <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger className="w-48 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active Employees</SelectItem>
                  <SelectItem value="pending">Pending Invitations</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                  <SelectItem value="inactive">Inactive / Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              <button
                className="p-4 border border-slate-200 rounded-lg bg-white hover:shadow-md hover:border-slate-400 transition-all cursor-pointer text-left"
                onClick={() => navigate("/EmployeeDirectory?filter=officers")}
              >
                <div className="text-sm text-slate-500 mb-3">Officers</div>
                {loadingEmployees
                  ? <div className="h-9 w-12 bg-slate-200 rounded animate-pulse" />
                  : <div className="text-4xl font-bold text-slate-900">{statsByRole.officers}</div>
                }
              </button>
              <button
                className="p-4 border border-slate-200 rounded-lg bg-white hover:shadow-md hover:border-slate-400 transition-all cursor-pointer text-left"
                onClick={() => navigate("/EmployeeDirectory?filter=officestaff")}
              >
                <div className="text-sm text-slate-500 mb-3">Employees</div>
                {loadingEmployees
                  ? <div className="h-9 w-12 bg-slate-200 rounded animate-pulse" />
                  : <div className="text-4xl font-bold text-slate-900">{statsByRole.employees}</div>
                }
              </button>
              <button
                className="p-4 border border-slate-200 rounded-lg bg-white hover:shadow-md hover:border-slate-400 transition-all cursor-pointer text-left"
                onClick={() => navigate("/EmployeeDirectory?filter=supervisors")}
              >
                <div className="text-sm text-slate-500 mb-3">Supervisors</div>
                {loadingEmployees
                  ? <div className="h-9 w-12 bg-slate-200 rounded animate-pulse" />
                  : <div className="text-4xl font-bold text-slate-900">{statsByRole.supervisors}</div>
                }
              </button>
              <button
                className="p-4 border border-slate-200 rounded-lg bg-white hover:shadow-md hover:border-slate-400 transition-all cursor-pointer text-left"
                onClick={() => navigate("/EmployeeDirectory?filter=admin")}
              >
                <div className="text-sm text-slate-500 mb-3">Admins</div>
                {loadingEmployees
                  ? <div className="h-9 w-12 bg-slate-200 rounded animate-pulse" />
                  : <div className="text-4xl font-bold text-slate-900">{statsByRole.admins}</div>
                }
              </button>
              <button
                className="p-4 border border-[#c9a227] rounded-lg bg-[#c9a227]/5 hover:shadow-md hover:bg-[#c9a227]/10 transition-all cursor-pointer text-left"
                onClick={() => navigate("/EmployeeDirectory")}
              >
                <div className="text-sm text-[#c9a227] font-medium mb-3">Total</div>
                {loadingEmployees
                  ? <div className="h-9 w-12 bg-slate-200 rounded animate-pulse" />
                  : <div className="text-4xl font-bold text-slate-900">{staffFilteredEmployees.length}</div>
                }
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="mb-8 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <Button 
                onClick={() => navigate("/EmployeeDirectory")}
                className="bg-[#1a2b4a] hover:bg-[#2d4a6f] text-white h-auto py-4 flex flex-col items-center gap-2 shadow-sm"
              >
                <Users className="w-5 h-5" />
                <span className="text-xs text-center">Directory</span>
              </Button>
              <Button 
                onClick={() => navigate("/Scheduling")}
                className="bg-[#1a2b4a] hover:bg-[#2d4a6f] text-white h-auto py-4 flex flex-col items-center gap-2 shadow-sm"
              >
                <Calendar className="w-5 h-5" />
                <span className="text-xs text-center">Schedule</span>
              </Button>
              <Button 
                onClick={() => navigate("/PayrollIntegration")}
                className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold h-auto py-4 flex flex-col items-center gap-2 shadow-sm"
              >
                <DollarSign className="w-5 h-5" />
                <span className="text-xs text-center">Payroll</span>
              </Button>
              <Button 
               onClick={() => navigate("/InvoicesAdmin")}
               className="bg-[#1a2b4a] hover:bg-[#2d4a6f] text-white h-auto py-4 flex flex-col items-center gap-2 shadow-sm"
              >
               <Receipt className="w-5 h-5" />
               <span className="text-xs text-center">Invoices</span>
              </Button>
              <Button 
                onClick={() => navigate("/CredentialsDashboard")}
                className="bg-[#1a2b4a] hover:bg-[#2d4a6f] text-white h-auto py-4 flex flex-col items-center gap-2 shadow-sm"
              >
                <FileText className="w-5 h-5" />
                <span className="text-xs text-center">Credentials</span>
              </Button>
              <Button 
                onClick={() => navigate("/TrainingAssignments")}
                className="bg-[#1a2b4a] hover:bg-[#2d4a6f] text-white h-auto py-4 flex flex-col items-center gap-2 shadow-sm"
              >
                <GraduationCap className="w-5 h-5" />
                <span className="text-xs text-center">Training</span>
              </Button>
              </div>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
          {/* Pending Approvals */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Pending Approvals</CardTitle>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                {timesheets.length + incidents.length + ptoRequests.length} items
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {timesheets.length > 0 && (
                <div
                  onClick={() => navigate("/TimesheetsManagement")}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium">Timesheets</p>
                      <p className="text-sm text-slate-500">{timesheets.length} pending approval</p>
                    </div>
                  </div>
                  <Badge className="bg-[#c9a227]/10 text-[#c9a227] border-[#c9a227]/20">{timesheets.length}</Badge>
                </div>
              )}
              
              {incidents.length > 0 && (
                <div
                  onClick={() => navigate("/IncidentApproval")}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-slate-700" />
                    </div>
                    <div>
                      <p className="font-medium">Incident Reports</p>
                      <p className="text-sm text-slate-500">{incidents.length} awaiting review</p>
                    </div>
                  </div>
                  <Badge className="bg-slate-200 text-slate-700">{incidents.length}</Badge>
                </div>
              )}
              
              {ptoRequests.length > 0 && (
                <div
                  onClick={() => navigate("/PTOApproval")}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium">PTO Requests</p>
                      <p className="text-sm text-slate-500">{ptoRequests.length} pending</p>
                    </div>
                  </div>
                  <Badge className="bg-slate-200 text-slate-700">{ptoRequests.length}</Badge>
                </div>
              )}

              {timesheets.length === 0 && incidents.length === 0 && ptoRequests.length === 0 && (
                <div className="text-center py-6 text-slate-500">
                  <p>All caught up! No pending approvals.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Patrols */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Active Patrols</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate("/LiveMap")}
                className="text-[#c9a227]"
              >
                View Map
              </Button>
            </CardHeader>
            <CardContent>
              {activePatrols.length > 0 ? (
                <div className="space-y-3">
                  {activePatrols.slice(0, 4).map((patrol) => (
                    <div key={patrol.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Officer on Patrol</p>
                        <p className="text-sm text-slate-500">
                          {patrol.scanned_checkpoints || 0} / {patrol.total_checkpoints || 0} checkpoints
                        </p>
                      </div>
                      <div className="w-2 h-2 bg-[#c9a227] rounded-full animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500">
                  <Shield className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p>No active patrols at the moment</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Billing Section */}
        <Card className="mb-8 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Billing & Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <button 
                className="p-4 border border-slate-200 rounded-lg bg-slate-50 hover:shadow-md hover:border-slate-400 transition-all cursor-pointer text-left min-h-[120px] flex flex-col justify-between"
                onClick={() => navigate("/InvoicesAdmin")}
              >
                <div className="text-sm text-slate-500 mb-2">Overdue Invoices</div>
                <div className="text-3xl font-bold text-slate-900">{overdueInvoices}</div>
              </button>
              <button 
                className="p-4 border border-slate-200 rounded-lg bg-slate-50 hover:shadow-md hover:border-slate-400 transition-all cursor-pointer text-left min-h-[120px] flex flex-col justify-between"
                onClick={() => navigate("/InvoicesAdmin")}
              >
                <div className="text-sm text-slate-500 mb-2">Total Clients</div>
                <div className="text-3xl font-bold text-slate-900">{clients.length}</div>
              </button>
              <button 
                className="p-4 border border-slate-200 rounded-lg bg-slate-50 hover:shadow-md hover:border-slate-400 transition-all cursor-pointer text-left min-h-[120px] flex flex-col justify-between"
                onClick={() => navigate("/PendingInvites")}
              >
                <div className="text-sm text-slate-500 mb-2">Pending Invitations</div>
                {loadingEmployees
                  ? <div className="h-9 w-16 bg-slate-200 rounded animate-pulse" />
                  : <div className="text-3xl font-bold text-slate-900">{pendingInvitations}</div>
                }
              </button>
              <button 
                className="p-4 border border-slate-200 rounded-lg bg-slate-50 hover:shadow-md hover:border-slate-400 transition-all cursor-pointer text-left min-h-[120px] flex flex-col justify-between"
                onClick={() => navigate("/InviteUser")}
              >
                <div className="text-sm text-slate-500 mb-2">Invite New User</div>
                <div className="text-lg font-semibold text-[#c9a227]">+</div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Reports */}
        <Card className="mb-8 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Compliance & Training
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              <button 
                className="p-4 border border-slate-200 rounded-lg bg-slate-50 hover:shadow-md hover:border-slate-400 transition-all cursor-pointer text-left min-h-[120px] flex flex-col justify-between"
                onClick={() => navigate("/CredentialsDashboard?filter=expired")}
              >
                <div className="text-sm text-slate-500 mb-2">Expired Credentials</div>
                <div className="text-3xl font-bold text-slate-900">{expiredCredentials}</div>
              </button>
              <button 
                className="p-4 border border-[#c9a227] rounded-lg bg-[#c9a227]/5 hover:shadow-md hover:bg-[#c9a227]/10 transition-all cursor-pointer text-left min-h-[120px] flex flex-col justify-between"
                onClick={() => navigate("/CredentialsDashboard?filter=expiring")}
              >
                <div className="text-sm text-[#c9a227] font-medium mb-2">Expiring Soon (30d)</div>
                <div className="text-3xl font-bold text-slate-900">{expiringCredentials}</div>
              </button>
              <button 
                className="p-4 border border-slate-200 rounded-lg bg-slate-50 hover:shadow-md hover:border-slate-400 transition-all cursor-pointer text-left min-h-[120px] flex flex-col justify-between"
                onClick={() => navigate("/TrainingAssignments?filter=pending")}
              >
                <div className="text-sm text-slate-500 mb-2">Pending Training</div>
                <div className="text-3xl font-bold text-slate-900">{pendingTraining}</div>
              </button>
              <button 
                className="p-4 border border-slate-200 rounded-lg bg-slate-50 hover:shadow-md hover:border-slate-400 transition-all cursor-pointer text-left min-h-[120px] flex flex-col justify-between"
                onClick={() => navigate("/TrainingAssignments?filter=overdue")}
              >
                <div className="text-sm text-slate-500 mb-2">Overdue Training</div>
                <div className="text-3xl font-bold text-slate-900">{overdueTraining}</div>
              </button>
              <button
                className="p-4 border border-slate-200 rounded-lg bg-slate-50 hover:shadow-md hover:border-slate-400 transition-all cursor-pointer text-left min-h-[120px] flex flex-col justify-between"
                onClick={() => navigate("/OnboardingManagement")}
              >
                <div className="text-sm text-slate-500 mb-2">Onboarding Complete</div>
                {onboardingDocs.length === 0 ? (
                  <div className="text-sm text-slate-400 italic">No required docs</div>
                ) : onboardingCompletionPct === null ? (
                  <div className="h-9 w-16 bg-slate-200 rounded animate-pulse" />
                ) : (
                  <div className="w-full">
                    <div className="text-3xl font-bold text-slate-900 mb-2">{onboardingCompletionPct}%</div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${onboardingCompletionPct}%`,
                          backgroundColor: onboardingCompletionPct >= 80 ? "#22c55e" : onboardingCompletionPct >= 50 ? "#c9a227" : "#ef4444"
                        }}
                      />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{activeEmployees.length} active employees</div>
                  </div>
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Portal Login Chart */}
        <PortalLoginChart />

        {/* Activity Feed */}
        <ActivityFeed />

        {/* Unregistered Schedule Employees — data integrity audit */}
        <UnregisteredScheduleEmployees />

        {/* Shift Conflict Warnings */}
        <ShiftConflictWarnings />

        {/* Admin Shift Calendar View */}
        <AdminShiftCalendarView />

        {/* Patrol Progress by Site */}
        <PatrolProgressReport />

        {/* PTO Calendar View */}
        <div className="mb-6">
          <PTOCalendarView 
            ptoRequests={approvedPTOs}
            employees={employees}
            sites={sites}
          />
        </div>

        {/* Shift Calendar */}
        <div className="mb-6">
          <ShiftCalendar />
        </div>

        {/* Incident Map */}
        <div className="mb-6">
          <IncidentMap />
        </div>

        {/* Stats Cards */}
        <Card className="mb-8 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>Activity Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button onClick={() => navigate("/LiveMap")}>
                <StatCard
                  title="Active Officers"
                  value={activePatrols.length}
                  icon={Shield}
                  color="green"
                />
              </button>
              <button onClick={() => navigate("/TimesheetsManagement")}>
                <StatCard
                  title="Missed Punches"
                  value={timesheets.filter(t => !t.clock_out).length}
                  icon={Clock}
                  color="gold"
                />
              </button>
              <button onClick={() => navigate("/GPSViolations")}>
                <StatCard
                  title="Geofence Violations"
                  value={violations.length}
                  icon={MapPin}
                  color="red"
                />
              </button>
              <button onClick={() => navigate("/PTOApproval")}>
                <StatCard
                  title="PTO Pending"
                  value={ptoRequests.length}
                  icon={UserCheck}
                  color="blue"
                />
              </button>
            </div>
          </CardContent>
          </Card>
          </TabsContent>

          {/* Renewals Due Tab */}
          <TabsContent value="renewals">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Contracts Expiring Within 90 Days
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={renewalsDue.length > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}>
                    {renewalsDue.length === 0 ? "All Clear" : `${renewalsDue.length} Due`}
                  </Badge>
                  {renewalsDue.length > 0 && (
                    <Button 
                      onClick={() => handleDownloadRenewalsReport()} 
                      size="sm" 
                      variant="outline"
                      className="gap-1"
                    >
                      <Download className="w-4 h-4" />
                      Download Report
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {renewalsDue.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Building2 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>No contracts expiring within the next 90 days.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {renewalsDue.map((client) => {
                      const daysLeft = Math.ceil((new Date(client.contract_end_date) - now) / (1000 * 60 * 60 * 24));
                      const isUrgent = daysLeft <= 30;
                      return (
                        <div 
                          key={client.id}
                          className={`p-4 rounded-lg border-l-4 transition-all cursor-pointer hover:shadow-md ${
                            isUrgent 
                              ? 'bg-red-50 border-l-red-500' 
                              : 'bg-amber-50 border-l-amber-500'
                          }`}
                          onClick={() => navigate(`/ClientDetails?id=${client.id}`)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900">{client.name}</p>
                              <p className="text-sm text-slate-600 capitalize">{client.service_type} · {client.status}</p>
                            </div>
                            <Badge className={isUrgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                              {daysLeft} days
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-600">
                            <span>Expires: {new Date(client.contract_end_date).toLocaleDateString()}</span>
                            {client.primary_contact?.email && (
                              <span className="text-slate-500">{client.primary_contact.email}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Clients ({clients.length})
                </CardTitle>
                <Button onClick={() => setShowClientForm(true)} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] gap-1" size="sm">
                  <Plus className="w-4 h-4" /> Add Client
                </Button>
              </CardHeader>
              <CardContent>
                {clients.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Building2 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>No clients yet. Add your first client to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {clients.map((client) => (
                      <div key={client.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900">{client.name}</p>
                          <p className="text-xs text-slate-500 capitalize">{client.service_type} · {client.status}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/ClientDetails?id=${client.id}`)}>
                            <Edit className="w-4 h-4 text-slate-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => navigate(`/ClientDetails?id=${client.id}`)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Button onClick={() => navigate("/ClientManagement")} variant="outline" className="mt-4 w-full">
              View Full Client Management
            </Button>
          </TabsContent>
          </Tabs>
          </div>
          </div>
          </PullToRefresh>
          </ErrorBoundary>
          );
          }