import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Shield, Clock, AlertTriangle, FileText, MapPin, GraduationCap, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { format } from "date-fns";
import ClientSiteAlerts from "@/components/client/ClientSiteAlerts";
import OnboardingTasksCard from "@/components/onboarding/OnboardingTasksCard";

export default function OfficerDashboard() {
  const navigate = useNavigate();
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0);

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ["my-timesheets", user?.id],
    queryFn: () => base44.entities.Timesheet.filter({ employee_id: user.id }, "-date", 5),
    enabled: !!user?.id,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["my-training", user?.id],
    queryFn: () => base44.entities.TrainingAssignment.filter({ employee_id: user.id }),
    enabled: !!user?.id,
  });

  const { data: myEmployee } = useQuery({
    queryKey: ["my-employee-record", user?.email],
    queryFn: async () => {
      const emps = await base44.entities.Employee.filter({ email: user.email });
      return emps[0] || null;
    },
    enabled: !!user?.email,
  });

  if (loadingUser) return <LoadingScreen />;

  const activeTimesheet = timesheets.find((t) => t.clock_in && !t.clock_out);
  const pendingTraining = assignments.filter((a) => a.status !== "completed").length;

  const quickActions = [
    { label: "Clock In/Out", page: "Timesheet", icon: Clock, color: "bg-emerald-600" },
    { label: "Start Patrol", page: "Patrol", icon: Shield, color: "bg-[#1a2b4a]" },
    { label: "Report Incident", page: "IncidentForm", icon: AlertTriangle, color: "bg-red-600" },
    { label: "Site Check-In", page: "SiteCheckIn", icon: MapPin, color: "bg-[#c9a227] text-[#1a2b4a]" },
    { label: "My Trainings", page: "MyTrainings", icon: GraduationCap, color: "bg-[#1a2b4a]" },
    { label: "Documents", page: "Documents", icon: FileText, color: "bg-slate-600" },
  ];

  const isAppleReviewer = user?.email?.toLowerCase() === "appreviewer@nationwidepolice.com";

  return (
    <div className="min-h-screen bg-white">
      {isAppleReviewer && (
        <div className="bg-[#c9a227] text-[#1a2b4a] text-center text-sm font-semibold px-4 py-2.5">
          Demo Account — Apple App Store Review · Nationwide Police Services LLC · Contact: Info@NationwidePolice.com
        </div>
      )}
      <div className="bg-[#1a2b4a] text-white px-6 pt-6 pb-16">
        <p className="text-slate-300 text-sm">Good {new Date().getHours() < 12 ? "morning" : "evening"},</p>
        <h1 className="text-2xl font-bold">{user?.full_name}</h1>
        {activeTimesheet && (
          <Badge className="mt-2 bg-emerald-500 text-white">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse mr-2" />
            Clocked in since {format(new Date(activeTimesheet.clock_in), "h:mm a")}
          </Badge>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-8 pb-24">
        {/* Client Site Alerts */}
        {user && myEmployee?.siteIds?.length > 0 && (
          <div className="mt-4" id="client-alerts-section">
            <ClientSiteAlerts user={user} siteIds={myEmployee.siteIds} onCountChange={setUnacknowledgedCount} />
          </div>
        )}

        {/* Onboarding Tasks */}
        {myEmployee?.id && <OnboardingTasksCard employeeId={myEmployee.id} />}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Clock Status</p>
              <p className="font-bold text-lg">{activeTimesheet ? "Clocked In" : "Not Clocked In"}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Pending Training</p>
              <p className="font-bold text-lg text-amber-600">{pendingTraining}</p>
            </CardContent>
          </Card>
          <Card
            className={`shadow-sm col-span-2 cursor-pointer transition-colors ${unacknowledgedCount > 0 ? "border-blue-400 bg-blue-50" : ""}`}
            onClick={() => document.getElementById("client-alerts-section")?.scrollIntoView({ behavior: "smooth" })}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${unacknowledgedCount > 0 ? "bg-blue-600" : "bg-slate-100"}`}>
                  <MessageSquare className={`w-5 h-5 ${unacknowledgedCount > 0 ? "text-white" : "text-slate-400"}`} />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Client Messages</p>
                  <p className={`font-bold text-lg ${unacknowledgedCount > 0 ? "text-blue-700" : "text-slate-400"}`}>
                    {unacknowledgedCount > 0 ? `${unacknowledgedCount} unacknowledged` : "All clear"}
                  </p>
                </div>
              </div>
              {unacknowledgedCount > 0 && (
                <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
                  {unacknowledgedCount}
                </span>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {quickActions.map((action) => (
            <Button
              key={action.page}
              onClick={() => navigate(createPageUrl(action.page))}
              className={`${action.color} hover:opacity-90 h-auto py-4 flex flex-col items-center gap-2`}
            >
              <action.icon className="w-6 h-6" />
              <span className="text-xs text-center">{action.label}</span>
            </Button>
          ))}
        </div>

        {/* Recent Timesheets */}
        {timesheets.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Recent Shifts</h3>
              <div className="space-y-2">
                {timesheets.slice(0, 3).map((ts) => (
                  <div key={ts.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{format(new Date(ts.date), "EEE, MMM d")}</p>
                      <p className="text-xs text-slate-500">
                        {ts.clock_in ? format(new Date(ts.clock_in), "h:mm a") : "—"} →{" "}
                        {ts.clock_out ? format(new Date(ts.clock_out), "h:mm a") : "Active"}
                      </p>
                    </div>
                    <Badge className={ts.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                      {ts.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}