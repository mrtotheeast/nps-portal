import React, { useState, useEffect } from "react";
import { useDualView } from "@/context/DualViewContext";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  Shield, Clock, AlertTriangle, Map, MapPin, Users, ChevronRight,
  Search, Grid3X3, List, Phone, Mail, Calendar, Briefcase, BarChart3, Award, DollarSign, Star, ExternalLink
} from "lucide-react";

// Fix leaflet default icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const activeOfficerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const patrolIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LoadingScreen from "@/components/shared/LoadingScreen";

// Reusable clickable stat tile
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

export default function SupervisorDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [teamSearch, setTeamSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [roleFilter, setRoleFilter] = useState("all");
  const { activeView, setActiveView } = useDualView();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: supervisorRecord } = useQuery({
    queryKey: ["supervisor-record", currentUser?.email],
    queryFn: async () => {
      const emps = await base44.entities.Employee.filter({ email: currentUser.email });
      return emps[0] || null;
    },
    enabled: !!currentUser?.email,
  });

  const supervisorId = supervisorRecord?.id;

  const { data: myTeam = [], isLoading: loadingTeam } = useQuery({
    queryKey: ["supervisor-team", supervisorId],
    queryFn: async () => {
      // Primary: employees with this supervisor assigned
      const bySupervisor = supervisorId
        ? await base44.entities.Employee.filter({ supervisor_id: supervisorId })
        : [];
      // Fallback: if none found, load all active officers
      if (bySupervisor.length > 0) return bySupervisor;
      return base44.entities.Employee.filter({ role: "officer", status: "active" });
    },
    enabled: true,
    refetchInterval: 30000,
  });

  const { data: activePatrols = [], isLoading: loadingPatrols } = useQuery({
    queryKey: ["active-patrols-sv"],
    queryFn: () => base44.entities.PatrolSession.filter({ status: "active" }),
    refetchInterval: 30000,
  });

  const { data: pendingTimesheets = [] } = useQuery({
    queryKey: ["pending-timesheets-sv"],
    queryFn: () => base44.entities.Timesheet.filter({ status: "pending" }),
  });

  const { data: pendingIncidents = [] } = useQuery({
    queryKey: ["pending-incidents-sv"],
    queryFn: () => base44.entities.Incident.filter({ status: "pending" }),
  });

  const { data: violations = [] } = useQuery({
    queryKey: ["gps-violations-sv"],
    queryFn: async () => {
      try { return await base44.entities.GPSViolation.filter({ status: "pending" }, "", 100); }
      catch { return []; }
    },
    staleTime: 120000,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites-sv"],
    queryFn: () => base44.entities.Site.list(),
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ["app-settings-sv"],
    queryFn: () => base44.entities.AppSettings.list(),
    staleTime: 300000,
  });
  const payrollUrl = appSettings.find(s => s.setting_key === "employee_payroll_url")?.setting_value;

  // Active timesheets today (clocked in, not yet clocked out) — for officer GPS map
  const { data: todayTimesheets = [] } = useQuery({
    queryKey: ["today-timesheets-sv"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      return base44.entities.Timesheet.filter({ date: today });
    },
    refetchInterval: 60000,
  });

  // Officers currently clocked in with GPS
  const clockedInOfficers = todayTimesheets
    .filter(ts => ts.clock_in && !ts.clock_out && ts.clock_in_location?.latitude)
    .map(ts => {
      const emp = myTeam.find(e => e.id === ts.employee_id);
      return emp ? { ...emp, lat: ts.clock_in_location.latitude, lng: ts.clock_in_location.longitude, status: "clocked_in" } : null;
    })
    .filter(Boolean);

  // Officers on active patrol with GPS
  const patrolOfficers = activePatrols
    .filter(p => p.start_location?.latitude)
    .map(p => {
      const emp = myTeam.find(e => e.id === p.employee_id);
      return emp ? { ...emp, lat: p.start_location.latitude, lng: p.start_location.longitude, status: "on_patrol" } : null;
    })
    .filter(Boolean);

  // Merge, deduplicate (patrol takes priority)
  const officersOnMap = [...patrolOfficers, ...clockedInOfficers.filter(c => !patrolOfficers.find(p => p.id === c.id))];
  const mapCenter = officersOnMap.length > 0
    ? [officersOnMap[0].lat, officersOnMap[0].lng]
    : [39.5, -98.35]; // US center fallback

  const getSite = (id) => sites.find(s => s.id === id);

  // Filter team
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
        <div className="bg-gradient-to-br from-[#1a2b4a] to-[#2d4a6f] text-white px-6 pt-6 pb-8">
          <p className="text-slate-300 text-sm mb-1">
            {new Date().getHours() < 12 ? "Good Morning" : new Date().getHours() < 17 ? "Good Afternoon" : "Good Evening"},
          </p>
          <h1 className="text-2xl font-bold">{currentUser?.full_name || "Supervisor"}</h1>
          <p className="text-slate-400 text-sm mt-2">Supervisor · Field operations overview</p>
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
              onClick={() => setActiveTab("team")}
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Live Map", page: "LiveMap", icon: Map },
              { label: "Site Check-In", page: "SiteCheckIn", icon: MapPin },
              { label: "Patrol Review", page: "PatrolReview", icon: Shield },
              { label: "Hours Summary", page: "TimesheetSummaryDashboard", icon: Clock },
              { label: "Site Reports", page: "WeeklySiteReports", icon: BarChart3 },
              { label: "Training Leaderboard", page: "TrainingLeaderboard", icon: Award },
              { label: "Incidents", page: "IncidentApproval", icon: AlertTriangle },
              { label: "Payroll", icon: DollarSign, isPayroll: true },
              { label: "Employee Reviews", page: "PerformanceReviews", icon: Briefcase },
            ].map((action) => (
              <Button
                key={action.label}
                onClick={() => {
                  if (action.isPayroll) {
                    window.open(payrollUrl || "https://www.google.com", "_blank");
                  } else {
                    navigate(createPageUrl(action.page));
                  }
                }}
                className="bg-[#1a2b4a] hover:bg-[#2d4a6f] h-auto py-3 flex flex-col items-center gap-2"
              >
                <action.icon className="w-5 h-5" />
                <span className="text-xs">{action.label}</span>
                {action.isPayroll && <ExternalLink className="w-3 h-3 opacity-60" />}
              </Button>
            ))}
          </div>

          {/* Tabs: Overview / My Team */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="team">My Team ({myTeam.length})</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-5">

              {/* Officer GPS Map */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Active Officer Locations</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/LiveMap")}>Full Map →</Button>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden rounded-b-xl">
                  {officersOnMap.length > 0 ? (
                    <MapContainer
                      center={mapCenter}
                      zoom={officersOnMap.length === 1 ? 13 : 10}
                      style={{ height: 280, width: "100%" }}
                      scrollWheelZoom={false}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                      {officersOnMap.map(officer => (
                        <Marker
                          key={officer.id}
                          position={[officer.lat, officer.lng]}
                          icon={officer.status === "on_patrol" ? patrolIcon : activeOfficerIcon}
                        >
                          <Popup>
                            <div className="text-sm">
                              <p className="font-semibold">{officer.firstName} {officer.lastName}</p>
                              <p className="text-slate-500">{officer.positionTitle || officer.role}</p>
                              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${officer.status === "on_patrol" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
                                {officer.status === "on_patrol" ? "On Patrol" : "Clocked In"}
                              </span>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  ) : (
                    <div className="py-10 text-center text-slate-500">
                      <MapPin className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">No officers with GPS data online right now</p>
                      <p className="text-xs text-slate-400 mt-1">Officers appear here once they clock in with location enabled</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Active Patrols */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="flex items-center gap-2"><Shield className="w-4 h-4" /> Active Patrols</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/PatrolReview")}>Review →</Button>
                </CardHeader>
                <CardContent>
                  {activePatrols.length > 0 ? (
                    <div className="space-y-3">
                      {activePatrols.slice(0, 5).map((patrol) => {
                        const officer = myTeam.find(e => e.id === patrol.employee_id);
                        return (
                          <div key={patrol.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#1a2b4a] flex items-center justify-center">
                                <Shield className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{officer ? `${officer.firstName} ${officer.lastName}` : "Active Officer"}</p>
                                <p className="text-xs text-slate-500">{patrol.scanned_checkpoints || 0}/{patrol.total_checkpoints || 0} checkpoints</p>
                              </div>
                            </div>
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Shield className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p>No active patrols</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Employee Review Section */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="flex items-center gap-2"><Star className="w-4 h-4" /> Team Reviews</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/PerformanceReviews")}>All Reviews →</Button>
                </CardHeader>
                <CardContent>
                  {myTeam.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-sm">No team members assigned yet</div>
                  ) : (
                    <div className="divide-y">
                      {myTeam.filter(e => e.status === "active").slice(0, 6).map(emp => (
                        <div key={emp.id} className="flex items-center gap-3 py-3">
                          <div className="w-9 h-9 rounded-full bg-[#1a2b4a] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{emp.firstName} {emp.lastName}</p>
                            <p className="text-xs text-slate-500">{emp.positionTitle || emp.role} {emp.hireDate ? `· Hired ${emp.hireDate}` : ""}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs flex-shrink-0"
                            onClick={() => navigate(`/PerformanceReviews?employee_id=${emp.id}`)}
                          >
                            <Briefcase className="w-3 h-3 mr-1" /> Review
                          </Button>
                        </div>
                      ))}
                      {myTeam.filter(e => e.status === "active").length > 6 && (
                        <p className="text-xs text-slate-400 pt-3 text-center">
                          +{myTeam.filter(e => e.status === "active").length - 6} more — <button className="text-[#c9a227] underline" onClick={() => setActiveTab("team")}>view all in My Team</button>
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

            </TabsContent>

            {/* My Team Tab */}
            <TabsContent value="team">
              {/* No supervisor ID warning */}
              {!supervisorId && (
                <Card className="mb-4 border-amber-200 bg-amber-50">
                  <CardContent className="p-4 text-amber-700 text-sm">
                    ⚠ No sites assigned to your account. Contact your administrator.
                  </CardContent>
                </Card>
              )}

              {/* Filters */}
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
                        <option value="employee">Employee</option>
                      </select>
                      <Button
                        variant={viewMode === "grid" ? "default" : "outline"}
                        size="icon"
                        onClick={() => setViewMode("grid")}
                        className="w-9 h-9"
                      >
                        <Grid3X3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={viewMode === "list" ? "default" : "outline"}
                        size="icon"
                        onClick={() => setViewMode("list")}
                        className="w-9 h-9"
                      >
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
                        onClick={() => navigate(`/EmployeeProfile?id=${emp.id}&viewer=supervisor`)}
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
                /* List View */
                <Card className="shadow-sm overflow-hidden">
                  <div className="divide-y">
                    {filteredTeam.map(emp => {
                      const primarySite = emp.siteIds?.[0] ? getSite(emp.siteIds[0]) : null;
                      return (
                        <div
                          key={emp.id}
                          className="flex items-center gap-4 p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/EmployeeProfile?id=${emp.id}&viewer=supervisor`)}
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