import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Building2, Calendar, Clock, AlertTriangle, GraduationCap, Award, FileText,
  Receipt, MessageSquare, Bell, Settings, Shield, MapPin, Briefcase, Upload,
  ChevronRight, LogOut, BarChart3, Map, Sparkles, Trash2, DollarSign, UserPlus,
  ClipboardList, Lock, Star, CreditCard, Globe, Search, Home
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const ALL_SECTIONS = [
  {
    title: "People & HR",
    color: "blue",
    items: [
      { icon: Users, label: "Employee Directory", page: "EmployeeDirectory", description: "Add, manage, and invite employees" },
      { icon: UserPlus, label: "Profile Photo Approvals", page: "ProfilePhotoApproval", description: "Approve employee photos" },
      { icon: Users, label: "Team Assignments", page: "TeamAssignments", description: "Assign employees to supervisors and managers" },
      { icon: Users, label: "Bulk Employee Actions", page: "BulkEmployeeActions", description: "Mass employee operations" },
      { icon: FileText, label: "Onboarding Management", page: "OnboardingManagement", description: "Manage new hire documents, tasks & compliance" },
      { icon: Star, label: "Performance Reviews", page: "PerformanceReviewList", description: "Employee evaluations" },
      { icon: Award, label: "Recognition System", page: "RecognitionSystem", description: "Recognize employee achievements" },
      { icon: Briefcase, label: "Position Management", page: "PositionManagement", description: "Manage roles and pay rates" },
    ]
  },
  {
    title: "Operations",
    color: "purple",
    items: [
      { icon: Calendar, label: "Scheduling", page: "Scheduling", description: "Create and manage schedules" },
      { icon: Clock, label: "Timesheet Management", page: "TimesheetsManagement", description: "Review & approve timesheets" },
      { icon: Shield, label: "Patrol Review", page: "PatrolReview", description: "Review completed patrol sessions" },
      { icon: Shield, label: "Patrol Playback", page: "PatrolPlayback", description: "Replay patrol routes with maps" },
      { icon: Trash2, label: "Deleted Patrols Archive", page: "DeletedPatrolsReport", description: "Audit trail of deleted patrols" },
      { icon: Map, label: "Live Map", page: "LiveMap", description: "Track officers in real-time" },
      { icon: MapPin, label: "GPS Violations", page: "GPSViolations", description: "View geofence violations" },
      { icon: MapPin, label: "QR Code Management", page: "SiteQRManagement", description: "Create and manage site QR codes" },
      { icon: Settings, label: "Site Check-In Config", page: "SiteCheckInConfig", description: "Configure site check-in settings" },
      { icon: ClipboardList, label: "Site Inspections", page: "SiteInspections", description: "Inspection checklists" },
      { icon: Calendar, label: "Shift Bidding", page: "ShiftBidding", description: "Employees bid on open shifts" },
    ]
  },
  {
    title: "Incidents & Security",
    color: "red",
    items: [
      { icon: AlertTriangle, label: "Incident Approval", page: "IncidentApproval", description: "Review and approve incident reports" },
      { icon: AlertTriangle, label: "Create Incident (AI)", page: "IncidentFormAI", description: "AI-assisted incident filing" },
      { icon: AlertTriangle, label: "Incident Analysis", page: "IncidentAnalysis", description: "Incident reporting & management" },
      { icon: Sparkles, label: "AI Incident Analysis", page: "AIIncidentAnalysis", description: "AI-powered pattern detection" },
      { icon: Shield, label: "State Licensing", page: "StateLicensing", description: "Manage state security licenses" },
      { icon: Award, label: "Credentials Dashboard", page: "CredentialsDashboard", description: "Monitor expiring licenses" },
      { icon: Award, label: "Credentials Management", page: "CredentialsManagement", description: "Track employee certifications" },
    ]
  },
  {
    title: "Clients & Sites",
    color: "emerald",
    items: [
      { icon: Briefcase, label: "Client Management", page: "ClientManagement", description: "Manage client accounts" },
      { icon: Building2, label: "Client Onboarding", page: "ClientOnboarding", description: "Step-by-step new client setup" },
      { icon: Building2, label: "Site Management", page: "SiteManagement", description: "Manage job sites and locations" },
      { icon: Globe, label: "Client Contracts", page: "ClientContracts", description: "Manage client agreements" },
      { icon: MessageSquare, label: "Client Communication Hub", page: "ClientCommunicationHub", description: "Client messaging & updates" },
    ]
  },
  {
    title: "Training & Development",
    color: "purple",
    items: [
      { icon: Globe, label: "Sign Up for Training", url: "https://www.nationwidepolice.com/training", description: "Register for NPS training classes" },
      { icon: GraduationCap, label: "Training Management", page: "Training", description: "Manage training courses" },
      { icon: Sparkles, label: "AI Training Builder", page: "AITrainingBuilder", description: "Generate AI-powered training" },
      { icon: Users, label: "Training Assignments", page: "TrainingAssignments", description: "Assign & track training progress" },
      { icon: BarChart3, label: "Training Leaderboard", page: "TrainingLeaderboard", description: "Top training performers" },
      { icon: Award, label: "Badge Management", page: "BadgeManagement", description: "Create training badges & rewards" },
      { icon: FileText, label: "Certificate Templates", page: "CertificateTemplates", description: "Upload completion certificates" },
      { icon: Sparkles, label: "Training Suggestions (AI)", page: "TrainingSuggestions", description: "AI-powered recommendations" },
    ]
  },
  {
    title: "Billing & Payroll",
    color: "green",
    items: [
      { icon: DollarSign, label: "Accounting Dashboard", page: "AccountingDashboard", description: "AR, aging reports & revenue" },
      { icon: Receipt, label: "Invoices", page: "InvoicesAdmin", description: "View and manage all invoices" },
      { icon: Receipt, label: "Create Invoice", page: "InvoiceCreate", description: "Create a new client invoice" },
      { icon: DollarSign, label: "Employee Payroll Portal", page: "PayrollPortal", description: "Access employee payroll self-service" },
      { icon: DollarSign, label: "Payroll Export", page: "PayrollExport", description: "Export payroll data to CSV" },
      { icon: Settings, label: "Payroll Settings", page: "PayrollSettings", description: "Configure payroll provider & column mappings" },
      { icon: FileText, label: "Tax Forms (W-2 & 1099)", page: "TaxForms", description: "Generate year-end tax forms" },
      { icon: Calendar, label: "PTO Approval", page: "PTOApproval", description: "Approve/deny time off requests" },
      { icon: Calendar, label: "PTO Calendar", page: "PTOCalendar", description: "Full team time off calendar" },
      { icon: Settings, label: "PTO Settings", page: "PTOSettings", description: "Configure accrual rates & carryover" },
    ]
  },
  {
    title: "Documents & Communication",
    color: "amber",
    items: [
      { icon: FileText, label: "Document Library", page: "DocumentAdmin", description: "Upload policies & company forms" },
      { icon: FileText, label: "Policy Management", page: "PolicyManagement", description: "Company policies with AI" },
      { icon: Bell, label: "Announcements", page: "Announcements", description: "Post company-wide announcements" },
      { icon: MessageSquare, label: "Team Messenger", page: "Chat", description: "Team communication" },
      { icon: Shield, label: "DM Monitor (Admin)", page: "AdminDMMonitor", description: "Security review of direct messages" },
      { icon: Briefcase, label: "Uniform Inventory", page: "UniformInventory", description: "Track and manage uniform stock" },
    ]
  },
  {
    title: "Analytics & Reports",
    color: "pink",
    items: [
      { icon: BarChart3, label: "Analytics Dashboard", page: "AdminAnalyticsDashboard", description: "Comprehensive metrics & AI insights" },
      { icon: BarChart3, label: "Reporting Dashboard", page: "Reports", description: "All reports and exports" },
      { icon: BarChart3, label: "Patrol Analytics", page: "PatrolAnalytics", description: "Patrol trends & completion rates" },
      { icon: BarChart3, label: "Officer Analytics", page: "OfficerAnalytics", description: "Individual officer performance" },
      { icon: Sparkles, label: "AI Reports", page: "AIReportsNew", description: "Scheduled AI analytics" },
      { icon: BarChart3, label: "Report Automation", page: "ReportAutomation", description: "Automated report generation" },
      { icon: BarChart3, label: "Weekly Site Reports", page: "WeeklySiteReports", description: "Per-site weekly summaries" },
    ]
  },
  {
    title: "Data Management",
    color: "slate",
    items: [
      { icon: Upload, label: "Bulk Import Employees", page: "DataImport", description: "Import employees via CSV or AI PDF extraction" },
      { icon: Building2, label: "Bulk Import Job Sites", page: "SiteManagement", description: "Import sites via CSV or AI PDF extraction", state: { openBulk: true } },
    ]
  },
  {
    title: "Reference Tools",
    color: "slate",
    items: [
      { icon: Shield, label: "CCW Reciprocity Map", page: "CCWReciprocityMap", description: "Concealed carry laws & state reciprocity" },
    ]
  },
  {
    title: "System & Settings",
    color: "slate",
    items: [
      { icon: Settings, label: "Settings", page: "Settings", description: "App branding, PTO, scheduling & more" },
      { icon: Lock, label: "Roles & Permissions", page: "RolesPermissions", description: "Role-based access control" },
      { icon: Shield, label: "Role Workspaces", page: "RoleWorkspaceAdmin", description: "Create & manage role workspaces" },
      { icon: Shield, label: "Audit Log", page: "AuditLog", description: "View system audit trail" },
    ]
  },
];

