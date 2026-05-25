import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Filter, Building2, AlertTriangle, Clock, Shield, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { toast } from "sonner";

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(new Date(), i);
  return { label: format(d, "MMMM yyyy"), value: format(d, "yyyy-MM") };
});

const isAdminOrManager = (user) =>
  ["admin", "manager", "super_admin"].includes(user?.role) || user?.role === "admin";

export default function MonthlySiteReport() {
  const [selectedSiteId, setSelectedSiteId] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0].value);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: sites = [], isLoading: loadingSites } = useQuery({
    queryKey: ["sites"],
    queryFn: () => base44.entities.Site.list("name"),
  });

  const monthStart = startOfMonth(new Date(selectedMonth + "-01"));
  const monthEnd = endOfMonth(monthStart);

  const { data: incidents = [], isLoading: loadingIncidents } = useQuery({
    queryKey: ["incidents-report", selectedSiteId, selectedMonth],
    queryFn: async () => {
      const all = await base44.entities.Incident.list("-incident_date");
      return all.filter((inc) => {
        const d = new Date(inc.incident_date);
        const inMonth = d >= monthStart && d <= monthEnd;
        const inSite = selectedSiteId === "all" || inc.site_id === selectedSiteId;
        return inMonth && inSite;
      });
    },
    enabled: !!user,
  });

  const { data: timesheets = [], isLoading: loadingTimesheets } = useQuery({
    queryKey: ["timesheets-report", selectedSiteId, selectedMonth],
    queryFn: async () => {
      const all = await base44.entities.Timesheet.list("-date");
      return all.filter((ts) => {
        const d = new Date(ts.date);
        const inMonth = d >= monthStart && d <= monthEnd;
        const inSite = selectedSiteId === "all" || ts.site_id === selectedSiteId;
        return inMonth && inSite;
      });
    },
    enabled: !!user,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-map"],
    queryFn: () => base44.entities.Employee.list(),
    enabled: !!user,
  });

  const isPrivileged = isAdminOrManager(user);
  const isLoading = loadingSites || loadingIncidents || loadingTimesheets;

  const totalHours = timesheets.reduce((sum, ts) => sum + (ts.total_hours || 0), 0);
  const approvedShifts = timesheets.filter((ts) => ts.status === "approved").length;
  const pendingShifts = timesheets.filter((ts) => ts.status === "pending").length;
  const criticalIncidents = incidents.filter((i) => i.severity === "critical" || i.severity === "high").length;

  const empMap = Object.fromEntries(employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]));
  const siteMap = Object.fromEntries(sites.map((s) => [s.id, s.name]));

  const selectedSiteName =
    selectedSiteId === "all" ? "All Sites" : siteMap[selectedSiteId] || "Unknown Site";

  const severityColor = {
    low: "bg-blue-100 text-blue-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  const handleGeneratePDF = async () => {
    setGeneratingPdf(true);
    try {
      const response = await base44.functions.invoke("generateMonthlySiteReportPDF", {
        site_id: selectedSiteId,
        site_name: selectedSiteName,
        month: selectedMonth,
        incidents: incidents.map((i) => ({
          date: i.incident_date,
          type: i.incident_type,
          severity: i.severity,
          status: i.status,
          description: i.description?.substring(0, 200),
          reporter: empMap[i.employee_id] || "Unknown",
        })),
        timesheets: timesheets.map((ts) => ({
          date: ts.date,
          employee: empMap[ts.employee_id] || "Unknown",
          hours: ts.total_hours,
          status: ts.status,
        })),
        summary: { totalHours, approvedShifts, pendingShifts, criticalIncidents },
      });

      if (response?.data?.pdf_url) {
        window.open(response.data.pdf_url, "_blank");
        toast.success("PDF report generated successfully");
      }
    } catch (err) {
      toast.error("Failed to generate PDF: " + err.message);
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (!user) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Monthly Site Report"
        subtitle="Incident & timesheet summary by site location"
        currentPage="MonthlySiteReport"
      />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 mb-1 block">Site Location</label>
                <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select site..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sites</SelectItem>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 mb-1 block">Reporting Month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleGeneratePDF}
                disabled={generatingPdf}
                className="bg-[#1a2b4a] hover:bg-[#2d4a6f] text-white gap-2 min-w-[160px]"
              >
                {generatingPdf ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><Download className="w-4 h-4" /> Export PDF</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 text-[#c9a227] mx-auto mb-2" />
              <div className="text-2xl font-bold text-slate-900">{totalHours.toFixed(1)}</div>
              <div className="text-xs text-slate-500">Total Hours</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Shield className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-slate-900">{approvedShifts}</div>
              <div className="text-xs text-slate-500">Approved Shifts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-slate-900">{incidents.length}</div>
              <div className="text-xs text-slate-500">Total Incidents</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-600">{criticalIncidents}</div>
              <div className="text-xs text-slate-500">High/Critical</div>
            </CardContent>
          </Card>
        </div>

        {/* Incidents Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Incident Reports — {selectedSiteName} · {MONTHS.find(m => m.value === selectedMonth)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading...
              </div>
            ) : incidents.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">No incidents recorded for this period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Severity</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Reporter</th>
                      {isPrivileged && <th className="text-left px-4 py-3 font-medium text-slate-600">Description</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {incidents.map((inc) => (
                      <tr key={inc.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">{inc.incident_date ? format(new Date(inc.incident_date), "MMM d, yyyy") : "—"}</td>
                        <td className="px-4 py-3 font-medium">{inc.incident_type}</td>
                        <td className="px-4 py-3"><Badge className={severityColor[inc.severity] || "bg-slate-100 text-slate-700"}>{inc.severity}</Badge></td>
                        <td className="px-4 py-3"><Badge variant="outline">{inc.status}</Badge></td>
                        <td className="px-4 py-3 text-slate-600">{empMap[inc.employee_id] || "Unknown"}</td>
                        {isPrivileged && <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{inc.description || "—"}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timesheet Hours Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#c9a227]" />
              Timesheet Hours — {selectedSiteName} · {MONTHS.find(m => m.value === selectedMonth)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading...
              </div>
            ) : timesheets.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">No timesheet entries for this period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Employee</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Hours</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                      {isPrivileged && <th className="text-left px-4 py-3 font-medium text-slate-600">Notes</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {timesheets.map((ts) => (
                      <tr key={ts.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">{ts.date ? format(new Date(ts.date), "MMM d, yyyy") : "—"}</td>
                        <td className="px-4 py-3 font-medium">{empMap[ts.employee_id] || "Unknown"}</td>
                        <td className="px-4 py-3 text-[#c9a227] font-semibold">{ts.total_hours?.toFixed(1) ?? "—"}</td>
                        <td className="px-4 py-3">
                          <Badge className={ts.status === "approved" ? "bg-emerald-100 text-emerald-700" : ts.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                            {ts.status}
                          </Badge>
                        </td>
                        {isPrivileged && <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{ts.notes || "—"}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin/Manager-only Audit Panel */}
        {isPrivileged ? (
          <Card className="border-[#1a2b4a]/30 bg-[#1a2b4a]/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-[#1a2b4a]">
                <Shield className="w-4 h-4" />
                Site-Wide Audit Summary
                <Badge className="bg-[#c9a227] text-[#1a2b4a] ml-1">Admin / Manager</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-lg p-3 border">
                  <div className="text-xs text-slate-500 mb-1">Pending Approval</div>
                  <div className="text-xl font-bold text-amber-600">{pendingShifts}</div>
                  <div className="text-xs text-slate-400">timesheets</div>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <div className="text-xs text-slate-500 mb-1">Approved</div>
                  <div className="text-xl font-bold text-emerald-600">{approvedShifts}</div>
                  <div className="text-xs text-slate-400">timesheets</div>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <div className="text-xs text-slate-500 mb-1">Open Incidents</div>
                  <div className="text-xl font-bold text-red-600">
                    {incidents.filter(i => ["open", "in_progress", "pending"].includes(i.status)).length}
                  </div>
                  <div className="text-xs text-slate-400">need action</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="text-xs border-[#1a2b4a] text-[#1a2b4a]" onClick={() => window.location.href = "/TimesheetsManagement"}>
                  Bulk Manage Timesheets
                </Button>
                <Button variant="outline" size="sm" className="text-xs border-[#1a2b4a] text-[#1a2b4a]" onClick={() => window.location.href = "/IncidentManagement"}>
                  Manage Incidents
                </Button>
                <Button variant="outline" size="sm" className="text-xs border-[#1a2b4a] text-[#1a2b4a]" onClick={() => window.location.href = "/AuditLog"}>
                  Full Audit Log
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 bg-slate-50 opacity-70">
            <CardContent className="p-4 flex items-center gap-3 text-slate-400">
              <Lock className="w-5 h-5 shrink-0" />
              <span className="text-sm">Site-wide audit logs and bulk management tools are restricted to Admin and Manager roles.</span>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}