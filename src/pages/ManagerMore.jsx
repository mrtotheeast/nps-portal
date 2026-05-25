import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  Users, Map, Shield, Clock, AlertTriangle, MapPin, GraduationCap,
  Award, BarChart3, FileText, MessageSquare, Bell, HelpCircle,
  Settings, User, LogOut, ChevronRight, Search, Calendar,
  ClipboardList, Star, TrendingUp, DollarSign, Building2, Layers,
  UserPlus, Zap, Bot
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useDualView } from "@/context/DualViewContext";

// Manager More = Supervisor More + additional sections
const MANAGER_SECTIONS = [
  {
    title: "Team Management",
    color: "bg-blue-100 text-blue-700",
    items: [
      { icon: Users, label: "My Team", page: "EmployeeDirectory", description: "View all employees assigned to my supervision" },
      { icon: Star, label: "Employee Reviews", page: "PerformanceReviews", description: "Conduct performance reviews for my team" },
      { icon: Calendar, label: "Assign Shifts", page: "Scheduling", description: "Assign and adjust shifts for my team" },
      { icon: Calendar, label: "Assign Schedules", page: "Schedule", description: "Create and publish schedules for my team" },
      { icon: GraduationCap, label: "Assign Training", page: "TrainingAssignments", description: "Assign training courses to team members" },
      { icon: ClipboardList, label: "PTO Requests", page: "PTOApproval", description: "Review and approve or deny PTO requests" },
    ]
  },
  {
    title: "Operations",
    color: "bg-emerald-100 text-emerald-700",
    items: [
      { icon: Map, label: "Live Map", page: "LiveMap", description: "Real-time officer locations on GPS map" },
      { icon: Shield, label: "Active Patrols", page: "PatrolReview", description: "View and monitor active patrols at my sites" },
      { icon: MapPin, label: "Site Check-In", page: "SiteCheckInManagement", description: "Check-in history and configuration" },
      { icon: AlertTriangle, label: "GPS Violations", page: "GPSViolations", description: "View geofence violations for my sites" },
      { icon: Calendar, label: "Schedule Management", page: "Scheduling", description: "View and manage all schedules across all sites" },
      { icon: DollarSign, label: "Payroll Overview", page: "TimesheetsManagement", description: "View payroll summary and approve timesheets" },
      { icon: Building2, label: "Site Management", page: "SiteManagement", description: "View site details and configurations" },
    ]
  },
  {
    title: "Incidents",
    color: "bg-red-100 text-red-700",
    items: [
      { icon: AlertTriangle, label: "Incident Approval", page: "IncidentApproval", description: "Review and approve incident reports" },
      { icon: FileText, label: "Incident Reports", page: "IncidentReports", description: "View all incidents at my assigned sites" },
    ]
  },
  {
    title: "People & HR",
    color: "bg-violet-100 text-violet-700",
    items: [
      { icon: Users, label: "Employee Directory", page: "EmployeeDirectory", description: "View all employees, not just assigned team" },
      { icon: Zap, label: "Bulk Employee Actions", page: "BulkEmployeeActions", description: "Perform actions on multiple employees at once" },
      { icon: Star, label: "Performance Reviews", page: "PerformanceReviewList", description: "View all performance reviews across the company" },
      { icon: UserPlus, label: "Onboarding", page: "Onboarding", description: "Manage new hire onboarding documents" },
    ]
  },
  {
    title: "Training",
    color: "bg-purple-100 text-purple-700",
    items: [
      { icon: GraduationCap, label: "All Training Courses", page: "Training", description: "View the full training library" },
      { icon: ClipboardList, label: "Training Assignments", page: "TrainingAssignments", description: "View training completion status across my team" },
      { icon: Award, label: "Training Leaderboard", page: "TrainingLeaderboard", description: "View top performers on my team" },
    ]
  },
  {
    title: "Reporting",
    color: "bg-amber-100 text-amber-700",
    items: [
      { icon: TrendingUp, label: "Analytics Dashboard", page: "AnalyticsDashboard", description: "Company-wide analytics and KPI metrics" },
      { icon: BarChart3, label: "Officer Analytics", page: "OfficerAnalytics", description: "Individual officer performance metrics" },
      { icon: Bot, label: "Custom Reports", page: "AIReports", description: "Generate custom reports with AI assistance" },
      { icon: BarChart3, label: "Team Reports", page: "Reports", description: "Patrol completion, timesheet summary, incident summary" },
      { icon: FileText, label: "Site Reports", page: "WeeklySiteReports", description: "Weekly site summary reports" },
    ]
  },
  {
    title: "Communication",
    color: "bg-cyan-100 text-cyan-700",
    items: [
      { icon: MessageSquare, label: "WorkChat", page: "Chat", description: "Team messaging" },
      { icon: Bell, label: "Announcements", page: "Announcements", description: "View company announcements" },
    ]
  },
  {
    title: "My Account",
    color: "bg-slate-100 text-slate-700",
    items: [
      { icon: User, label: "My Profile", page: "Profile", description: "Management profile view" },
      { icon: Settings, label: "Settings", page: "Settings", description: "Manager settings" },
      { icon: HelpCircle, label: "Help", page: "Help", description: "Help and support" },
    ]
  }
];

