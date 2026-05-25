import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, differenceInMinutes
} from "date-fns";
import {
  Clock, Search, Users, CheckCircle2, AlertCircle, Activity,
  MapPin, Download, Filter, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";

export default function CheckInHistory() {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("today");
  const [statusFilter, setStatusFilter] = useState("all");

  // Date range computation
  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case "today": return { start: startOfDay(now), end: endOfDay(now) };
      case "week": return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case "month": return { start: startOfMonth(now), end: endOfMonth(now) };
      default: return null;
    }
  };

  const range = getDateRange();

  const { data: timesheets = [], isLoading, refetch } = useQuery({
    queryKey: ["checkin-history", dateRange],
    queryFn: async () => {
      if (dateRange === "all") {
        return base44.entities.Timesheet.list("-clock_in", 200);
      }
      const all = await base44.entities.Timesheet.list("-clock_in", 500);
      return all.filter(t => {
        if (!t.clock_in) return false;
        const d = new Date(t.clock_in);
        return d >= range.start && d <= range.end;
      });
    },
    refetchInterval: 30000, // live refresh every 30s
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["all-employees-minimal"],
    queryFn: () => base44.entities.Employee.list("-created_date", 500),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["all-sites-minimal"],
    queryFn: () => base44.entities.Site.list(),
  });

  const getEmployee = (id) => employees.find(e => e.id === id);
  const getSite = (id) => sites.find(s => s.id === id);

  const filtered = timesheets.filter(t => {
    const emp = getEmployee(t.employee_id);
    const name = `${emp?.firstName || ""} ${emp?.lastName || ""}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || emp?.email?.includes(search.toLowerCase());
    const isActive = t.clock_in && !t.clock_out;
    const matchStatus = statusFilter === "all" || (statusFilter === "active" && isActive) || (statusFilter === "completed" && !isActive);
    return matchSearch && matchStatus;
  });

  // Stats
  const activeNow = timesheets.filter(t => t.clock_in && !t.clock_out).length;
  const completedToday = timesheets.filter(t => t.clock_in && t.clock_out).length;
  const uniqueEmployees = new Set(timesheets.map(t => t.employee_id)).size;
  const totalHours = timesheets.reduce((sum, t) => sum + (t.total_hours || 0), 0);

  const handleExport = () => {
    const rows = [["Employee", "Date", "Clock In", "Clock Out", "Hours", "Site", "Status"]];
    filtered.forEach(t => {
      const emp = getEmployee(t.employee_id);
      const site = getSite(t.site_id);
      rows.push([
        `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim() || "Unknown",
        t.date || "",
        t.clock_in ? format(new Date(t.clock_in), "h:mm a") : "",
        t.clock_out ? format(new Date(t.clock_out), "h:mm a") : "Active",
        t.total_hours?.toFixed(2) || (t.clock_in && !t.clock_out ? "In Progress" : ""),
        site?.name || "",
        t.status || "",
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `checkin-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Exported check-in history");
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Check-In History"
        subtitle="All employee check-in and check-out activity"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{activeNow}</p>
                <p className="text-xs text-slate-500">Currently Clocked In</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{completedToday}</p>
                <p className="text-xs text-slate-500">Completed Shifts</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{uniqueEmployees}</p>
                <p className="text-xs text-slate-500">Unique Employees</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalHours.toFixed(1)}</p>
                <p className="text-xs text-slate-500">Total Hours Logged</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by employee name or email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active (Clocked In)</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filtered.length > 0 && (
              <p className="text-sm text-slate-500 mt-3">{filtered.length} record{filtered.length !== 1 ? "s" : ""} found</p>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        {filtered.length > 0 ? (
          <Card className="shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Check In</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Check Out</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Hours</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Site</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(t => {
                    const emp = getEmployee(t.employee_id);
                    const site = getSite(t.site_id);
                    const isActive = t.clock_in && !t.clock_out;
                    const liveMinutes = isActive ? differenceInMinutes(new Date(), new Date(t.clock_in)) : null;

                    return (
                      <tr key={t.id} className={`hover:bg-slate-50 transition-colors ${isActive ? "bg-emerald-50/40" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8 flex-shrink-0">
                              <AvatarImage src={emp?.profilePhotoUrl} />
                              <AvatarFallback className="bg-[#1a2b4a] text-white text-xs">
                                {emp?.firstName?.charAt(0)}{emp?.lastName?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-slate-900 truncate">
                                {emp ? `${emp.firstName} ${emp.lastName}` : "Unknown"}
                              </p>
                              <p className="text-xs text-slate-500 truncate">{emp?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {t.date ? format(parseISO(t.date), "MMM d, yyyy") : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {t.clock_in ? format(new Date(t.clock_in), "h:mm a") : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {t.clock_out ? format(new Date(t.clock_out), "h:mm a") : (
                            isActive ? (
                              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                Active
                              </span>
                            ) : "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                          {t.total_hours ? (
                            `${t.total_hours.toFixed(2)} hrs`
                          ) : isActive && liveMinutes !== null ? (
                            <span className="text-emerald-600">
                              {Math.floor(liveMinutes / 60)}h {liveMinutes % 60}m
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {site ? (
                            <div className="flex items-center gap-1 text-sm text-slate-600">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate max-w-[140px]">{site.name}</span>
                            </div>
                          ) : <span className="text-slate-400 text-sm">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {isActive ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Clocked In</Badge>
                          ) : (
                            <Badge className={
                              t.status === "approved" ? "bg-blue-100 text-blue-700" :
                              t.status === "rejected" ? "bg-red-100 text-red-700" :
                              "bg-amber-100 text-amber-700"
                            }>
                              {t.status || "pending"}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={Clock}
            title="No check-in records found"
            description="Try adjusting the date range or filters"
          />
        )}
      </div>
    </div>
  );
}