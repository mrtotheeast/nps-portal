import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Clock, Shield, FileText, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";

const SEVERITY_COLORS = { low: "text-blue-600 bg-blue-50", medium: "text-amber-600 bg-amber-50", high: "text-red-600 bg-red-50" };
const PRIORITY_COLORS = { low: "bg-blue-100 text-blue-800", medium: "bg-amber-100 text-amber-800", high: "bg-red-100 text-red-800", critical: "bg-red-200 text-red-900" };

export default function IncidentAnalysis() {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [dateRange, setDateRange] = useState(90);

  const analysisMutation = useMutation({
    mutationFn: async () => { const res = await base44.functions.invoke('analyzeIncidents', { dateRange }); return res.data; },
    onSuccess: setAnalysisResult
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="AI Incident Analysis" subtitle="Pattern recognition and preventative insights" showBack />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card className="mb-6 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Date Range:</label>
                <Tabs value={String(dateRange)} onValueChange={v => setDateRange(Number(v))}>
                  <TabsList><TabsTrigger value="30">30 Days</TabsTrigger><TabsTrigger value="90">90 Days</TabsTrigger><TabsTrigger value="180">6 Months</TabsTrigger></TabsList>
                </Tabs>
              </div>
              <Button onClick={() => analysisMutation.mutate()} disabled={analysisMutation.isPending} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold">
                {analysisMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</> : <><Brain className="w-4 h-4 mr-2" />Run AI Analysis</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {analysisResult && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total Incidents", value: analysisResult.stats.total_incidents, icon: <AlertTriangle className="w-8 h-8 text-amber-500" /> },
                { label: "High Severity", value: analysisResult.stats.by_severity?.high || 0, icon: <Shield className="w-8 h-8 text-red-500" />, cls: "text-red-600" },
                { label: "Patterns Found", value: analysisResult.analysis?.patterns?.length || 0, icon: <TrendingUp className="w-8 h-8 text-[#c9a227]" />, cls: "text-[#c9a227]" },
                { label: "Recommendations", value: analysisResult.analysis?.preventative_measures?.length || 0, icon: <CheckCircle className="w-8 h-8 text-emerald-500" />, cls: "text-emerald-600" },
              ].map(({ label, value, icon, cls }) => (
                <Card key={label} className="shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500 mb-1">{label}</p><p className={`text-2xl font-bold ${cls || ""}`}>{value}</p></div>{icon}</div></CardContent></Card>
              ))}
            </div>

            {analysisResult.analysis?.summary && (
              <Card className="mb-6 shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-[#c9a227]" />AI Summary</CardTitle></CardHeader>
                <CardContent><p className="text-slate-700 leading-relaxed">{analysisResult.analysis.summary}</p></CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {analysisResult.analysis?.patterns && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5" />Identified Patterns</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysisResult.analysis.patterns.map((p, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-start justify-between mb-2"><p className="font-medium text-sm">{p.pattern}</p><Badge className={SEVERITY_COLORS[p.severity]}>{p.severity}</Badge></div>
                          <div className="flex items-center gap-2 text-xs text-slate-500"><Clock className="w-3 h-3" /><span>Frequency: {p.frequency}</span></div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {analysisResult.analysis?.risk_categories && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Risk Categories</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysisResult.analysis.risk_categories.map((cat, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center justify-between mb-1"><p className="font-medium text-sm">{cat.category}</p><span className="text-lg font-bold text-[#1a2b4a]">{cat.count}</span></div>
                          <div className="flex items-center gap-2"><div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-[#c9a227]" style={{ width: `${(cat.count / analysisResult.stats.total_incidents) * 100}%` }} /></div><span className="text-xs text-slate-500">{cat.trend}</span></div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {analysisResult.analysis?.time_patterns && (
              <Card className="mb-6 shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5" />Time-Based Patterns</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div><p className="font-medium text-sm mb-3">Peak Hours</p><div className="flex flex-wrap gap-2">{analysisResult.analysis.time_patterns.peak_hours?.map((h, i) => <Badge key={i} variant="outline" className="bg-blue-50">{h}</Badge>)}</div></div>
                    <div><p className="font-medium text-sm mb-3">Peak Days</p><div className="flex flex-wrap gap-2">{analysisResult.analysis.time_patterns.peak_days?.map((d, i) => <Badge key={i} variant="outline" className="bg-amber-50">{d}</Badge>)}</div></div>
                  </div>
                </CardContent>
              </Card>
            )}

            {analysisResult.analysis?.preventative_measures && (
              <Card className="mb-6 shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Shield className="w-5 h-5" />Recommended Preventative Measures</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysisResult.analysis.preventative_measures.map((m, idx) => (
                      <div key={idx} className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                        <div className="flex items-start justify-between mb-2"><p className="font-medium">{m.measure}</p><Badge className={PRIORITY_COLORS[m.priority?.toLowerCase()]}>{m.priority} priority</Badge></div>
                        <p className="text-sm text-slate-600">Expected Impact: {m.expected_impact}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {analysisResult.analysis?.policy_recommendations && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5" />Policy Recommendations</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysisResult.analysis.policy_recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"><CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" /><span className="text-slate-700">{rec}</span></li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!analysisResult && !analysisMutation.isPending && (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <Brain className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Analysis Yet</h3>
              <p className="text-slate-500 mb-6">Click "Run AI Analysis" to generate insights from incident data</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}