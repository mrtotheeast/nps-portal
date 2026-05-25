import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { BarChart3, Calendar, Loader2, Download, Sparkles, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { useAIAccess } from "@/hooks/useAIAccess";
import AIUpgradeBanner from "@/components/ai/AIUpgradeBanner";
import AIBadge from "@/components/ai/AIBadge";

export default function AIReportsLegacy() {
  const [user, setUser] = useState(null);
  const { hasAccess, isLoading: accessLoading } = useAIAccess();
  const [reportType, setReportType] = useState('timesheets');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState(null);

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateAdminReport', {
        reportType,
        startDate,
        endDate
      });
      return response.data;
    },
    onSuccess: (data) => {
      setReport(data);
    }
  });

  const handleDownloadPDF = () => {
    if (!report) return;
    const doc = new jsPDF();
    const r = report.report;
    let y = 20;

    doc.setFontSize(18);
    doc.setTextColor(26, 43, 74);
    doc.text("AI Report Summary", 14, y); y += 10;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Report Type: ${reportType} | Period: ${startDate} to ${endDate}`, 14, y); y += 6;
    doc.text(`Generated: ${format(new Date(), "MMM d, yyyy")}`, 14, y); y += 10;

    const addSection = (title, lines) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(13); doc.setTextColor(26, 43, 74);
      doc.text(title, 14, y); y += 7;
      doc.setFontSize(10); doc.setTextColor(60);
      lines.forEach(line => {
        const wrapped = doc.splitTextToSize(line, 180);
        wrapped.forEach(l => {
          if (y > 275) { doc.addPage(); y = 20; }
          doc.text(l, 14, y); y += 6;
        });
      });
      y += 4;
    };

    if (r.executive_summary) addSection("Executive Summary", [r.executive_summary]);
    if (r.key_metrics?.length) addSection("Key Metrics", r.key_metrics.map(m => `${m.metric}: ${m.value} (${m.trend})`));
    if (r.notable_findings?.length) addSection("Notable Findings", r.notable_findings.map(f => `• ${f}`));
    if (r.areas_of_concern?.length) addSection("Areas of Concern", r.areas_of_concern.map(c => `⚠ ${c}`));
    if (r.recommendations?.length) addSection("Recommendations", r.recommendations.map(rc => `✓ ${rc}`));
    if (r.action_items?.length) addSection("Action Items", r.action_items.map(a => `[${(a.priority || "").toUpperCase()}] ${a.item}`));

    doc.save(`ai-report-${reportType}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  if (!user) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="AI-Powered Reports"
        subtitle="Generate intelligent insights from your data"
        showBack
      />

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {!accessLoading && !hasAccess ? (
          <AIUpgradeBanner />
        ) : (
          <>
            <Card className="shadow-sm mb-6">
              <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="w-5 h-5" />
              Generate Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              <div>
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="timesheets">Timesheets & Attendance</SelectItem>
                    <SelectItem value="patrols">Patrol Performance</SelectItem>
                    <SelectItem value="incidents">Incident Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <Button
              onClick={() => generateReportMutation.mutate()}
              disabled={generateReportMutation.isLoading}
              className="w-full h-12 bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold"
            >
              {generateReportMutation.isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate AI Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {report && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
                <Printer className="w-4 h-4" /> Download PDF
              </Button>
            </div>
            {/* Executive Summary */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-base sm:text-lg">Executive Summary</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-sm sm:text-base text-slate-700 whitespace-pre-wrap leading-relaxed">{report.report.executive_summary}</p>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-base sm:text-lg">Key Metrics</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-4">
                  {report.report.key_metrics?.map((metric, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 truncate">{metric.metric}</p>
                      <div className="flex items-center justify-between mt-1 gap-1">
                        <p className="text-lg sm:text-2xl font-bold truncate">{metric.value}</p>
                        <Badge className={`shrink-0 text-xs ${
                          metric.trend === 'up' ? 'bg-emerald-100 text-emerald-700' :
                          metric.trend === 'down' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {metric.trend}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notable Findings */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-base sm:text-lg">Notable Findings</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ul className="space-y-2">
                  {report.report.notable_findings?.map((finding, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm sm:text-base">
                      <span className="text-[#c9a227] mt-0.5 shrink-0">•</span>
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Areas of Concern */}
            {report.report.areas_of_concern?.length > 0 && (
              <Card className="shadow-sm border-amber-200 bg-amber-50">
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-base sm:text-lg text-amber-900">Areas of Concern</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <ul className="space-y-2">
                    {report.report.areas_of_concern.map((concern, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm sm:text-base text-amber-800">
                        <span className="mt-0.5 shrink-0">⚠️</span>
                        <span>{concern}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-base sm:text-lg">Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ul className="space-y-2">
                  {report.report.recommendations?.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm sm:text-base">
                      <span className="text-emerald-600 mt-0.5 shrink-0">✓</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Action Items */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-base sm:text-lg">Action Items</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-2">
                  {report.report.action_items?.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-2 p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm flex-1">{item.item}</span>
                      <Badge className={`shrink-0 text-xs ${
                        item.priority === 'high' ? 'bg-red-100 text-red-700' :
                        item.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {item.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}