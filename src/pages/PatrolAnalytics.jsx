import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis } from "recharts";
import { format, subDays, startOfWeek, parseISO, isWithinInterval } from "date-fns";
import { Shield, AlertTriangle, CheckCircle2, TrendingUp, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";

const NAVY = "#1a2b4a";
const GOLD = "#c9a227";
const COLORS = ["#1a2b4a", "#c9a227", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function PatrolAnalytics() {
  const [dateRange, setDateRange] = useState("30");
  const [aiInsight, setAiInsight] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const since = subDays(new Date(), parseInt(dateRange));

  const { data: patrols = [], isLoading: loadingPatrols } = useQuery({
    queryKey: ["patrols_analytics", dateRange],
    queryFn: () => base44.entities.PatrolSession.list("-start_time", 500),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites_analytics"],
    queryFn: () => base44.entities.Site.list(),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["incidents_analytics"],
    queryFn: () => base44.entities.Incident.list("-created_date", 500),
  });

  const siteMap = Object.fromEntries(sites.map((s) => [s.id, s.name]));

  const filteredPatrols = patrols.filter((p) => p.start_time && new Date(p.start_time) >= since);
  const filteredIncidents = incidents.filter((i) => i.created_date && new Date(i.created_date) >= since);

  const completionTrend = (() => {
    const days = {};
    for (let i = Math.min(parseInt(dateRange), 30) - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "MMM d");
      days[d] = { date: d, completed: 0, active: 0 };
    }
    filteredPatrols.forEach((p) => {
      const d = format(parseISO(p.start_time), "MMM d");
      if (days[d]) {
        if (p.status === "completed") days[d].completed++;
        else days[d].active++;
      }
    });
    return Object.values(days);
  })();

  const completionBySite = (() => {
    const map = {};
    filteredPatrols.forEach((p) => {
      const name = siteMap[p.site_id] || "Unknown";
      if (!map[name]) map[name] = { total: 0, completed: 0 };
      map[name].total++;
      if (p.status === "completed") map[name].completed++;
    });
    return Object.entries(map)
      .map(([site, v]) => ({
        site: site.length > 14 ? site.slice(0, 13) + "…" : site,
        rate: v.total ? Math.round((v.completed / v.total) * 100) : 0,
        total: v.total,
        completed: v.completed,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 10);
  })();

  const incidentHeatmap = (() => {
    const siteCount = {};
    filteredIncidents.forEach((i) => {
      const name = siteMap[i.site_id] || "Unknown";
      if (!siteCount[name]) siteCount[name] = { site: name, count: 0, types: {} };
      siteCount[name].count++;
      siteCount[name].types[i.incident_type] = (siteCount[name].types[i.incident_type] || 0) + 1;
    });
    return Object.values(siteCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
      .map((s, i) => ({
        x: (i % 4) * 25 + 12,
        y: Math.floor(i / 4) * 33 + 16,
        z: s.count,
        site: s.site,
        topType: Object.entries(s.types).sort((a, b) => b[1] - a[1])[0]?.[0] || "other",
        count: s.count,
      }));
  })();

  const totalPatrols = filteredPatrols.length;
  const completedPatrols = filteredPatrols.filter((p) => p.status === "completed").length;
  const completionRate = totalPatrols ? Math.round((completedPatrols / totalPatrols) * 100) : 0;
  const totalIncidents = filteredIncidents.length;

  const generateAIInsight = async () => {
    setLoadingAI(true);
    const summary = {
      dateRange: `${dateRange} days`,
      totalPatrols,
      completionRate: `${completionRate}%`,
      totalIncidents,
      topSites: completionBySite.slice(0, 3),
      incidentHotspots: incidentHeatmap.slice(0, 5).map((h) => `${h.site} (${h.count} incidents)`),
    };
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a security operations analyst. Based on the following patrol analytics data, provide 3–4 concise bullet-point insights and 2 actionable recommendations for management:\n\n${JSON.stringify(summary, null, 2)}\n\nFormat: start each insight with "•" and each recommendation with "→". Keep each point under 2 sentences.`,
      });
      setAiInsight(result);
    } catch (error) {
      console.error('AI generation failed:', error);
    }
    setLoadingAI(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Patrol Analytics" subtitle="Trends, completion rates, and incident heatmap" showBack />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={generateAIInsight} disabled={loadingAI} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold">
            {loadingAI ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            AI Insights
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Patrols", value: totalPatrols, Icon: Shield, color: "text-[#1a2b4a]", bg: "bg-blue-50" },
            { label: "Completion Rate", value: `${completionRate}%`, Icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Completed", value: completedPatrols, Icon: TrendingUp, color: "text-[#c9a227]", bg: "bg-amber-50" },
            { label: "Incidents", value: totalIncidents, Icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
          ].map(({ label, value, Icon, color, bg }) => (
            <Card key={label}>
              <CardContent className={`p-4 flex items-center gap-3 ${bg} rounded-xl`}>
                <Icon className={`w-8 h-8 ${color} shrink-0`} />
                <div>
                  <p className="text-2xl font-bold text-slate-800">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {aiInsight && (
          <Card className="border-[#c9a227] bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-[#1a2b4a]">
                <Sparkles className="w-4 h-4 text-[#c9a227]" /> AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{aiInsight}</p>
            </CardContent>
          </Card>
        )}

        {loadingPatrols ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading patrol data...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Completion Trend (Daily)</CardTitle>
                  <CardDescription>Completed vs. active patrols per day</CardDescription>
                </CardHeader>
                <CardContent>
                  {completionTrend.length === 0 ? (
                    <p className="text-sm text-slate-400 py-8 text-center">No patrol data in this period</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={completionTrend.slice(-14)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={2} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="active" fill="#f59e0b" name="Active" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Patrol Completion Rate by Site</CardTitle>
                  <CardDescription>Percentage of patrols fully completed per site</CardDescription>
                </CardHeader>
                <CardContent>
                  {completionBySite.length === 0 ? (
                    <p className="text-sm text-slate-400 py-8 text-center">No patrol data in this period</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={completionBySite} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                        <YAxis type="category" dataKey="site" tick={{ fontSize: 11 }} width={110} />
                        <Tooltip formatter={(v) => `${v}%`} />
                        <Bar dataKey="rate" name="Completion %" radius={[0, 4, 4, 0]}>
                          {completionBySite.map((entry, i) => (
                            <Cell key={i} fill={entry.rate >= 80 ? "#10b981" : entry.rate >= 60 ? "#f59e0b" : "#ef4444"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {incidentHeatmap.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="w-4 h-4 text-[#c9a227]" /> Incident Density by Site
                  </CardTitle>
                  <CardDescription>Bubble size = number of incidents</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" dataKey="x" name="X" hide />
                      <YAxis type="number" dataKey="y" name="Y" hide />
                      <ZAxis type="number" dataKey="z" range={[40, 600]} />
                      <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        return (
                          <div className="bg-white border rounded shadow p-2 text-sm">
                            <p className="font-semibold">{d?.site}</p>
                            <p className="text-slate-500">{d?.count} incidents</p>
                          </div>
                        );
                      }} />
                      <Scatter data={incidentHeatmap} fill={GOLD} fillOpacity={0.75} stroke={NAVY} strokeWidth={1} />
                    </ScatterChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {incidentHeatmap.map((h) => (
                      <div key={h.site} className="flex items-center gap-2 text-xs">
                        <div className="rounded-full bg-[#c9a227] border border-[#1a2b4a]" style={{ width: Math.max(8, Math.min(20, h.count * 2)), height: Math.max(8, Math.min(20, h.count * 2)) }} />
                        <span className="truncate text-slate-600" title={h.site}>{h.site}</span>
                        <Badge variant="outline" className="ml-auto shrink-0">{h.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}