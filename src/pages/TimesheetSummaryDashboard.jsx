import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, parseISO, isWithinInterval } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { Clock, Users, Building2, ArrowLeft, TrendingUp, AlertCircle, CheckCircle, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LoadingScreen from "@/components/shared/LoadingScreen";

const COLORS = ["#1a2b4a", "#2d4a6f", "#c9a227", "#e6c35c", "#4a7fb5", "#6a9fd8", "#8ab8e8"];

function StatCard({ icon: Icon, label, value, sub, color = "text-[#1a2b4a]" }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <Icon className={`w-9 h-9 opacity-20 ${color}`} />
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }) {
  const map = {
    approved: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    rejected: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

export default function TimesheetSummaryDashboard() {
  const navigate = useNavigate();
  const [range, setRange] = useState("this_week");

  const { data: timesheets = [], isLoading: loadingTS } = useQuery({
    queryKey: ["all-timesheets-summary"],
    queryFn: () => base44.entities.Timesheet.list("-date", 500),
    staleTime: 60000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-summary"],
    queryFn: () => base44.entities.Employee.filter({ status: "active" }),
    staleTime: 120000,
  });

  // Build a map: employeeId -> name
  const empMap = useMemo(() => {
    const m = {};
    employees.forEach((e) => { m[e.id] = `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.email || e.id; });
    return m;
  }, [employees]);

  // Date range filter
  const interval = useMemo(() => {
    const now = new Date();
    if (range === "this_week") return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    if (range === "last_week") {
      const lw = subWeeks(now, 1);
      return { start: startOfWeek(lw, { weekStartsOn: 1 }), end: endOfWeek(lw, { weekStartsOn: 1 }) };
    }
    if (range === "this_month") return { start: startOfMonth(now), end: endOfMonth(now) };
    return null; // all
  }, [range]);

  const filtered = useMemo(() => {
    if (!interval) return timesheets;
    return timesheets.filter((t) => {
      try {
        const d = parseISO(t.date);
        return isWithinInterval(d, interval);
      } catch { return false; }
    });
  }, [timesheets, interval]);

  // Hours by site
  const bySite = useMemo(() => {
    const m = {};
    filtered.forEach((t) => {
      const key = t.site_id || "Unassigned";
      m[key] = (m[key] || 0) + (t.total_hours || 0);
    });
    return Object.entries(m)
      .map(([site_id, hours]) => ({ site_id, name: site_id === "Unassigned" ? "Unassigned" : `Site ${site_id.slice(-4)}`, hours: parseFloat(hours.toFixed(1)) }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  }, [filtered]);

  // Hours by employee
  const byEmployee = useMemo(() => {
    const m = {};
    filtered.forEach((t) => {
      const key = t.employee_id || "Unknown";
      m[key] = (m[key] || 0) + (t.total_hours || 0);
    });
    return Object.entries(m)
      .map(([id, hours]) => ({ id, name: empMap[id] || `Emp …${id.slice(-4)}`, hours: parseFloat(hours.toFixed(1)) }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  }, [filtered, empMap]);

  // Status breakdown
  const statusCount = useMemo(() => {
    const m = { approved: 0, pending: 0, rejected: 0 };
    filtered.forEach((t) => { if (m[t.status] !== undefined) m[t.status]++; });
    return m;
  }, [filtered]);

  const totalHours = useMemo(() => filtered.reduce((s, t) => s + (t.total_hours || 0), 0).toFixed(1), [filtered]);
  const uniqueEmps = useMemo(() => new Set(filtered.map((t) => t.employee_id)).size, [filtered]);
  const uniqueSites = useMemo(() => new Set(filtered.filter((t) => t.site_id).map((t) => t.site_id)).size, [filtered]);

  if (loadingTS) return <LoadingScreen message="Loading timesheet data…" />;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[#1a2b4a] text-white px-4 py-5">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/10 min-h-[44px] min-w-[44px]">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Timesheet Summary</h1>
            <p className="text-slate-300 text-xs mt-0.5">Hours logged by site &amp; employee</p>
          </div>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-36 bg-white/10 border-white/20 text-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="last_week">Last Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Clock} label="Total Hours" value={totalHours} sub={`${filtered.length} entries`} color="text-[#1a2b4a]" />
          <StatCard icon={Users} label="Employees" value={uniqueEmps} sub="logged hours" color="text-blue-600" />
          <StatCard icon={Building2} label="Sites" value={uniqueSites} sub="covered" color="text-[#c9a227]" />
          <StatCard icon={AlertCircle} label="Pending Approval" value={statusCount.pending} sub={`${statusCount.approved} approved`} color="text-amber-600" />
        </div>

        {/* Status row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Approved", count: statusCount.approved, icon: CheckCircle, cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
            { label: "Pending", count: statusCount.pending, icon: Timer, cls: "bg-amber-50 border-amber-200 text-amber-700" },
            { label: "Rejected", count: statusCount.rejected, icon: AlertCircle, cls: "bg-red-50 border-red-200 text-red-700" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-3 flex items-center gap-3 ${s.cls}`}>
              <s.icon className="w-5 h-5 opacity-70" />
              <div>
                <p className="text-lg font-bold leading-none">{s.count}</p>
                <p className="text-xs mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hours by Site */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#c9a227]" /> Hours by Site
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bySite.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">No data for this period</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={bySite} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v} hrs`, "Hours"]} />
                    <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                      {bySite.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Hours by Employee */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-[#1a2b4a]" /> Hours by Employee
              </CardTitle>
            </CardHeader>
            <CardContent>
              {byEmployee.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">No data for this period</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={byEmployee} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v} hrs`, "Hours"]} />
                    <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                      {byEmployee.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detail Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Site table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Site Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {bySite.length === 0 ? (
                <p className="text-center text-slate-400 py-6 text-sm">No data</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {bySite.map((s, i) => (
                    <div key={s.site_id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold" style={{ background: COLORS[i % COLORS.length] }}>{i + 1}</span>
                        <span className="text-sm font-medium truncate max-w-[160px]">{s.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-[#1a2b4a]">{s.hours} hrs</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Employee table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Employee Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {byEmployee.length === 0 ? (
                <p className="text-center text-slate-400 py-6 text-sm">No data</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {byEmployee.map((e, i) => (
                    <div key={e.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold" style={{ background: COLORS[i % COLORS.length] }}>{i + 1}</span>
                        <span className="text-sm font-medium truncate max-w-[160px]">{e.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-[#1a2b4a]">{e.hours} hrs</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent entries */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              Recent Timesheet Entries
              <Button variant="ghost" size="sm" onClick={() => navigate("/TimesheetsManagement")} className="text-[#1a2b4a] text-xs">
                View All →
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-slate-500 font-medium">Employee</th>
                    <th className="text-left px-4 py-2 text-slate-500 font-medium">Date</th>
                    <th className="text-left px-4 py-2 text-slate-500 font-medium">Hours</th>
                    <th className="text-left px-4 py-2 text-slate-500 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.slice(0, 15).map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium">{empMap[t.employee_id] || `…${(t.employee_id || "").slice(-4)}`}</td>
                      <td className="px-4 py-2 text-slate-500">{t.date ? format(parseISO(t.date), "MMM d, yyyy") : "—"}</td>
                      <td className="px-4 py-2">{t.total_hours != null ? `${t.total_hours} hrs` : "—"}</td>
                      <td className="px-4 py-2"><StatusBadge status={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-center text-slate-400 py-8 text-sm">No timesheet entries for this period</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}