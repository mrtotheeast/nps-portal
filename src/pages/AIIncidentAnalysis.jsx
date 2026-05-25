import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sparkles, TrendingUp, MapPin, AlertTriangle, Clock } from "lucide-react";
import { useAIAccess } from "@/hooks/useAIAccess";
import AIUpgradeBanner from "@/components/ai/AIUpgradeBanner";
import AIBadge from "@/components/ai/AIBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function AIIncidentAnalysis() {
  const [analysis, setAnalysis] = useState(null);
  const { hasAccess, isLoading: accessLoading } = useAIAccess();

  const { data: incidents = [], isLoading, refetch: refetchIncidents } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => base44.entities.Incident.list("-incident_date")
  });

  // Monitor for new high-priority incidents
  React.useEffect(() => {
    const checkNewIncidents = async () => {
      const freshIncidents = await base44.entities.Incident.list("-incident_date", 1);
      if (freshIncidents.length > 0) {
        const latest = freshIncidents[0];
        const priority = latest.priority || latest.severity || 'medium';
        if (['high', 'critical'].includes(priority)) {
          await base44.functions.invoke('notifyIncidentPriority', {
            incident_id: latest.id,
            priority,
            incident_type: latest.incident_type || latest.type || 'Unknown'
          });
        }
      }
    };

    const interval = setInterval(checkNewIncidents, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: () => base44.entities.Site.list()
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Analyze these security incident reports and provide insights:

Incidents Data:
${JSON.stringify(incidents.slice(0, 50), null, 2)}

Sites Data:
${JSON.stringify(sites, null, 2)}

Please provide a comprehensive analysis including:
1. Top incident types and their frequencies
2. High-risk sites with most incidents
3. Time patterns (days/hours with most incidents)
4. Severity trends over time
5. Recommendations for improving security
6. Predicted high-risk areas for next month

Format the response as JSON with these keys: summary, top_incident_types, high_risk_sites, time_patterns, trends, recommendations, predictions`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            top_incident_types: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  count: { type: "number" },
                  percentage: { type: "number" }
                }
              }
            },
            high_risk_sites: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  site_name: { type: "string" },
                  incident_count: { type: "number" },
                  severity: { type: "string" }
                }
              }
            },
            time_patterns: {
              type: "object",
              properties: {
                peak_hours: { type: "array", items: { type: "string" } },
                peak_days: { type: "array", items: { type: "string" } }
              }
            },
            trends: { type: "string" },
            recommendations: { type: "array", items: { type: "string" } },
            predictions: { type: "string" }
          }
        }
      });
      
      return result;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      toast.success("Analysis complete");
    },
    onError: () => {
      toast.error("Analysis failed");
    }
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="AI Incident Analysis"
        subtitle="AI-powered insights from incident data"
        showBack
      />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {!accessLoading && !hasAccess ? (
          <AIUpgradeBanner />
        ) : (
          <>
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <div className="text-center">
                  <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                  <h2 className="text-xl font-bold mb-2">Analyze {incidents.length} Incidents</h2>
                  <p className="text-slate-600 mb-4">
                    Use AI to discover patterns, trends, and get recommendations
                  </p>
                  <Button
                    onClick={() => analyzeMutation.mutate()}
                    disabled={analyzeMutation.isLoading || incidents.length === 0}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {analyzeMutation.isLoading ? "Analyzing..." : "Run AI Analysis"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {analysis && (
              <>
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700">{analysis.summary}</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Top Incident Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.top_incident_types?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="font-medium capitalize">{item.type}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-600">{item.count} incidents</span>
                        <Badge>{item.percentage?.toFixed(1)}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  High-Risk Sites
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.high_risk_sites?.map((site, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg">
                      <div>
                        <p className="font-medium">{site.site_name}</p>
                        <p className="text-sm text-slate-600">{site.incident_count} incidents</p>
                      </div>
                      <Badge variant="destructive">{site.severity}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Time Patterns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Peak Hours</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.time_patterns?.peak_hours?.map((hour, i) => (
                        <Badge key={i} variant="outline">{hour}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Peak Days</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.time_patterns?.peak_days?.map((day, i) => (
                        <Badge key={i} variant="outline">{day}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700">{analysis.trends}</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.recommendations?.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">•</span>
                      <span className="text-slate-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Predictions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700">{analysis.predictions}</p>
              </CardContent>
            </Card>
            </>
          )}
          </>
        )}
      </div>
    </div>
  );
}