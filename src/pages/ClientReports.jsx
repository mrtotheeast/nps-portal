import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, AlertTriangle, Shield, FileText, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { format } from "date-fns";

const SEVERITY_COLORS = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
  critical: "bg-red-200 text-red-800",
};

export default function ClientReports() {
  const { data: incidents = [], isLoading: loadingIncidents } = useQuery({
    queryKey: ["all-incidents"],
    queryFn: () => base44.entities.Incident.list("-incident_date"),
  });

  const { data: patrols = [], isLoading: loadingPatrols } = useQuery({
    queryKey: ["all-patrols"],
    queryFn: () => base44.entities.PatrolSession.list("-start_time"),
  });

  const handleExportCSV = async () => {
    const res = await base44.functions.invoke("exportClientReportCSV", {});
    const url = res.data?.url;
    if (url) window.open(url, "_blank");
  };

  if (loadingIncidents || loadingPatrols) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Security Reports"
        subtitle="Incident and patrol activity at your sites"
        showBack
        action={handleExportCSV}
        actionLabel="Export CSV"
        actionIcon={Download}
      />
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="p-4"><p className="text-sm text-slate-600">Total Incidents</p><p className="text-3xl font-bold">{incidents.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-slate-600">Open Incidents</p><p className="text-3xl font-bold text-red-600">{incidents.filter(i => i.status === "open").length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-slate-600">Patrols (30d)</p><p className="text-3xl font-bold">{patrols.filter(p => new Date(p.start_time) > new Date(Date.now() - 30 * 86400000)).length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-slate-600">Completed</p><p className="text-3xl font-bold text-emerald-600">{patrols.filter(p => p.status === "completed").length}</p></CardContent></Card>
        </div>

        <Tabs defaultValue="incidents">
          <TabsList className="mb-4">
            <TabsTrigger value="incidents">Incidents ({incidents.length})</TabsTrigger>
            <TabsTrigger value="patrols">Patrols ({patrols.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="incidents">
            {incidents.length > 0 ? (
              <div className="space-y-3">
                {incidents.map((inc) => (
                  <Card key={inc.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <h3 className="font-semibold capitalize">{inc.incident_type?.replace(/_/g, " ")}</h3>
                            <Badge className={SEVERITY_COLORS[inc.severity]}>{inc.severity}</Badge>
                          </div>
                          <p className="text-sm text-slate-600">{inc.description?.substring(0, 120)}{inc.description?.length > 120 ? "..." : ""}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {inc.incident_date ? format(new Date(inc.incident_date), "MMM d, yyyy h:mm a") : "—"}
                          </p>
                        </div>
                        <Badge className={
                          inc.status === "resolved" ? "bg-emerald-100 text-emerald-700" :
                          inc.status === "open" ? "bg-red-100 text-red-700" :
                          "bg-slate-100 text-slate-700"
                        }>{inc.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState icon={AlertTriangle} title="No incidents on record" />
            )}
          </TabsContent>

          <TabsContent value="patrols">
            {patrols.length > 0 ? (
              <div className="space-y-3">
                {patrols.map((patrol) => (
                  <Card key={patrol.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{patrol.start_time ? format(new Date(patrol.start_time), "MMM d, yyyy") : "—"}</p>
                        <p className="text-xs text-slate-500">
                          {patrol.start_time ? format(new Date(patrol.start_time), "h:mm a") : "—"} → {patrol.end_time ? format(new Date(patrol.end_time), "h:mm a") : "Active"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{patrol.scanned_checkpoints || 0}/{patrol.total_checkpoints || 0} checkpoints</p>
                      </div>
                      <Badge className={patrol.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}>
                        {patrol.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState icon={Shield} title="No patrol records" />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}