import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isToday, parseISO, differenceInDays, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { useDualView } from "@/context/DualViewContext";
import {
  Clock, AlertTriangle, FileText, Calendar, Shield,
  Bell, ChevronRight, MapPin, GraduationCap, Sun, Moon,
  Sunrise, PlusCircle, ClipboardList, AlertCircle, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LoadingScreen from "@/components/shared/LoadingScreen";
import QuickIncidentForm from "@/components/incidents/QuickIncidentForm";

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [clockingIn, setClockingIn] = useState(false);
  const { activeView, setActiveView } = useDualView();

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  const userRole = user?.role_type || user?.role;
  const isSupervisor = userRole === "supervisor";
  const isManager = userRole === "manager";

  useEffect(() => {
    if (!user) return;
    if (activeView === "management") {
      if (isSupervisor) { navigate(createPageUrl("SupervisorDashboard"), { replace: true }); }
      else if (isManager) { navigate(createPageUrl("ManagerDashboard"), { replace: true }); }
    }
  }, [activeView, isSupervisor, isManager, navigate, user]);

  const { data: myEmployee, isLoading: loadingEmployee } = useQuery({
    queryKey: ["my-employee-record", user?.email],
    queryFn: async () => {
      const emps = await base44.entities.Employee.filter({ email: user.email });
      return emps[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const empId = myEmployee?.id;

  // Site info
  const primarySiteId = myEmployee?.siteIds?.[0];
  const { data: primarySite } = useQuery({
    queryKey: ["my-primary-site", primarySiteId],
    queryFn: () => base44.entities.Site.filter({ id: primarySiteId }).then(r => r[0] || null),
    enabled: !!primarySiteId,
  });

  // Today's shifts
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: shifts = [] } = useQuery({
    queryKey: ["my-shifts-today", empId],
    queryFn: () => base44.entities.Shift.filter({ employee_id: empId }),
    enabled: !!empId,
    staleTime: 1000 * 60 * 2,
  });

  // Timesheets for pay period (current month)
  const { data: timesheets = [] } = useQuery({
    queryKey: ["my-timesheets-period", empId],
    queryFn: () => base44.entities.Timesheet.filter({ employee_id: empId }, "-date", 50),
    enabled: !!empId,
    staleTime: 1000 * 60 * 2,
  });

  // Training
  const { data: trainingAssignments = [] } = useQuery({
    queryKey: ["my-training", empId],
    queryFn: () => base44.entities.TrainingAssignment.filter({ employee_id: empId }),
    enabled: !!empId,
    staleTime: 1000 * 60 * 5,
  });

  // Credentials
  const { data: credentials = [] } = useQuery({
    queryKey: ["my-credentials", empId],
    queryFn: () => base44.entities.Credential.filter({ employee_id: empId }),
    enabled: !!empId,
    staleTime: 1000 * 60 * 5,
  });

  // Announcements (commented out - entity doesn't exist)
  const announcements = [];

  // Active clock-in
  const activeTimesheet = timesheets.find((t) => t.clock_in && !t.clock_out);

  // Today's shift
  const todayShift = shifts.find((s) => s.date === today);
  const nextShift = shifts
    .filter((s) => new Date(s.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  // Pay period hours (current month)
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const periodTimesheets = timesheets.filter((t) => {
    if (!t.date) return false;
    const d = new Date(t.date);
    return d >= monthStart && d <= monthEnd;
  });
  const totalHours = periodTimesheets.reduce((s, t) => s + (t.total_hours || 0), 0);
  const regularHours = Math.min(totalHours, 40 * 4); // approx 4-week month
  const overtimeHours = Math.max(0, totalHours - regularHours);

  // Credentials expiry
  const now = new Date();
  const expiringCreds = credentials.filter((c) => {
    if (!c.expiry_date) return false;
    const days = differenceInDays(new Date(c.expiry_date), now);
    return days >= 0 && days <= 30;
  });
  const expiredCreds = credentials.filter((c) => {
    if (!c.expiry_date) return false;
    return new Date(c.expiry_date) < now;
  });

  // Probation
  const inProbation = myEmployee?.probationEndDate && new Date(myEmployee.probationEndDate) > now;
  const probationDaysLeft = myEmployee?.probationEndDate
    ? differenceInDays(new Date(myEmployee.probationEndDate), now)
    : null;

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const GreetingIcon = hour < 6 ? Moon : hour < 12 ? Sunrise : hour < 18 ? Sun : Moon;

  const firstName = myEmployee?.firstName || user?.full_name?.split(" ")[0] || "there";

  const handleQuickClockIn = async () => {
    if (!myEmployee) return;
    if (activeTimesheet) {
      navigate(createPageUrl("Timesheet"));
      return;
    }
    setClockingIn(true);
    try {
      const now = new Date();
      await base44.entities.Timesheet.create({
        employee_id: myEmployee.id,
        site_id: primarySiteId || null,
        date: format(now, "yyyy-MM-dd"),
        clock_in: now.toISOString(),
        status: "pending",
        device_type: window.innerWidth < 768 ? "mobile" : "desktop",
      });
      queryClient.invalidateQueries({ queryKey: ["my-timesheets-period"] });
      toast.success(`✅ Clocked in at ${format(now, "h:mm a")}`, {
        description: primarySite ? `Site: ${primarySite.name}` : "Have a safe shift!",
        duration: 5000,
      });
    } catch {
      toast.error("Clock-in failed. Please try again.");
    } finally {
      setClockingIn(false);
    }
  };

  if (loadingUser || loadingEmployee) return <LoadingScreen />;

  if (!myEmployee) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Account Setup In Progress</h2>
          <p className="text-slate-500">Your profile is being set up. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32 md:pb-8">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#1a2b4a] to-[#2d4a6f] text-white px-4 py-6">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Avatar className="w-16 h-16 border-2 border-[#c9a227] flex-shrink-0">
            <AvatarImage src={myEmployee?.profilePhotoUrl || user?.profile_photo} />
            <AvatarFallback className="bg-[#c9a227] text-[#1a2b4a] text-xl font-bold">
              {firstName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 text-slate-300 text-sm mb-1">
              <div className="flex items-center gap-2">
                <GreetingIcon className="w-4 h-4" />
                <span>{greeting}</span>
              </div>
              {(isSupervisor || isManager) && (
                <div className="flex items-center gap-1 bg-white/10 rounded-full px-1 py-1">
                  <button
                    onClick={() => setActiveView("employee")}
                    className={`text-xs px-3 py-0.5 rounded-full transition-all ${activeView === "employee" ? "bg-[#c9a227] text-[#1a2b4a] font-semibold" : "text-slate-300 hover:text-white"}`}
                  >
                    Employee
                  </button>
                  <button
                    onClick={() => setActiveView("management")}
                    className={`text-xs px-3 py-0.5 rounded-full transition-all ${activeView !== "employee" ? "bg-[#c9a227] text-[#1a2b4a] font-semibold" : "text-slate-300 hover:text-white"}`}
                  >
                    {isSupervisor ? "Supervisor" : "Manager"}
                  </button>
                </div>
              )}
            </div>
            <h1 className="text-2xl font-bold truncate">Welcome back, {firstName}</h1>
            <p className="text-slate-300 text-sm">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {activeTimesheet && (
              <Badge className="bg-emerald-500 text-white flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Clocked In
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">

        {/* Assigned Site */}
        {primarySite && (
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 bg-[#1a2b4a]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-[#1a2b4a]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Assigned Site</p>
                <p className="font-semibold text-slate-900">{primarySite.name}</p>
                <p className="text-sm text-slate-500 truncate">{primarySite.address}, {primarySite.city}, {primarySite.state}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate(`/SiteDetails?id=${primarySite.id}`)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Today's Shift */}
        <Card className="shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-[#c9a227] to-[#e6c35c] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#1a2b4a]/70 text-xs font-medium uppercase tracking-wide">
                  {todayShift ? "Today's Shift" : "Next Shift"}
                </p>
                {todayShift ? (
                  <>
                    <p className="text-[#1a2b4a] text-xl font-bold mt-0.5">Today</p>
                    <p className="text-[#1a2b4a]/80 text-sm">{todayShift.start_time} – {todayShift.end_time}</p>
                  </>
                ) : nextShift ? (
                  <>
                    <p className="text-[#1a2b4a] text-xl font-bold mt-0.5">
                      {format(parseISO(nextShift.date), "EEE, MMM d")}
                    </p>
                    <p className="text-[#1a2b4a]/80 text-sm">{nextShift.start_time} – {nextShift.end_time}</p>
                  </>
                ) : (
                  <p className="text-[#1a2b4a] text-lg font-semibold mt-0.5">No upcoming shifts</p>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/90 hover:bg-white text-[#1a2b4a]"
                onClick={() => navigate(createPageUrl("Schedule"))}
              >
                View Schedule
              </Button>
            </div>
          </div>
        </Card>

        {/* Pay Period Summary */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Pay Period Summary ({format(monthStart, "MMM d")} – {format(monthEnd, "MMM d")})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-900">{totalHours.toFixed(1)}</p>
                <p className="text-xs text-slate-500 mt-0.5">Total Hours</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <p className="text-2xl font-bold text-emerald-700">{regularHours.toFixed(1)}</p>
                <p className="text-xs text-slate-500 mt-0.5">Regular</p>
              </div>
              <div className={`p-3 rounded-lg ${overtimeHours > 0 ? "bg-amber-50" : "bg-slate-50"}`}>
                <p className={`text-2xl font-bold ${overtimeHours > 0 ? "text-amber-700" : "text-slate-400"}`}>
                  {overtimeHours.toFixed(1)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Overtime</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PTO Balance & Probation */}
        {(myEmployee?.ptoBalance !== undefined || inProbation) && (
          <div className="grid grid-cols-2 gap-3">
            {myEmployee?.ptoBalance !== undefined && (
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">PTO Balance</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{myEmployee.ptoBalance ?? 0}</p>
                  <p className="text-xs text-slate-500">hours available</p>
                  <Button variant="link" size="sm" className="px-0 mt-1 h-auto text-xs" onClick={() => navigate(createPageUrl("PTORequest"))}>
                    Request PTO
                  </Button>
                </CardContent>
              </Card>
            )}
            {inProbation && (
              <Card className="shadow-sm border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                  <p className="text-xs text-amber-700 font-medium uppercase tracking-wide">Probation</p>
                  <p className="text-2xl font-bold text-amber-800 mt-1">{probationDaysLeft}</p>
                  <p className="text-xs text-amber-700">days remaining</p>
                  <p className="text-xs text-amber-600 mt-1">
                    Ends {format(new Date(myEmployee.probationEndDate), "MMM d, yyyy")}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Credentials */}
        {(expiredCreds.length > 0 || expiringCreds.length > 0 || credentials.length > 0) && (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                My Credentials
                {(expiredCreds.length > 0 || expiringCreds.length > 0) && (
                  <Badge className="bg-red-100 text-red-700 ml-auto">
                    {expiredCreds.length + expiringCreds.length} need attention
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {credentials.slice(0, 5).map((cred) => {
                const isExpired = cred.expiry_date && new Date(cred.expiry_date) < now;
                const isExpiring = !isExpired && cred.expiry_date && differenceInDays(new Date(cred.expiry_date), now) <= 30;
                return (
                  <div key={cred.id} className={`flex items-center gap-3 p-2 rounded-lg ${isExpired ? "bg-red-50" : isExpiring ? "bg-amber-50" : "bg-slate-50"}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isExpired ? "bg-red-100" : isExpiring ? "bg-amber-100" : "bg-emerald-100"}`}>
                      {isExpired ? <AlertCircle className="w-4 h-4 text-red-600" /> : isExpiring ? <AlertCircle className="w-4 h-4 text-amber-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{cred.credential_name}</p>
                      {cred.expiry_date && (
                        <p className={`text-xs ${isExpired ? "text-red-600 font-semibold" : isExpiring ? "text-amber-600 font-semibold" : "text-slate-500"}`}>
                          {isExpired ? "Expired " : isExpiring ? "Expires " : "Expires "}
                          {format(new Date(cred.expiry_date), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              {credentials.length > 5 && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate(createPageUrl("Credentials"))}>
                  View all {credentials.length} credentials
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Button
                className={`h-auto py-3 flex flex-col items-center gap-1.5 ${activeTimesheet ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"}`}
                onClick={handleQuickClockIn}
                disabled={clockingIn}
              >
                <Clock className={`w-5 h-5 ${clockingIn ? "animate-spin" : ""}`} />
                <span className="text-xs">
                  {clockingIn ? "Clocking In..." : activeTimesheet ? "Clock Out" : "Check In"}
                </span>
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 h-auto py-3 flex flex-col items-center gap-1.5"
                onClick={() => setShowIncidentForm(true)}
              >
                <AlertTriangle className="w-5 h-5" />
                <span className="text-xs">Submit Incident</span>
              </Button>
              <Button
                className="bg-[#1a2b4a] hover:bg-[#2d4a6f] h-auto py-3 flex flex-col items-center gap-1.5"
                onClick={() => navigate(createPageUrl("PTORequest"))}
              >
                <PlusCircle className="w-5 h-5" />
                <span className="text-xs">Request PTO</span>
              </Button>
              <Button
                className="bg-[#1a2b4a] hover:bg-[#2d4a6f] h-auto py-3 flex flex-col items-center gap-1.5"
                onClick={() => navigate(createPageUrl("Schedule"))}
              >
                <Calendar className="w-5 h-5" />
                <span className="text-xs">My Schedule</span>
              </Button>
              <Button
                className="bg-slate-600 hover:bg-slate-700 h-auto py-3 flex flex-col items-center gap-1.5"
                onClick={() => navigate(createPageUrl("Documents"))}
              >
                <ClipboardList className="w-5 h-5" />
                <span className="text-xs">Site SOPs</span>
              </Button>
              <Button
                className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] h-auto py-3 flex flex-col items-center gap-1.5"
                onClick={() => navigate(createPageUrl("Training"))}
              >
                <GraduationCap className="w-5 h-5" />
                <span className="text-xs">My Training</span>
              </Button>
              <Button
                className="bg-slate-700 hover:bg-slate-800 h-auto py-3 flex flex-col items-center gap-1.5"
                onClick={() => navigate("/MyTimesheets")}
              >
                <Clock className="w-5 h-5" />
                <span className="text-xs">My Timesheets</span>
              </Button>
              {isSupervisor && (
                <Button
                  className="bg-[#1a2b4a] hover:bg-[#2d4a6f] h-auto py-3 flex flex-col items-center gap-1.5"
                  onClick={() => navigate("/LiveMap")}
                >
                  <MapPin className="w-5 h-5" />
                  <span className="text-xs">Live Map</span>
                </Button>
              )}
              </div>
              </CardContent>
              </Card>

        {/* Training Progress */}
        {trainingAssignments.length > 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Training Progress</p>
                    <p className="text-xs text-slate-500">
                      {trainingAssignments.filter(t => t.status === "completed").length} of {trainingAssignments.length} completed
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl("MyTrainings"))}>
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <Progress
                value={(trainingAssignments.filter(t => t.status === "completed").length / trainingAssignments.length) * 100}
                className="h-2"
              />
            </CardContent>
          </Card>
        )}

        {/* Announcements */}
        {announcements.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#c9a227]" />
                Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {announcements.map((a) => (
                <div
                  key={a.id}
                  className="p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => navigate(createPageUrl("Announcements"))}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{a.title}</p>
                        {a.priority === "high" && (
                          <Badge className="bg-red-100 text-red-700 text-xs flex-shrink-0">Important</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.message}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <QuickIncidentForm open={showIncidentForm} onClose={() => setShowIncidentForm(false)} />
    </div>
  );
}