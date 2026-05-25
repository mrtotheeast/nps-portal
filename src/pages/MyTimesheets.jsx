import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  format, parseISO, startOfMonth, endOfMonth, differenceInMinutes
} from "date-fns";
import {
  Clock, CheckCircle2, AlertCircle, Calendar, TrendingUp, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";

export default function MyTimesheets() {
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current, -1 = last month

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: myEmployee } = useQuery({
    queryKey: ["my-employee-record", user?.email],
    queryFn: async () => {
      const emps = await base44.entities.Employee.filter({ email: user.email });
      return emps[0] || null;
    },
    enabled: !!user?.email,
  });

  const empId = myEmployee?.id;

  const now = new Date();
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthStart = startOfMonth(targetMonth);
  const monthEnd = endOfMonth(targetMonth);
  const monthLabel = format(targetMonth, "MMMM yyyy");

  const { data: timesheets = [], isLoading, refetch } = useQuery({
    queryKey: ["my-timesheets-full", empId, monthOffset],
    queryFn: async () => {
      const all = await base44.entities.Timesheet.filter({ employee_id: empId }, "-date", 100);
      return all.filter(t => {
        if (!t.date) return false;
        const d = parseISO(t.date);
        return d >= monthStart && d <= monthEnd;
      });
    },
    enabled: !!empId,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites-minimal"],
    queryFn: () => base44.entities.Site.list(),
  });

  const getSite = id => sites.find(s => s.id === id);

  // Stats
  const completedShifts = timesheets.filter(t => t.clock_in && t.clock_out);
  const totalHours = completedShifts.reduce((s, t) => s + (t.total_hours || 0), 0);
  const regularHours = Math.min(totalHours, 40 * 4);
  const overtimeHours = Math.max(0, totalHours - regularHours);
  const activeToday = timesheets.find(t => t.clock_in && !t.clock_out);
  const approvedCount = timesheets.filter(t => t.status === "approved").length;
  const pendingCount = timesheets.filter(t => t.status === "pending").length;

  const weeklyTarget = 40;
  const progressPct = Math.min((totalHours / (weeklyTarget * 4)) * 100, 100);

  const handleExport = () => {
    const rows = [["Date", "Clock In", "Clock Out", "Hours", "Site", "Status"]];
    timesheets.forEach(t => {
      const site = getSite(t.site_id);
      rows.push([
        t.date ? format(parseISO(t.date), "MMM d, yyyy") : "",
        t.clock_in ? format(new Date(t.clock_in), "h:mm a") : "",
        t.clock_out ? format(new Date(t.clock_out), "h:mm a") : "Active",
        t.total_hours?.toFixed(2) || "",
        site?.name || "",
        t.status || "",
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `my-timesheets-${format(targetMonth, "yyyy-MM")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Timesheets exported");
  };

  const getStatusBadge = (t) => {
    if (t.clock_in && !t.clock_out) return <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>;
    if (t.status === "approved") return <Badge className="bg-blue-100 text-blue-700">Approved</Badge>;
    if (t.status === "rejected") return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
    return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
  };

  if (isLoading || !myEmployee) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <PageHeader
        title="My Timesheets"
        subtitle={`Pay period: ${monthLabel}`}
        showBack
        action={
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
        }
      />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setMonthOffset(o => o - 1)}>← Previous</Button>
          <span className="font-semibold text-slate-700">{monthLabel}</span>
          <Button variant="outline" size="sm" onClick={() => setMonthOffset(o => Math.min(o + 1, 0))} disabled={monthOffset === 0}>
            Next →
          </Button>
        </div>

        {/* Pay Period Summary */}
        <Card className="shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-[#1a2b4a] to-[#2d4a6f] p-5 text-white">
            <p className="text-sm text-white/70 uppercase tracking-wide font-medium mb-3">Pay Period Summary</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold">{totalHours.toFixed(1)}</p>
                <p className="text-xs text-white/70 mt-1">Total Hours</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#c9a227]">{regularHours.toFixed(1)}</p>
                <p className="text-xs text-white/70 mt-1">Regular</p>
              </div>
              <div>
                <p className={`text-3xl font-bold ${overtimeHours > 0 ? "text-amber-300" : "text-white/50"}`}>
                  {overtimeHours.toFixed(1)}
                </p>
                <p className="text-xs text-white/70 mt-1">Overtime</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-white/60 mb-1.5">
                <span>Progress toward {weeklyTarget * 4}h target</span>
                <span>{progressPct.toFixed(0)}%</span>
              </div>
              <Progress value={progressPct} className="h-2 bg-white/20" />
            </div>
          </div>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div>
                <p className="text-lg font-bold text-slate-900">{timesheets.length}</p>
                <p className="text-xs text-slate-500">Shifts Logged</p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-600">{approvedCount}</p>
                <p className="text-xs text-slate-500">Approved</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-600">{pendingCount}</p>
                <p className="text-xs text-slate-500">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active shift banner */}
        {activeToday && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <div>
              <p className="font-semibold text-emerald-800 text-sm">Currently Clocked In</p>
              <p className="text-xs text-emerald-600">
                Since {format(new Date(activeToday.clock_in), "h:mm a")} —{" "}
                {Math.floor(differenceInMinutes(new Date(), new Date(activeToday.clock_in)) / 60)}h{" "}
                {differenceInMinutes(new Date(), new Date(activeToday.clock_in)) % 60}m elapsed
              </p>
            </div>
          </div>
        )}

        {/* Timesheet list */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              Check-In Records
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {timesheets.length > 0 ? timesheets.map(t => {
              const site = getSite(t.site_id);
              const isActive = t.clock_in && !t.clock_out;
              const liveMin = isActive ? differenceInMinutes(new Date(), new Date(t.clock_in)) : null;

              return (
                <div
                  key={t.id}
                  className={`rounded-xl p-4 border ${isActive ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-transparent"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800 text-sm">
                          {t.date ? format(parseISO(t.date), "EEEE, MMM d") : "—"}
                        </p>
                        {getStatusBadge(t)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-1.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {t.clock_in ? format(new Date(t.clock_in), "h:mm a") : "—"}
                        </span>
                        <span>→</span>
                        <span>
                          {t.clock_out ? format(new Date(t.clock_out), "h:mm a") : (
                            isActive ? <span className="text-emerald-600 font-medium">Active now</span> : "—"
                          )}
                        </span>
                      </div>
                      {site && (
                        <p className="text-xs text-slate-400 mt-1 truncate">{site.name}</p>
                      )}
                      {t.rejection_reason && (
                        <p className="text-xs text-red-600 mt-1">⚠ {t.rejection_reason}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {t.total_hours ? (
                        <p className="text-lg font-bold text-slate-800">{t.total_hours.toFixed(2)}<span className="text-xs font-normal text-slate-500 ml-0.5">hrs</span></p>
                      ) : isActive && liveMin !== null ? (
                        <p className="text-lg font-bold text-emerald-600">
                          {Math.floor(liveMin / 60)}h {liveMin % 60}m
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <EmptyState icon={Clock} title="No records this period" description="Check-ins will appear here after you clock in" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}