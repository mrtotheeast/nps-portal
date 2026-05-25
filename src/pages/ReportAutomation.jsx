import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Play, Pause, Trash2, FileText, Calendar, Clock, Mail } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";

export default function ReportAutomation() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [newAutomation, setNewAutomation] = useState({
    name: "",
    report_type: "incident_investigation",
    schedule_frequency: "weekly",
    schedule_day: 1,
    schedule_time: "09:00",
    template_id: null,
    delivery_method: "email",
    recipients: "",
    filters: {}
  });

  const queryClient = useQueryClient();

  const { data: automations, isLoading } = useQuery({
    queryKey: ['automated-reports'],
    queryFn: () => base44.entities.AutomatedReport.list()
  });

  const { data: templates } = useQuery({
    queryKey: ['report-templates'],
    queryFn: () => base44.entities.ReportTemplate.list()
  });

  const { data: generatedReports } = useQuery({
    queryKey: ['generated-reports'],
    queryFn: () => base44.entities.GeneratedReport.list('-created_date', 50)
  });

  const createAutomationMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.AutomatedReport.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['automated-reports']);
      setShowCreateDialog(false);
      toast.success('Report automation created');
      setNewAutomation({
        name: "",
        report_type: "incident_investigation",
        schedule_frequency: "weekly",
        schedule_day: 1,
        schedule_time: "09:00",
        template_id: null,
        delivery_method: "email",
        recipients: "",
        filters: {}
      });
    }
  });

  const toggleAutomationMutation = useMutation({
    mutationFn: async ({ id, currentStatus }) => {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      return base44.entities.AutomatedReport.update(id, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['automated-reports']);
      toast.success('Automation status updated');
    }
  });

  const deleteAutomationMutation = useMutation({
    mutationFn: (id) => base44.entities.AutomatedReport.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['automated-reports']);
      toast.success('Automation deleted');
    }
  });

  const runNowMutation = useMutation({
    mutationFn: async (automationId) => {
      return await base44.functions.invoke('runScheduledReport', {
        automated_report_id: automationId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['generated-reports']);
      toast.success('Report generation started');
    },
    onError: (error) => {
      toast.error('Failed to generate report: ' + error.message);
    }
  });

  const handleCreate = () => {
    const recipientsArray = newAutomation.recipients
      .split(',')
      .map(email => email.trim())
      .filter(Boolean);

    createAutomationMutation.mutate({
      ...newAutomation,
      recipients: recipientsArray,
      filters: {
        date_range_days: newAutomation.schedule_frequency === 'daily' ? 1 :
                         newAutomation.schedule_frequency === 'weekly' ? 7 : 30
      }
    });
  };

  if (isLoading) return <LoadingScreen />;

  const getFrequencyBadge = (frequency) => {
    const colors = {
      daily: "bg-blue-100 text-blue-800",
      weekly: "bg-green-100 text-green-800",
      monthly: "bg-purple-100 text-purple-800"
    };
    return <Badge className={colors[frequency]}>{frequency}</Badge>;
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: "bg-green-100 text-green-800",
      paused: "bg-yellow-100 text-yellow-800",
      inactive: "bg-gray-100 text-gray-800"
    };
    return <Badge className={colors[status]}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <PageHeader
        title="Report Automation"
        subtitle="Schedule and manage automated report generation"
        showBack
      />

      <div className="max-w-7xl mx-auto mt-6 space-y-6">
        <div className="mb-4">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Automation
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Scheduled Reports</CardTitle>
            <CardDescription>Manage your automated report generation schedules</CardDescription>
          </CardHeader>
          <CardContent>
            {!automations || automations.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No automated reports configured</p>
                <Button variant="outline" className="mt-4" onClick={() => setShowCreateDialog(true)}>
                  Create Your First Automation
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {automations.map((automation) => (
                  <div key={automation.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="w-5 h-5 text-slate-600" />
                          <h3 className="font-semibold">{automation.name}</h3>
                          {getStatusBadge(automation.status)}
                          {getFrequencyBadge(automation.schedule_frequency)}
                        </div>
                        <div className="text-sm text-slate-600 space-y-1 ml-8">
                          <p>Type: {automation.report_type.replace(/_/g, ' ')}</p>
                          <p className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Schedule: {automation.schedule_frequency} at {automation.schedule_time}
                          </p>
                          {automation.recipients?.length > 0 && (
                            <p className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              Recipients: {automation.recipients.join(', ')}
                            </p>
                          )}
                          {automation.last_run && (
                            <p className="text-xs text-slate-500">
                              Last run: {new Date(automation.last_run).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => runNowMutation.mutate(automation.id)}
                          disabled={runNowMutation.isPending}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Run Now
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAutomationMutation.mutate({ 
                            id: automation.id, 
                            currentStatus: automation.status 
                          })}
                        >
                          {automation.status === 'active' ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirmId(automation.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated Reports</CardTitle>
            <CardDescription>Recently generated reports</CardDescription>
          </CardHeader>
          <CardContent>
            {!generatedReports || generatedReports.length === 0 ? (
              <p className="text-center py-8 text-slate-500">No reports generated yet</p>
            ) : (
              <div className="space-y-3">
                {generatedReports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{report.title}</h4>
                        <p className="text-sm text-slate-600 mt-1">{report.summary}</p>
                        <p className="text-xs text-slate-500 mt-2">
                          Generated: {new Date(report.created_date).toLocaleString()}
                        </p>
                      </div>
                      <Badge className={
                        report.generation_status === 'completed' ? 'bg-green-100 text-green-800' :
                        report.generation_status === 'generating' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {report.generation_status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Automation</DialogTitle>
            <DialogDescription>Are you sure you want to delete this automation? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => { deleteAutomationMutation.mutate(deleteConfirmId); setDeleteConfirmId(null); }}
              disabled={deleteAutomationMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Report Automation</DialogTitle>
            <DialogDescription>
              Configure automated report generation and delivery
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Automation Name</Label>
              <Input
                value={newAutomation.name}
                onChange={(e) => setNewAutomation({ ...newAutomation, name: e.target.value })}
                placeholder="e.g., Weekly Incident Summary"
              />
            </div>

            <div>
              <Label>Report Type</Label>
              <Select
                value={newAutomation.report_type}
                onValueChange={(value) => setNewAutomation({ ...newAutomation, report_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incident_investigation">Incident Investigation</SelectItem>
                  <SelectItem value="client_summary">Client Summary</SelectItem>
                  <SelectItem value="officer_performance">Officer Performance</SelectItem>
                  <SelectItem value="training_completion">Training Completion</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Frequency</Label>
                <Select
                  value={newAutomation.schedule_frequency}
                  onValueChange={(value) => setNewAutomation({ ...newAutomation, schedule_frequency: value })}
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

              {newAutomation.schedule_frequency === 'weekly' && (
                <div>
                  <Label>Day of Week</Label>
                  <Select
                    value={newAutomation.schedule_day.toString()}
                    onValueChange={(value) => setNewAutomation({ ...newAutomation, schedule_day: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {newAutomation.schedule_frequency === 'monthly' && (
                <div>
                  <Label>Day of Month</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={newAutomation.schedule_day}
                    onChange={(e) => setNewAutomation({ ...newAutomation, schedule_day: parseInt(e.target.value) })}
                  />
                </div>
              )}

              <div>
                <Label>Time</Label>
                <Input
                  type="time"
                  value={newAutomation.schedule_time}
                  onChange={(e) => setNewAutomation({ ...newAutomation, schedule_time: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Delivery Method</Label>
              <Select
                value={newAutomation.delivery_method}
                onValueChange={(value) => setNewAutomation({ ...newAutomation, delivery_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="google_docs">Google Docs</SelectItem>
                  <SelectItem value="download">Download Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newAutomation.delivery_method === 'email' && (
              <div>
                <Label>Recipients (comma-separated emails)</Label>
                <Textarea
                  value={newAutomation.recipients}
                  onChange={(e) => setNewAutomation({ ...newAutomation, recipients: e.target.value })}
                  placeholder="john@example.com, jane@example.com"
                />
              </div>
            )}

            {templates && templates.length > 0 && (
              <div>
                <Label>Template (Optional)</Label>
                <Select
                  value={newAutomation.template_id || "none"}
                  onValueChange={(value) => setNewAutomation({ 
                    ...newAutomation, 
                    template_id: value === "none" ? null : value 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Default Template</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!newAutomation.name || createAutomationMutation.isPending}
            >
              Create Automation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}