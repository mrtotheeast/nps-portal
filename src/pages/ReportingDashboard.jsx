import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";

export default function ReportingDashboard() {
  const { data: timesheets = [], isLoading: loadingTimesheets } = useQuery({
    queryKey: ["timesheets"],
    queryFn: () => base44.entities.Timesheet.list(),
  });

  const { data: incidents = [], isLoading: loadingIncidents } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => base44.entities.Incident.list(),
  });

  if (loadingTimesheets || loadingIncidents) return <LoadingScreen />;

  const stats = {
    totalTimeEntries: timesheets.length,
    totalIncidents: incidents.length,
    approvedTimesheets: timesheets.filter((t) => t.status === "approved").length,
    resolvedIncidents: incidents.filter((i) => i.status === "resolved").length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Reporting Dashboard" subtitle="Analytics and insights" />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Time Entries</p>
              <p className="text-3xl font-bold">{stats.totalTimeEntries}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Approved</p>
              <p className="text-3xl font-bold text-emerald-600">{stats.approvedTimesheets}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Incidents</p>
              <p className="text-3xl font-bold">{stats.totalIncidents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Resolved</p>
              <p className="text-3xl font-bold text-emerald-600">{stats.resolvedIncidents}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Timesheet Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Pending</span>
                  <span className="font-semibold">{timesheets.filter((t) => t.status === "pending").length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Approved</span>
                  <span className="font-semibold">{stats.approvedTimesheets}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Rejected</span>
                  <span className="font-semibold">{timesheets.filter((t) => t.status === "rejected").length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Incident Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Pending</span>
                  <span className="font-semibold">{incidents.filter((i) => i.status === "pending").length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Resolved</span>
                  <span className="font-semibold">{stats.resolvedIncidents}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total</span>
                  <span className="font-semibold">{stats.totalIncidents}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}