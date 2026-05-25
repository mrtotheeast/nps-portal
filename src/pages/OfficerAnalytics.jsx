import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Shield, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";

export default function OfficerAnalytics() {
  const [dateRange, setDateRange] = useState("30");

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ["timesheets"],
    queryFn: () => base44.entities.Timesheet.list(),
  });

  const { data: patrols = [] } = useQuery({
    queryKey: ["patrols"],
    queryFn: () => base44.entities.PatrolSession.list(),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => base44.entities.Incident.list(),
  });

  const officers = employees.filter((e) => e.role === "officer" || e.employmentType === "officer");

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - parseInt(dateRange));

  const officerStats = officers.map((officer) => {
    const empTimesheets = timesheets.filter(
      (ts) => ts.employee_id === officer.id && new Date(ts.date) >= cutoff
    );
    const empPatrols = patrols.filter(
      (p) => p.employee_id === officer.id && new Date(p.start_time) >= cutoff
    );
    const empIncidents = incidents.filter(
      (i) => i.reporter_id === officer.id && new Date(i.incident_date) >= cutoff
    );
    const totalHours = empTimesheets.reduce((sum, ts) => sum + (ts.total_hours || 0), 0);
    const avgCompletion = empPatrols.length > 0
      ? empPatrols.reduce((sum, p) => {
          const pct = p.total_checkpoints > 0 ? (p.scanned_checkpoints / p.total_checkpoints) * 100 : 0;
          return sum + pct;
        }, 0) / empPatrols.length
      : 0;
    return { officer, totalHours, patrolCount: empPatrols.length, incidentCount: empIncidents.length, avgCompletion };
  });

  if (loadingEmployees) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Officer Analytics" subtitle="Performance metrics by officer" showBack />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-end mb-6">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card><CardContent className="p-4"><p className="text-sm text-slate-600">Total Officers</p><p className="text-3xl font-bold">{officers.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-slate-600">Total Patrols</p><p className="text-3xl font-bold">{patrols.filter(p => new Date(p.start_time) >= cutoff).length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-slate-600">Total Hours</p><p className="text-3xl font-bold">{timesheets.filter(t => new Date(t.date) >= cutoff).reduce((s, t) => s + (t.total_hours || 0), 0).toFixed(0)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-slate-600">Incidents</p><p className="text-3xl font-bold">{incidents.filter(i => new Date(i.incident_date) >= cutoff).length}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Officer Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-3 text-left">Officer</th>
                    <th className="p-3 text-right">Hours</th>
                    <th className="p-3 text-right">Patrols</th>
                    <th className="p-3 text-right">Avg Completion</th>
                    <th className="p-3 text-right">Incidents</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {officerStats.map(({ officer, totalHours, patrolCount, incidentCount, avgCompletion }) => (
                    <tr key={officer.id} className="hover:bg-slate-50">
                      <td className="p-3">{officer.firstName} {officer.lastName}</td>
                      <td className="p-3 text-right">{totalHours.toFixed(1)}</td>
                      <td className="p-3 text-right">{patrolCount}</td>
                      <td className="p-3 text-right">
                        <Badge className={avgCompletion >= 90 ? "bg-emerald-100 text-emerald-700" : avgCompletion >= 70 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>
                          {avgCompletion.toFixed(0)}%
                        </Badge>
                      </td>
                      <td className="p-3 text-right">{incidentCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}