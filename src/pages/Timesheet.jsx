import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { Clock, MapPin, Play, Square, CheckCircle, XCircle, AlertCircle, Loader2, Calendar, ExternalLink, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import TimesheetLocationMap from "@/components/shared/TimesheetLocationMap";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import GeofenceStatus from "@/components/timesheet/GeofenceStatus";
import TemplateManager from "@/components/timesheet/TemplateManager";
import { useGeofenceCheck } from "@/hooks/useGeofenceCheck";
import { useShiftGeofenceMonitor } from "@/hooks/useShiftGeofenceMonitor";

export default function Timesheet() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);

  const downloadTimesheetsMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('exportTimesheetsCSV', {
        employee_id: user.id
      });
      return response.data;
    },
    onSuccess: (data) => {
      const blob = new Blob([data.csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      toast.success("Timesheets downloaded for Paychex import");
    }
  });

  useEffect(() => {
    loadUser();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: timesheets = [], isLoading, refetch: refetchTimesheets } = useQuery({
    queryKey: ["my-timesheets", user?.id],
    queryFn: () => base44.entities.Timesheet.filter({ employee_id: user?.id }, "-date", 30),
    enabled: !!user?.id,
    staleTime: 60000,
    gcTime: 300000,
  });

  const today = format(new Date(), "yyyy-MM-dd");
  const { data: todayShifts = [] } = useQuery({
    queryKey: ["today-shift", user?.id, today],
    queryFn: () => base44.entities.Shift.filter({ employee_id: user?.id, date: today }),
    enabled: !!user?.id,
    staleTime: 120000,
    gcTime: 300000,
  });
  const todayShift = todayShifts[0] || null;

  const { data: assignedSite = null } = useQuery({
    queryKey: ["shift-site", todayShift?.site_id],
    queryFn: () => base44.entities.Site.get(todayShift.site_id),
    enabled: !!todayShift?.site_id,
    staleTime: 300000,
    gcTime: 600000,
  });

  const {
    location,
    locationError,
    locating,
    withinGeofence,
    distanceMeters,
    geofenceRadius,
    refreshLocation,
  } = useGeofenceCheck(assignedSite);

  useShiftGeofenceMonitor({
    user,
    shift: todayShift,
    site: assignedSite,
  });

  const geofenceBlocked =
    assignedSite?.geofence?.enabled &&
    !locating &&
    !locationError &&
    withinGeofence === false;

  const activeTimesheet = timesheets.find(t => t.clock_in && !t.clock_out);

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const todayDate = format(new Date(), "yyyy-MM-dd");
      return base44.entities.Timesheet.create({
        employee_id: user.id,
        date: todayDate,
        clock_in: new Date().toISOString(),
        clock_in_location: location,
        site_id: todayShift?.site_id || null,
        status: "pending"
      });
    },
    onMutate: async () => {
      await queryClient.cancelQueries(["my-timesheets"]);
      const previousTimesheets = queryClient.getQueryData(["my-timesheets"]);
      
      queryClient.setQueryData(["my-timesheets"], (old = []) => [
        {
          id: 'temp-' + Date.now(),
          employee_id: user.id,
          date: format(new Date(), "yyyy-MM-dd"),
          clock_in: new Date().toISOString(),
          clock_in_location: location,
          site_id: todayShift?.site_id || null,
          status: "pending"
        },
        ...old
      ]);
      
      return { previousTimesheets };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["my-timesheets"], context.previousTimesheets);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["my-timesheets"]);
    }
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const clockOut = new Date().toISOString();
      const clockIn = new Date(activeTimesheet.clock_in);
      const totalMinutes = differenceInMinutes(new Date(clockOut), clockIn);
      const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

      return base44.entities.Timesheet.update(activeTimesheet.id, {
        clock_out: clockOut,
        clock_out_location: location,
        total_hours: totalHours
      });
    },
    onMutate: async () => {
      await queryClient.cancelQueries(["my-timesheets"]);
      const previousTimesheets = queryClient.getQueryData(["my-timesheets"]);
      
      queryClient.setQueryData(["my-timesheets"], (old = []) =>
        old.map(t => 
          t.id === activeTimesheet.id 
            ? { 
                ...t, 
                clock_out: new Date().toISOString(),
                clock_out_location: location,
                total_hours: Math.round((differenceInMinutes(new Date(), new Date(t.clock_in)) / 60) * 100) / 100
              }
            : t
        )
      );
      
      return { previousTimesheets };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["my-timesheets"], context.previousTimesheets);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["my-timesheets"]);
    }
  });

  const handleClockIn = async () => {
    if (geofenceBlocked) {
      toast.error(`You must be within ${geofenceRadius}m of ${assignedSite?.name} to clock in. You are currently ${distanceMeters}m away.`);
      return;
    }
    setClockingIn(true);
    await clockInMutation.mutateAsync();
    setClockingIn(false);
  };

  const handleClockOut = async () => {
    if (geofenceBlocked) {
      toast.error(`You must be within ${geofenceRadius}m of ${assignedSite?.name} to clock out. You are currently ${distanceMeters}m away.`);
      return;
    }
    setClockingOut(true);
    await clockOutMutation.mutateAsync();
    setClockingOut(false);
  };

  // Real-time notification: watch for manager_comment updates on my timesheets
  useEffect(() => {
    if (!user?.id) return;
    const unsub = base44.entities.Timesheet.subscribe((event) => {
      if (event.type === "update" && event.data?.employee_id === user.id) {
        const ts = event.data;
        if (ts.manager_comment && ts.status === "approved") {
          toast.success(`✅ Timesheet approved! Manager note: ${ts.manager_comment}`, { duration: 7000 });
        } else if (ts.status === "rejected") {
          toast.error(`❌ Timesheet rejected: ${ts.rejection_reason || "See manager for details"}`, { duration: 7000 });
        }
      }
    });
    return unsub;
  }, [user?.id]);

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-amber-100 text-amber-700",
      approved: "bg-emerald-100 text-emerald-700",
      rejected: "bg-red-100 text-red-700"
    };
    return <Badge className={styles[status]}>{status}</Badge>;
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Timesheet" subtitle="Track your work hours" />

      <div className="max-w-3xl mx-auto px-4 py-4 flex gap-3">
        <Button
          variant="outline"
          onClick={() => window.open('https://login.flex.paychex.com/login_static/UsernameOnly.html?lang=en&downtime=false', '_blank')}
          className="gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Open Paychex Payroll
        </Button>
        <Button
          variant="outline"
          onClick={() => downloadTimesheetsMutation.mutate()}
          disabled={downloadTimesheetsMutation.isLoading}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Download for Paychex
        </Button>
      </div>

      <PullToRefresh onRefresh={refetchTimesheets}>
        <div className="max-w-3xl mx-auto px-4 py-2">
          {/* Template shortcuts */}
          {user?.id && (
            <TemplateManager userId={user.id} onApply={(tpl) => {
              toast.success(`Template "${tpl.name}" loaded: ${tpl.clock_in_time} – ${tpl.clock_out_time}`);
            }} />
          )}
          <Card className="mb-6 shadow-sm overflow-hidden">
          <div className={`p-6 ${activeTimesheet ? "bg-emerald-600" : "bg-[#1a2b4a]"} text-white`}>
            <div className="text-center">
              <p className="text-sm opacity-80 mb-2">
                {activeTimesheet ? "Currently Clocked In" : "Clock Status"}
              </p>
              <p className="text-5xl font-bold font-mono mb-2">
                {format(currentTime, "HH:mm:ss")}
              </p>
              <p className="text-sm opacity-80">
                {format(currentTime, "EEEE, MMMM d, yyyy")}
              </p>
              
              {activeTimesheet && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <p className="text-sm opacity-80">Clocked in at</p>
                  <p className="font-semibold">
                    {format(new Date(activeTimesheet.clock_in), "h:mm a")}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <CardContent className="p-6">
            {assignedSite && (
              <GeofenceStatus
                site={assignedSite}
                locating={locating}
                locationError={locationError}
                withinGeofence={withinGeofence}
                distanceMeters={distanceMeters}
                geofenceRadius={geofenceRadius}
                onRefresh={refreshLocation}
              />
            )}

            {!todayShift && !activeTimesheet && (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>No shift scheduled for today. You can still clock in manually.</span>
              </div>
            )}

            {activeTimesheet ? (
              <Button
                onClick={handleClockOut}
                disabled={clockingOut || geofenceBlocked}
                className="w-full h-14 bg-red-600 hover:bg-red-700 text-lg font-semibold disabled:opacity-60"
              >
                {clockingOut ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : geofenceBlocked ? (
                  <>
                    <XCircle className="w-6 h-6 mr-2" />
                    Not On-Site
                  </>
                ) : (
                  <>
                    <Square className="w-6 h-6 mr-2" />
                    Clock Out
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleClockIn}
                disabled={clockingIn || geofenceBlocked || locating}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-lg font-semibold disabled:opacity-60"
              >
                {clockingIn || locating ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : geofenceBlocked ? (
                  <>
                    <XCircle className="w-6 h-6 mr-2" />
                    Not On-Site
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6 mr-2" />
                    Clock In
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Time History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3">
                {timesheets.length > 0 ? timesheets.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="p-4 bg-slate-50 rounded-lg list-item"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {format(parseISO(entry.date), "EEEE, MMM d")}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                          <span>{entry.clock_in ? format(new Date(entry.clock_in), "h:mm a") : "--:--"}</span>
                          <span>→</span>
                          <span>{entry.clock_out ? format(new Date(entry.clock_out), "h:mm a") : "Active"}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(entry.status)}
                        {entry.total_hours && (
                          <p className="text-sm font-medium text-slate-700 mt-1">
                            {entry.total_hours.toFixed(2)} hrs
                          </p>
                        )}
                      </div>
                    </div>
                    <TimesheetLocationMap
                      clockInLocation={entry.clock_in_location}
                      clockOutLocation={entry.clock_out_location}
                    />
                  </div>
                )) : (
                  <EmptyState 
                    icon={Clock}
                    title="No time entries"
                    description="Clock in to start tracking your hours"
                  />
                )}
              </TabsContent>

              <TabsContent value="pending" className="space-y-3">
                {timesheets.filter(t => t.status === "pending").map((entry) => (
                  <div 
                    key={entry.id} 
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {format(parseISO(entry.date), "EEEE, MMM d")}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                        <span>
                          {entry.clock_in ? format(new Date(entry.clock_in), "h:mm a") : "--:--"}
                        </span>
                        <span>→</span>
                        <span>
                          {entry.clock_out ? format(new Date(entry.clock_out), "h:mm a") : "Active"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(entry.status)}
                      {entry.total_hours && (
                        <p className="text-sm font-medium text-slate-700 mt-1">
                          {entry.total_hours.toFixed(2)} hrs
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="approved" className="space-y-3">
                {timesheets.filter(t => t.status === "approved").map((entry) => (
                  <div 
                    key={entry.id} 
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {format(parseISO(entry.date), "EEEE, MMM d")}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                        <span>
                          {entry.clock_in ? format(new Date(entry.clock_in), "h:mm a") : "--:--"}
                        </span>
                        <span>→</span>
                        <span>
                          {entry.clock_out ? format(new Date(entry.clock_out), "h:mm a") : "Active"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(entry.status)}
                      {entry.total_hours && (
                        <p className="text-sm font-medium text-slate-700 mt-1">
                          {entry.total_hours.toFixed(2)} hrs
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        </div>
      </PullToRefresh>
    </div>
  );
}