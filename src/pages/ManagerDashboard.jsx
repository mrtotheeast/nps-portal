import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Shield, Clock, AlertTriangle, Map, MapPin, Users, ChevronRight,
  Search, Grid3X3, List, Phone, Mail, Briefcase, BarChart3, Award
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { useDualView } from "@/context/DualViewContext";

function StatTile({ label, value, icon: IconComp, color, onClick, loading }) {
  const colorMap = {
    emerald: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50",
    red: "text-red-600 bg-red-50",
    blue: "text-blue-600 bg-blue-50",
    gold: "text-[#c9a227] bg-[#c9a227]/10",
    navy: "text-[#1a2b4a] bg-[#1a2b4a]/10",
  };
  const cls = colorMap[color] || colorMap.navy;
  const textCls = cls.split(" ")[0];
  const bgCls = cls.split(" ")[1];
  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden group"
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            {loading
              ? <div className="h-9 w-12 bg-slate-200 rounded animate-pulse" />
              : <p className={`text-3xl font-bold ${textCls}`}>{value}</p>
            }
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgCls}`}>
            <IconComp className={`w-5 h-5 ${textCls}`} />
          </div>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 absolute bottom-3 right-3 group-hover:text-slate-500 transition-colors" />
      </CardContent>
    </Card>
  );
}

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [teamSearch, setTeamSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [roleFilter, setRoleFilter] = useState("all");
  const { activeView, setActiveView } = useDualView();

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: managerRecord } = useQuery({
    queryKey: ["manager-record", currentUser?.email],
    queryFn: async () => {
      const emps = await base44.entities.Employee.filter({ email: currentUser.email });
      return emps[0] || null;
    },
    enabled: !!currentUser?.email,
  });

  const managerId = managerRecord?.id;

  const { data: myTeam = [], isLoading: loadingTeam } = useQuery({
    queryKey: ["manager-team", managerId],
    queryFn: async () => {
      // Primary: employees assigned to this manager
      const byManager = managerId
        ? await base44.entities.Employee.filter({ manager_id: managerId })
        : [];
      if (byManager.length > 0) return byManager;
      // Fallback: also check supervisor-assigned employees (managers oversee supervisors too)
      const bySupervisor = managerId
        ? await base44.entities.Employee.filter({ supervisor_id: managerId })
        : [];
      if (bySupervisor.length > 0) return bySupervisor;
      return base44.entities.Employee.filter({ status: "active" });
    },
    enabled: true,
    refetchInterval: 30000,
  });

  const { data: activePatrols = [], isLoading: loadingPatrols } = useQuery({
    queryKey: ["active-patrols-mgr"],
    queryFn: () => base44.entities.PatrolSession.filter({ status: "active" }),
    refetchInterval: 30000,
  });

  const { data: pendingTimesheets = [] } = useQuery({
    queryKey: ["pending-timesheets-mgr"],
    queryFn: () => base44.entities.Timesheet.filter({ status: "pending" }),
  });

  const { data: pendingIncidents = [] } = useQuery({
    queryKey: ["pending-incidents-mgr"],
    queryFn: () => base44.entities.Incident.filter({ status: "pending" }),
  });

  const { data: violations = [] } = useQuery({
    queryKey: ["gps-violations-mgr"],
    queryFn: async () => {
      try { return await base44.entities.GPSViolation.filter({ status: "pending" }, "", 100); }
      catch { return []; }
    },
    staleTime: 120000,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites-mgr"],
    queryFn: () => base44.entities.Site.list(),
  });

  const getSite = (id) => sites.find(s => s.id === id);

  const filteredTeam = myTeam.filter(emp => {
    const name = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const matchSearch = !teamSearch || name.includes(teamSearch.toLowerCase()) || emp.email?.includes(teamSearch.toLowerCase());
    const matchRole = roleFilter === "all" || emp.role === roleFilter;
    return matchSearch && matchRole;
  });

  const activeTeam = myTeam.filter(e => e.status === "active").length;

  const roleColors = {
    officer: "bg-blue-100 text-blue-700",
    employee: "bg-slate-100 text-slate-700",
    supervisor: "bg-purple-100 text-purple-700",
    manager: "bg-amber-100 text-amber-700",
    admin: "bg-red-100 text-red-700",
  };

  const statusColors = {
    active: "bg-emerald-100 text-emerald-700",
    inactive: "bg-slate-100 text-slate-500",
    on_leave: "bg-amber-100 text-amber-700",
    terminated: "bg-red-100 text-red-700",
  };

  if (loadingPatrols && loadingTeam) return <LoadingScreen message="Loading dashboard..." />;

  return (
    <PullToRefresh onRefresh={() => queryClient.invalidateQueries()}>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#1a2b4a] to-[#2d4a6f] text-white px-6 pt-6 pb-8">
          <p className="text-slate-300 text-sm mb-1">
            {new Date().getHours() < 12 ? "Good Morning" : new Date().getHours() < 17 ? "Good Afternoon" : "Good Evening"},
          </p>
          <h1 className="text-2xl font-bold">{currentUser?.full_name || "Manager"}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <p className="text-slate-400 text-sm">Manager · Operations overview</p>
            <div className="flex items-center gap-1 bg-white/10 rounded-full px-1 py-1">
              <button
                onClick={() => { setActiveView("employee"); navigate("/EmployeeHome"); }}
                className={`text-xs px-3 py-0.5 rounded-full transition-all ${activeView === "employee" ? "bg-[#c9a227] text-[#1a2b4a] font-semibold" : "text-slate-300 hover:text-white"}`}
              >
                Employee
              </button>
              <button
                onClick={() => setActiveView("management")}
                className={`text-xs px-3 py-0.5 rounded-full transition-all ${activeView !== "employee" ? "bg-[#c9a227] text-[#1a2b4a] font-semibold" : "text-slate-300 hover:text-white"}`}
              >
                Manager
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 pb-24">

          {/* Stat Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <StatTile
              label="My Team"
              value={myTeam.length}
              icon={Users}
              color="gold"
              loading={loadingTeam}
              onClick={() => document.getElementById("mgr-team-tab")?.click()}
            />
            <StatTile
              label="Active Patrols"
              value={activePatrols.length}
              icon={Shield}
              color="emerald"
              onClick={() => navigate("/PatrolReview")}
            />
            <StatTile
              label="Pending Timesheets"
              value={pendingTimesheets.length}
              icon={Clock}
              color="amber"
              onClick={() => navigate("/TimesheetsManagement")}
            />
            <StatTile
              label="Open Incidents"
              value={pendingIncidents.length}
              icon={AlertTriangle}
              color="red"
              onClick={() => navigate("/IncidentApproval")}
            />
            <StatTile
              label="GPS Violations"
              value={violations.length}
              icon={MapPin}
              color="red"
              onClick={() => navigate("/GPSViolations")}
            />
            <StatTile
              label="Active Officers"
              value={activeTeam}
              icon={Users}
              color="navy"
              loading={loadingTeam}
              onClick={() => navigate("/LiveMap")}
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Live Map", page: "LiveMap", icon: Map },
              { label: "Site Check-In", page: "SiteCheckIn", icon: MapPin },
              { label: "Patrol Review", page: "PatrolReview", icon: Shield },
              { label: "Hours Summary", page: "TimesheetSummaryDashboard", icon: Clock },
              { label: "Site Reports", page: "WeeklySiteReports", icon: BarChart3 },
              { label: "Training Leaderboard", page: "TrainingLeaderboard", icon: Award },
              { label: "Incidents", page: "IncidentApproval", icon: AlertTriangle },
              { label: "Employee Reviews", page: "PerformanceReviews", icon: Briefcase },
            ].map((action) => (
              <Button
                key={action.page}
                onClick={() => navigate(createPageUrl(action.page))}
                className="bg-[#1a2b4a] hover:bg-[#2d4a6f] h-auto py-3 flex flex-col items-center gap-2"
              >
                <action.icon className="w-5 h-5" />
                <span className="text-xs">{action.label}</span>
              </Button>
            ))}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="team" id="mgr-team-tab">
                My Team ({myTeam.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle>Active Patrols</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/LiveMap")}>
                    View Map →
                  </Button>
                </CardHeader>
                <CardContent>
                  {activePatrols.length > 0 ? (
                    <div className="space-y-3">
                      {activePatrols.slice(0, 5).map((patrol) => (
                        <div key={patrol.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#1a2b4a] flex items-center justify-center">
                              <Shield className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Active Officer</p>
                              <p className="text-xs text-slate-500">{patrol.scanned_checkpoints || 0}/{patrol.total_checkpoints || 0} checkpoints</p>
                            </div>
                          </div>
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Shield className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p>No active patrols</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team">
              <Card className="mb-4 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search team by name or email..."
                        value={teamSearch}
                        onChange={e => setTeamSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={roleFilter}
                        onChange={e => setRoleFilter(e.target.value)}
                        className="border rounded-md px-3 py-2 text-sm text-slate-700 bg-white"
                      >
                        <option value="all">All Roles</option>
                        <option value="officer">Officer</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="employee">Employee</option>
                      </select>
                      <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" onClick={() => setViewMode("grid")} className="w-9 h-9">
                        <Grid3X3 className="w-4 h-4" />
                      </Button>
                      <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")} className="w-9 h-9">
                        <List className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">{filteredTeam.length} employee{filteredTeam.length !== 1 ? "s" : ""}</p>
                </CardContent>
              </Card>

              {loadingTeam ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4 h-32 bg-slate-100 rounded-xl" />
                    </Card>
                  ))}
                </div>
              ) : filteredTeam.length === 0 ? (
                <Card className="shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">
                      {myTeam.length === 0
                        ? "No team members assigned yet. Contact your administrator."
                        : "No employees match your search."}
                    </p>
                  </CardContent>
                </Card>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTeam.map(emp => {
                    const primarySite = emp.siteIds?.[0] ? getSite(emp.siteIds[0]) : null;
                    return (
                      <Card
                        key={emp.id}
                        className="shadow-sm cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all group"
                        onClick={() => navigate(`/EmployeeProfile?id=${emp.id}&viewer=manager`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="w-12 h-12 flex-shrink-0">
                              <AvatarImage src={emp.profilePhotoUrl} />
                              <AvatarFallback className="bg-[#1a2b4a] text-white font-semibold">
                                {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 truncate">{emp.firstName} {emp.lastName}</p>
                              <p className="text-xs text-slate-500 truncate">{emp.positionTitle || "No position"}</p>
                              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                <Badge className={`text-xs px-1.5 py-0 ${roleColors[emp.role] || "bg-slate-100 text-slate-700"}`}>
                                  {emp.role}
                                </Badge>
                                <Badge className={`text-xs px-1.5 py-0 ${statusColors[emp.status] || "bg-slate-100 text-slate-700"}`}>
                                  {emp.status}
                                </Badge>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors flex-shrink-0 mt-1" />
                          </div>
                          <div className="mt-3 space-y-1">
                            {emp.phoneNumber && (
                              <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                                <Phone className="w-3 h-3 flex-shrink-0" /> {emp.phoneNumber}
                              </p>
                            )}
                            {emp.email && (
                              <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                                <Mail className="w-3 h-3 flex-shrink-0" /> {emp.email}
                              </p>
                            )}
                            {primarySite && (
                              <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                                <MapPin className="w-3 h-3 flex-shrink-0" /> {primarySite.name}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="shadow-sm overflow-hidden">
                  <div className="divide-y">
                    {filteredTeam.map(emp => {
                      const primarySite = emp.siteIds?.[0] ? getSite(emp.siteIds[0]) : null;
                      return (
                        <div
                          key={emp.id}
                          className="flex items-center gap-4 p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/EmployeeProfile?id=${emp.id}&viewer=manager`)}
                        >
                          <Avatar className="w-10 h-10 flex-shrink-0">
                            <AvatarImage src={emp.profilePhotoUrl} />
                            <AvatarFallback className="bg-[#1a2b4a] text-white text-sm">
                              {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900">{emp.firstName} {emp.lastName}</p>
                            <p className="text-xs text-slate-500">{emp.positionTitle || emp.role} {primarySite ? `· ${primarySite.name}` : ""}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className={`text-xs ${statusColors[emp.status] || "bg-slate-100 text-slate-700"}`}>
                              {emp.status}
                            </Badge>
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PullToRefresh>
  );
}