export default function ManagerMore() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { activeView, setActiveView } = useDualView();

  const { data: appSettings = [] } = useQuery({
    queryKey: ["app-settings"],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const payrollUrl = appSettings.find(s => s.setting_key === "employee_payroll_url")?.setting_value;

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const sectionsWithPayroll = MANAGER_SECTIONS.map(section => {
    if (section.title === "My Account" && payrollUrl) {
      return {
        ...section,
        items: [
          section.items[0],
          { icon: DollarSign, label: "My Payroll", url: payrollUrl, description: "View pay stubs, tax documents, and payroll information" },
          ...section.items.slice(1)
        ]
      };
    }
    return section;
  });

  // When in employee view, redirect to EmployeeMore
  if (activeView === "employee") {
    navigate("/EmployeeMore", { replace: true });
    return null;
  }

  const filteredSections = searchQuery.trim()
    ? sectionsWithPayroll.map(s => ({ ...s, items: s.items.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()) || item.description.toLowerCase().includes(searchQuery.toLowerCase())) })).filter(s => s.items.length > 0)
    : sectionsWithPayroll;

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* View indicator banner */}
      <div className="bg-[#1a2b4a] text-white">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-widest uppercase text-[#c9a227]">MANAGER VIEW</span>
            <button
              onClick={() => setActiveView("employee")}
              className="text-xs bg-[#c9a227]/20 hover:bg-[#c9a227]/30 border border-[#c9a227]/40 text-[#c9a227] rounded-full px-3 py-1 transition-all"
            >
              Switch to Employee View
            </button>
          </div>
        </div>

        <div className="px-4 pb-4">
          <Link to={createPageUrl("Profile")}>
            <div className="flex items-center gap-4 mb-3">
              <Avatar className="w-14 h-14 border-2 border-[#c9a227]">
                <AvatarImage src={user?.profile_photo} />
                <AvatarFallback className="bg-[#c9a227] text-[#1a2b4a] text-lg font-bold">{user?.full_name?.charAt(0) || "M"}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-base font-semibold">{user?.full_name || "Loading..."}</h2>
                <p className="text-slate-300 text-sm">{user?.email}</p>
                <Badge className="mt-1 bg-purple-600 text-white text-xs">Manager</Badge>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
          </Link>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search features..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-slate-400" />
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {filteredSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">{section.title}</h3>
            <Card className="shadow-sm overflow-hidden">
              <CardContent className="p-0 divide-y divide-slate-100">
                {section.items.map((item) => item.url ? (
                  <button key={item.label} onClick={() => window.open(item.url, "_blank")} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors w-full text-left">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${section.color}`}><item.icon className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0"><p className="font-medium text-sm text-slate-900">{item.label}</p><p className="text-xs text-slate-500 truncate">{item.description}</p></div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>
                ) : (
                  <Link key={item.label} to={createPageUrl(item.page)} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${section.color}`}><item.icon className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0"><p className="font-medium text-sm text-slate-900">{item.label}</p><p className="text-xs text-slate-500 truncate">{item.description}</p></div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        ))}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <button onClick={() => base44.auth.logout()} className="flex items-center gap-3 px-4 py-3 w-full hover:bg-red-50 transition-colors text-red-600 rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center"><LogOut className="w-4 h-4 text-red-600" /></div>
              <span className="font-medium text-sm">Sign Out</span>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}