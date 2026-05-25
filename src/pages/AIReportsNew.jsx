import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Calendar, Send, Eye, Check, X, Plus, Trash2, Play, Pause } from "lucide-react";
import { useAIAccess } from "@/hooks/useAIAccess";
import AIUpgradeBanner from "@/components/ai/AIUpgradeBanner";
import AIBadge from "@/components/ai/AIBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";

export default function AIReportsNew() {
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();
  const { hasAccess, isLoading: accessLoading } = useAIAccess();

  const [reportConfig, setReportConfig] = useState({
    report_name: "",
    data_sources: [],
    parameters: {
      date_range: "30_days",
      roles: [],
      locations: []
    },
    frequency: "weekly",
    recipients: [""],
    requires_approval: true
  });

  const { data: scheduledReports = [] } = useQuery({
    queryKey: ['scheduled-ai-reports'],
    queryFn: () => base44.entities.ScheduledAIReport.list()
  });

  const { data: pendingReports = [] } = useQuery({
    queryKey: ['pending-ai-reports'],
    queryFn: () => base44.entities.PendingAIReport.list()
  });

  const createScheduleMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const result = await base44.functions.invoke('createScheduledAIReport', {
        ...reportConfig,
        created_by: user.id
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduled-ai-reports']);
      toast.success("Report schedule created!");
      setScheduleDialogOpen(false);
      setReportConfig({
        report_name: "",
        data_sources: [],
        parameters: { date_range: "30_days", roles: [], locations: [] },
        frequency: "weekly",
        recipients: [""],
        requires_approval: true
      });
    }
  });

  const generateNowMutation = useMutation({
    mutationFn: async (config) => {
      setGenerating(true);
      const result = await base44.functions.invoke('generateAIReportOnDemand', config);
      return result.data;
    },
    onSuccess: () => {
      toast.success("Report generated!");
      setGenerating(false);
    },
    onError: () => {
      setGenerating(false);
    }
  });

  const approveReportMutation = useMutation({
    mutationFn: async (reportId) => {
      await base44.functions.invoke('approveAndSendAIReport', { reportId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-ai-reports']);
      toast.success("Report approved and sent!");
    }
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: async ({ scheduleId, newStatus }) => {
      await base44.entities.ScheduledAIReport.update(scheduleId, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduled-ai-reports']);
      toast.success("Schedule updated!");
    }
  });

  const dataSourceOptions = [
    { value: "incidents", label: "Incident Reports" },
    { value: "user_performance", label: "User Performance" },
    { value: "training_analytics", label: "Training Analytics" },
    { value: "patrol_data", label: "Patrol Data" },
    { value: "timesheets", label: "Timesheets" }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="AI Reports"
        subtitle="Automated AI-powered analytics and insights"
        showBack
      />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {!accessLoading && !hasAccess ? (
          <AIUpgradeBanner />
        ) : (
          <>
            <div className="flex gap-3">
            <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Schedule AI Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Report Name</Label>
                  <Input
                    value={reportConfig.report_name}
                    onChange={(e) => setReportConfig({ ...reportConfig, report_name: e.target.value })}
                    placeholder="Weekly Operations Summary"
                  />
                </div>

                <div>
                  <Label>Data Sources</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {dataSourceOptions.map(option => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                        <Checkbox
                          checked={reportConfig.data_sources.includes(option.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setReportConfig({
                                ...reportConfig,
                                data_sources: [...reportConfig.data_sources, option.value]
                              });
                            } else {
                              setReportConfig({
                                ...reportConfig,
                                data_sources: reportConfig.data_sources.filter(s => s !== option.value)
                              });
                            }
                          }}
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date Range</Label>
                    <Select
                      value={reportConfig.parameters.date_range}
                      onValueChange={(val) => setReportConfig({
                        ...reportConfig,
                        parameters: { ...reportConfig.parameters, date_range: val }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7_days">Last 7 Days</SelectItem>
                        <SelectItem value="30_days">Last 30 Days</SelectItem>
                        <SelectItem value="90_days">Last 90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Frequency</Label>
                    <Select
                      value={reportConfig.frequency}
                      onValueChange={(val) => setReportConfig({ ...reportConfig, frequency: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Email Recipients</Label>
                  {reportConfig.recipients.map((email, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <Input
                        value={email}
                        onChange={(e) => {
                          const updated = [...reportConfig.recipients];
                          updated[idx] = e.target.value;
                          setReportConfig({ ...reportConfig, recipients: updated });
                        }}
                        placeholder="email@example.com"
                      />
                      {idx === reportConfig.recipients.length - 1 && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setReportConfig({
                            ...reportConfig,
                            recipients: [...reportConfig.recipients, ""]
                          })}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={reportConfig.requires_approval}
                      onCheckedChange={(checked) => setReportConfig({
                        ...reportConfig,
                        requires_approval: checked
                      })}
                    />
                    <span className="text-sm">Require admin approval before sending</span>
                  </label>
                </div>

                <Button
                  onClick={() => createScheduleMutation.mutate()}
                  disabled={!reportConfig.report_name || reportConfig.data_sources.length === 0 || createScheduleMutation.isLoading}
                  className="w-full bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Create Schedule
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            onClick={() => generateNowMutation.mutate(reportConfig)}
            disabled={generating}
            variant="outline"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Now
          </Button>
        </div>

        <Tabs defaultValue="scheduled">
          <TabsList>
            <TabsTrigger value="scheduled">Scheduled Reports ({scheduledReports.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending Approval ({pendingReports.filter(r => r.status === 'pending_review').length})</TabsTrigger>
          </TabsList>

          <TabsContent value="scheduled" className="space-y-3">
            {scheduledReports.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No scheduled reports yet</p>
                </CardContent>
              </Card>
            ) : (
              scheduledReports.map(report => (
                <Card key={report.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{report.report_name}</h3>
                          <Badge className={report.status === 'active' ? 'bg-green-600' : 'bg-slate-400'}>
                            {report.status}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-slate-600">
                          <p>Data Sources: {report.data_sources.join(', ')}</p>
                          <p>Frequency: {report.frequency}</p>
                          <p>Recipients: {report.recipients.join(', ')}</p>
                          {report.next_scheduled && (
                            <p>Next: {new Date(report.next_scheduled).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleScheduleMutation.mutate({
                            scheduleId: report.id,
                            newStatus: report.status === 'active' ? 'paused' : 'active'
                          })}
                        >
                          {report.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-3">
            {pendingReports.filter(r => r.status === 'pending_review').length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Eye className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No reports pending approval</p>
                </CardContent>
              </Card>
            ) : (
              pendingReports.filter(r => r.status === 'pending_review').map(report => (
                <Card key={report.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Generated {new Date(report.generated_at).toLocaleString()}</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => approveReportMutation.mutate(report.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve & Send
                        </Button>
                        <Button size="sm" variant="destructive">
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-sm">{report.report_content}</pre>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
          </>
        )}
      </div>
    </div>
  );
}