const colorMap = {
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  red: "bg-red-100 text-red-700",
  emerald: "bg-emerald-100 text-emerald-700",
  green: "bg-green-100 text-green-700",
  amber: "bg-amber-100 text-amber-700",
  pink: "bg-pink-100 text-pink-700",
  slate: "bg-slate-100 text-slate-700",
};

export default function AdminMore() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  // Double-lock: role check + exact email check — invisible to everyone else
  const SUPER_ADMIN_EMAIL = 'justin.ashe@nationwidepolice.com';
  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL &&
    (user?.role === 'super_admin' || user?.role_type === 'super_admin');

  const { data: appSettings = [] } = useQuery({
    queryKey: ["app-settings"],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const payrollUrl = appSettings.find(s => s.setting_key === "employee_payroll_url")?.setting_value;

  const sectionsWithPayroll = ALL_SECTIONS.map(section => {
    if (section.title === "Billing & Payroll" && payrollUrl) {
      return {
        ...section,
        items: [
          ...section.items,
          { icon: DollarSign, label: "Employee Payroll Portal", url: payrollUrl, description: "Access employee self-service payroll portal" }
        ]
      };
    }
    return section;
  });

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const filteredSections = searchQuery.trim()
    ? sectionsWithPayroll.map(section => ({
        ...section,
        items: section.items.filter(item =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(s => s.items.length > 0)
    : sectionsWithPayroll;

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* User Card */}
      <div className="bg-[#1a2b4a] text-white px-4 pt-6 pb-4">
        <Link to={createPageUrl("Profile")}>
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-16 h-16 border-2 border-[#c9a227]">
              <AvatarImage src={user?.profile_photo} />
              <AvatarFallback className="bg-[#c9a227] text-[#1a2b4a] text-xl font-bold">
                {user?.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{user?.full_name || "Loading..."}</h2>
              <p className="text-slate-300 text-sm">{user?.email}</p>
              <Badge className="mt-1 bg-[#c9a227] text-[#1a2b4a] text-xs">
                {user?.role_type?.replace("_", " ").toUpperCase() || "Admin"}
              </Badge>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
        </Link>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search features..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:bg-white/20"
          />
        </div>
      </div>

      {/* Quick Links */}
      {!searchQuery && (
        <div className="px-4 py-3 bg-white border-b">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Quick Access</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { label: "Settings", page: "Settings", icon: Settings },
              { label: "Schedule", page: "Scheduling", icon: Calendar },
              { label: "Timesheets", page: "TimesheetsManagement", icon: Clock },
              { label: "Live Map", page: "LiveMap", icon: Map },
              { label: "Incidents", page: "IncidentApproval", icon: AlertTriangle },
              { label: "Training", page: "TrainingAssignments", icon: GraduationCap },
              { label: "Invoices", page: "InvoicesAdmin", icon: Receipt },
            ].map(item => (
              <Link key={item.page} to={createPageUrl(item.page)}
                className="flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors min-w-[64px]">
                <item.icon className="w-5 h-5 text-[#1a2b4a]" />
                <span className="text-xs text-slate-700 font-medium whitespace-nowrap">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="px-4 py-4 space-y-5">
        {filteredSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
              {section.title}
            </h3>
            <Card className="shadow-sm overflow-hidden">
              <CardContent className="p-0 divide-y divide-slate-100">
                {section.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => item.url ? window.open(item.url, "_blank") : item.state ? navigate(createPageUrl(item.page), { state: item.state }) : navigate(createPageUrl(item.page))}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors active:bg-slate-100 cursor-pointer w-full text-left"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap[section.color] || colorMap.slate}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900">{item.label}</p>
                      <p className="text-xs text-slate-500 truncate">{item.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        ))}

        {/* Super Admin Platform Management — only visible to justin.ashe@nationwidepolice.com */}
        {isSuperAdmin && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
              Platform Administration
            </h3>
            <Card className="shadow-sm overflow-hidden border-[#c9a227]/40">
              <CardContent className="p-0 divide-y divide-slate-100">
                <button
                  onClick={() => navigate("/SuperAdminDashboard")}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-amber-50 transition-colors w-full text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#c9a227]/15 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-[#c9a227]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900">Company Management</p>
                    <p className="text-xs text-slate-500">Manage all tenant companies & subscriptions</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sign Out */}
        <Card className="shadow-sm mt-2">
          <CardContent className="p-0">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full hover:bg-red-50 transition-colors text-red-600 rounded-xl"
            >
              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                <LogOut className="w-4 h-4 text-red-600" />
              </div>
              <span className="font-medium text-sm">Sign Out</span>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}