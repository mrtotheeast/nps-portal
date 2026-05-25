import React, { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useDualView } from "@/context/DualViewContext";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import {
  Calendar, Clock, FileText, MessageSquare, Shield, Bell, ChevronRight,
  MapPin, GraduationCap, Award, AlertTriangle, Sun, Moon, Sunrise, LogIn, LogOut, DollarSign
} from "lucide-react";
import QuickIncidentForm from "@/components/incidents/QuickIncidentForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import QuickActionTile from "@/components/shared/QuickActionTile";
import LoadingScreen from "@/components/shared/LoadingScreen";
import ClientSiteAlerts from "@/components/client/ClientSiteAlerts";
import SupervisorDashboard from "./SupervisorDashboard";
import ManagerDashboard from "./ManagerDashboard";

export default function EmployeeHome() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [greeting, setGreeting] = useState("");
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const { activeView } = useDualView();
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);

  useEffect(() => {
    const loadUserAndRole = async () => {
      const authUser = await base44.auth.me();
      setUser(authUser);
      
      // Resolve role same way as DualViewToggle: role_type > Employee.role > platform role
      const roleType = authUser?.role_type;
      let employeeRole = null;
      
      if (authUser?.email) {
        try {
          const employees = await base44.entities.Employee.filter({ email: authUser.email });
          employeeRole = employees.length > 0 ? employees[0].role : null;
        } catch (e) {
          console.warn('Could not fetch Employee role:', e.message);
        }
      }
      
      const resolved = roleType || employeeRole || authUser?.role;
      setUserRole(resolved);
    };
    
    loadUserAndRole();
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening");
  }, []);

  const isSupervisor = userRole === "supervisor";
  const isManager = userRole === "manager";



  const { data: myEmployeeRecord, isLoading: loadingEmployee } = useQuery({
    queryKey: ["my-employee-record-home", user?.email],
    queryFn: async () => {
      const emps = await base44.entities.Employee.filter({ email: user.email });
      return emps[0] || null;
    },
    enabled: !!user?.email,
  });

  const empId = myEmployeeRecord?.id;

  const { data: shifts = [] } = useQuery({ queryKey: ["my-shifts", empId], queryFn: () => base44.entities.Shift.filter({ employee_id: empId }), enabled: !!empId, refetchInterval: 60000 });
  const { data: trainingAssignments = [] } = useQuery({ queryKey: ["my-training", empId], queryFn: () => base44.entities.TrainingAssignment.filter({ employee_id: empId }), enabled: !!empId, refetchInterval: 60000 });
  const { data: announcements = [] } = useQuery({ queryKey: ["announcements"], queryFn: () => base44.entities.Announcement.filter({ status: "active" }, "-created_date", 3), refetchInterval: 120000 });
  const { data: activePatrol } = useQuery({
    queryKey: ["active-patrol", empId],
    queryFn: async () => { const patrols = await base44.entities.PatrolSession.filter({ employee_id: empId, status: "active" }); return patrols[0] || null; },
    enabled: !!empId,
    refetchInterval: 30000,
  });

  const nextShift = shifts.filter(s => new Date(s.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  const completedTraining = trainingAssignments.filter(t => t.status === "completed").length;
  const trainingProgress = trainingAssignments.length > 0 ? (completedTraining / trainingAssignments.length) * 100 : 100;

  const handleClockIn = () => {
    setClockedIn(true);
    setClockInTime(new Date());
  };

  const handleClockOut = () => {
    setClockedIn(false);
    setClockInTime(null);
  };

  const hour = new Date().getHours();
  const GreetingIcon = hour < 6 ? Moon : hour < 12 ? Sunrise : hour < 18 ? Sun : Moon;

  if (!user || loadingEmployee) return <LoadingScreen />;

  // Guard: if user loaded but no employee record found
  if (myEmployeeRecord === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Account Setup In Progress</h2>
          <p className="text-slate-500">Your account is being set up. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  // If management view is active, redirect to appropriate management dashboard
  if (activeView === "management") {
    const role = user?.role;
    if (role === "admin" || role === "super_admin") {
      return <Navigate to="/AdminDashboard" replace />;
    }
    if (isManager) return <ManagerDashboard />;
    if (isSupervisor) return <SupervisorDashboard />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32 md:pb-0">
      <div className="bg-gradient-to-br from-[#1a2b4a] to-[#2d4a6f] text-white">
        <div className="w-full px-4 md:max-w-7xl md:mx-auto py-6 md:py-8">
          <div>
            <div className="flex items-center gap-3 text-slate-300 text-sm mb-3">
              <div className="flex items-center gap-2">
                <GreetingIcon className="w-4 h-4" />
                <span>{greeting}</span>
              </div>

            </div>
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-[#c9a227]">
                <AvatarImage src={user?.profile_photo} />
                <AvatarFallback className="bg-[#c9a227] text-[#1a2b4a] text-xl font-bold">{user?.full_name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{user?.full_name || "Employee"}</h1>
                <p className="text-slate-300">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:max-w-7xl md:mx-auto -mt-4 pb-8">
        {user && myEmployeeRecord?.siteIds?.length > 0 && (
          <ClientSiteAlerts user={user} siteIds={myEmployeeRecord.siteIds} />
        )}

        {activePatrol && (
          <Card className="mb-4 border-emerald-500 bg-emerald-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center"><Shield className="w-6 h-6 text-emerald-600" /></div>
                  <div><p className="font-semibold text-emerald-800">Patrol in Progress</p><p className="text-sm text-emerald-600">{activePatrol.scanned_checkpoints || 0} of {activePatrol.total_checkpoints || 0} checkpoints</p></div>
                </div>
                <Button onClick={() => navigate(createPageUrl("Patrol"))} className="bg-emerald-600 hover:bg-emerald-700">Continue</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Clock In/Out Section */}
        <Card className="mb-4 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Work Status</p>
                <p className={`text-lg font-bold ${clockedIn ? "text-emerald-600" : "text-slate-600"}`}>
                  {clockedIn ? `Clocked In - ${clockInTime?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Clocked Out"}
                </p>
              </div>
              <div className="flex gap-2">
                {!clockedIn ? (
                  <Button onClick={handleClockIn} className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2">
                    <LogIn className="w-4 h-4" /> Clock In
                  </Button>
                ) : (
                  <Button onClick={handleClockOut} variant="destructive" className="flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> Clock Out
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-[#c9a227] to-[#e6c35c] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#1a2b4a]/70 text-sm font-medium">Next Shift</p>
                {nextShift ? (
                  <>
                    <p className="text-[#1a2b4a] text-xl font-bold mt-1">{isToday(parseISO(nextShift.date)) ? "Today" : isTomorrow(parseISO(nextShift.date)) ? "Tomorrow" : format(parseISO(nextShift.date), "EEEE, MMM d")}</p>
                    <p className="text-[#1a2b4a]/80 mt-1">{nextShift.start_time} - {nextShift.end_time}</p>
                  </>
                ) : <p className="text-[#1a2b4a] text-lg font-semibold mt-1">No upcoming shifts</p>}
              </div>
              <Button variant="secondary" onClick={() => navigate(createPageUrl("Schedule"))} className="bg-white/90 hover:bg-white text-[#1a2b4a]">View Schedule</Button>
            </div>
          </div>
        </Card>

        {/* Calendar */}
        <Card className="mb-4 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Calendar className="w-5 h-5 text-[#c9a227]" />Calendar</CardTitle></CardHeader>
          <CardContent className="p-4">
            <div className="flex justify-center">
              <CalendarComponent
                mode="single"
                selected={new Date()}
                disabled={(date) => {
                  const dateStr = format(date, "yyyy-MM-dd");
                  return !shifts.some(s => format(parseISO(s.start_time), "yyyy-MM-dd") === dateStr);
                }}
                className="rounded-md border border-slate-200"
              />
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Schedule */}
        {shifts.length > 0 && (
          <Card className="mb-4 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Calendar className="w-5 h-5 text-[#c9a227]" />Upcoming Schedule</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {shifts.filter(s => new Date(s.start_time) >= new Date()).slice(0, 10).map((shift) => (
                  <div key={shift.id} className="p-3 bg-slate-50 rounded-lg border-l-4 border-[#c9a227]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{format(parseISO(shift.start_time), "EEE, MMM d")}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Clock className="w-3 h-3" /> {shift.start_time?.substring(11, 16)} - {shift.end_time?.substring(11, 16)}</p>
                        {shift.role && <p className="text-xs text-slate-600 mt-1">{shift.role}</p>}
                      </div>
                      <Badge className="bg-[#1a2b4a] text-[#c9a227]">{shift.status || "scheduled"}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-4 shadow-sm">
           <CardHeader className="pb-3"><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
           <CardContent>
             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
               <QuickActionTile title="Schedule" icon={Calendar} page="Schedule" color="blue" />
               <QuickActionTile title="Timesheet" icon={Clock} page="Timesheet" color="green" />
               <QuickActionTile title="Documents" icon={FileText} page="Documents" color="slate" />
               <QuickActionTile title="Payroll" icon={DollarSign} page="PayrollPortal" color="amber" />
               <QuickActionTile title="Messages" icon={MessageSquare} page="Chat" color="purple" />
               <QuickActionTile title="Incident" icon={AlertTriangle} onClick={() => setShowIncidentForm(true)} color="red" />
             </div>
           </CardContent>
         </Card>

        {announcements.length > 0 && (
          <Card className="mb-4 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Bell className="w-5 h-5 text-[#c9a227]" />Announcements</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer" onClick={() => navigate(createPageUrl("Announcements"))}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2"><p className="font-medium">{a.title}</p>{a.priority === "high" && <Badge className="bg-red-100 text-red-700 text-xs">Important</Badge>}</div>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{a.message}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Training Status - At Bottom */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><GraduationCap className="w-5 h-5 text-purple-600" /></div>
                <div><p className="font-semibold">Training Status</p><p className="text-sm text-slate-500">{completedTraining} of {trainingAssignments.length} courses completed</p></div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl("Training"))}>View All<ChevronRight className="w-4 h-4 ml-1" /></Button>
            </div>
            <Progress value={trainingProgress} className="h-2" />
          </CardContent>
        </Card>
      </div>
      <QuickIncidentForm open={showIncidentForm} onClose={() => setShowIncidentForm(false)} />
    </div>
  );
}