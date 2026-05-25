import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileText, Download, Calendar, AlertTriangle, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";

export default function WeeklySiteReports() {
  const [generating, setGenerating] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = ["admin", "manager", "supervisor"].includes(user?.role_type);

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: () => base44.entities.Site.list(),
  });

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["weekly-report-incidents"],
    queryFn: () => base44.entities.Incident.list("-incident_date", 200),
  });

  if (isLoading) return <LoadingScreen />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-sm w-full mx-4">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h2 className="font-semibold text-lg mb-2">Admin Access Required</h2>
            <p className="text-slate-500 text-sm">This page is restricted to administrators only.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    const weekIncidents = incidents.filter(inc => inc.incident_date >= startStr && inc.incident_date <= endStr);
    const sitesAffected = new Set(weekIncidents.map(i => i.site_id)).size;
    return { startStr, endStr, weekIncidents, sitesAffected, label: `${startStr} → ${endStr}` };
  });

  const SEVERITY_COLORS = {
    critical: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-green-100 text-green-700",
  };

  const handleGenerateAndDownload = async () => {
    setGenerating(true);
    try {
      await base44.functions.invoke("generateWeeklySitePDF", {});
      toast.success("Report generated — check your email for the PDF");
    } catch (err) {
      toast.error("Failed to generate report: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Weekly Site Reports"
        subtitle="Admin-only incident summaries by site"
      />

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex justify-end mb-6">
          <Button
            onClick={handleGenerateAndDownload}
            disabled={generating}
            className="bg-[#1a2b4a] hover:bg-[#2d4a6f]"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><FileText className="w-4 h-4 mr-2" /> Generate This Week's PDF</>
            )}
          </Button>
        </div>

        <h2 className="text-lg font-semibold text-slate-800 mb-3">Current Week by Site</h2>
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          {sites.filter(s => s.status === "active").map(site => {
            const siteIncidents = weeks[0].weekIncidents.filter(i => i.site_id === site.id)
              .sort((a, b) => {
                const order = { critical: 0, high: 1, medium: 2, low: 3 };
                return (order[a.severity] ?? 5) - (order[b.severity] ?? 5);
              });

            return (
              <Card key={site.id} className="shadow-sm">
                <CardHeader className="pb-2 bg-[#1a2b4a] text-white rounded-t-xl">
                  <CardTitle className="text-base flex items-center justify-between">
                    {site.name}
                    <Badge className={siteIncidents.length > 0 ? "bg-red-500 text-white" : "bg-emerald-500 text-white"}>
                      {siteIncidents.length} incident{siteIncidents.length !== 1 ? "s" : ""}
                    </Badge>
                  </CardTitle>
                  {site.address?.city && (
                    <p className="text-slate-300 text-xs">{site.address.city}, {site.address.state}</p>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  {siteIncidents.length === 0 ? (
                    <p className="text-sm text-slate-400 py-2 text-center">No incidents this week ✓</p>
                  ) : (
                    <div className="space-y-2">
                      {siteIncidents.map(inc => (
                        <div key={inc.id} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
                          <AlertTriangle className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium capitalize">{(inc.incident_type || "").replace(/_/g, " ")}</span>
                              <Badge className={`text-xs ${SEVERITY_COLORS[inc.severity] || "bg-slate-100"}`}>
                                {inc.severity?.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">{inc.description}</p>
                            <p className="text-xs text-slate-400">{inc.incident_date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <h2 className="text-lg font-semibold text-slate-800 mb-3">Historical Weekly Summaries</h2>
        <div className="space-y-3">
          {weeks.slice(1).map((week, idx) => (
            <Card key={idx} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-800">{week.label}</p>
                      <p className="text-sm text-slate-500">
                        {week.weekIncidents.length} incident{week.weekIncidents.length !== 1 ? "s" : ""} across {week.sitesAffected} site{week.sitesAffected !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {week.weekIncidents.filter(i => ["critical", "high"].includes(i.severity)).length > 0 && (
                      <Badge className="bg-red-100 text-red-700">
                        {week.weekIncidents.filter(i => ["critical", "high"].includes(i.severity)).length} high/critical
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}