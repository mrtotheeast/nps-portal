import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users, TrendingUp, AlertTriangle, GraduationCap, Activity, Download, Sparkles, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";

const COLORS = ['#c9a227', '#1a2b4a', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

export default function AnalyticsDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [generatingReport, setGeneratingReport] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list()
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['training-assignments'],
    queryFn: () => base44.entities.TrainingAssignment.list()
  });

  const { data: patrols = [] } = useQuery({
    queryKey: ['patrols'],
    queryFn: () => base44.entities.PatrolSession.list()
  });

  const { data: trainingAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['training-analytics'],
    queryFn: async () => {
      const result = await base44.functions.invoke('analyzeTrainingEffectiveness');
      return result.data;
    }
  });

  // Calculate app usage metrics
  const activeUsers = users.filter(u => {
    const lastActive = new Date(u.updated_date);
    const daysAgo = (new Date() - lastActive) / (1000 * 60 * 60 * 24);
    return daysAgo <= parseInt(selectedPeriod);
  }).length;

  const usersByRole = users.reduce((acc, user) => {
    const role = user.role_type || 'employee';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  const roleChartData = Object.entries(usersByRole).map(([role, count]) => ({
    name: role.replace('_', ' ').toUpperCase(),
    value: count
  }));

  // Training effectiveness analytics
  const completionRate = assignments.length > 0
    ? (assignments.filter(a => a.status === 'completed').length / assignments.length * 100).toFixed(1)
    : 0;

  const avgScore = assignments
    .filter(a => a.final_exam_score)
    .reduce((sum, a) => sum + a.final_exam_score, 0) / 
    (assignments.filter(a => a.final_exam_score).length || 1);

  const passRate = assignments.filter(a => a.final_exam_passed).length / 
    (assignments.filter(a => a.final_exam_score).length || 1) * 100;

  const trainingStatusData = [
    { name: 'Not Started', value: assignments.filter(a => a.status === 'not_started').length },
    { name: 'In Progress', value: assignments.filter(a => a.status === 'in_progress').length },
    { name: 'Completed', value: assignments.filter(a => a.status === 'completed').length },
    { name: 'Overdue', value: assignments.filter(a => a.status === 'overdue').length }
  ];

  // Incident analytics
  const incidentsByType = incidents.reduce((acc, inc) => {
    acc[inc.incident_type] = (acc[inc.incident_type] || 0) + 1;
    return acc;
  }, {});

  const incidentTypeData = Object.entries(incidentsByType).map(([type, count]) => ({
    type: type.replace('_', ' ').toUpperCase(),
    count
  }));

  const incidentsBySeverity = incidents.reduce((acc, inc) => {
    acc[inc.severity] = (acc[inc.severity] || 0) + 1;
    return acc;
  }, {});

  const severityData = Object.entries(incidentsBySeverity).map(([severity, count]) => ({
    name: severity.toUpperCase(),
    value: count
  }));

  // Patrol analytics
  const completedPatrols = patrols.filter(p => p.status === 'completed').length;
  const avgCheckpoints = patrols.reduce((sum, p) => sum + (p.scanned_checkpoints || 0), 0) / (patrols.length || 1);

  const handleGenerateAIReport = async (reportType) => {
    setGeneratingReport(true);
    try {
      const result = await base44.functions.invoke('generateAIAnalyticsReport', {
        reportType,
        period: selectedPeriod,
        data: {
          users: users.length,
          activeUsers,
          incidents: incidents.length,
          assignments: assignments.length,
          completionRate,
          avgScore,
          completedPatrols
        }
      });

      const blob = new Blob([result.data.report], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success("AI report generated successfully!");
    } catch (error) {
      toast.error("Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Analytics Dashboard"
        subtitle="Comprehensive insights and metrics"
        showBack
      />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Controls */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant={selectedPeriod === '7' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('7')}
              size="sm"
            >
              7 Days
            </Button>
            <Button
              variant={selectedPeriod === '30' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('30')}
              size="sm"
            >
              30 Days
            </Button>
            <Button
              variant={selectedPeriod === '90' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('90')}
              size="sm"
            >
              90 Days
            </Button>
          </div>
          <Button
            onClick={() => handleGenerateAIReport('comprehensive')}
            disabled={generatingReport}
            className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate AI Report
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Active Users</p>
                  <p className="text-3xl font-bold">{activeUsers}</p>
                  <p className="text-xs text-slate-500 mt-1">of {users.length} total</p>
                </div>
                <Users className="w-12 h-12 text-[#c9a227] opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Training Completion</p>
                  <p className="text-3xl font-bold">{completionRate}%</p>
                  <p className="text-xs text-slate-500 mt-1">{assignments.length} assignments</p>
                </div>
                <GraduationCap className="w-12 h-12 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Incidents Reported</p>
                  <p className="text-3xl font-bold">{incidents.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Last {selectedPeriod} days</p>
                </div>
                <AlertTriangle className="w-12 h-12 text-red-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Patrols Completed</p>
                  <p className="text-3xl font-bold">{completedPatrols}</p>
                  <p className="text-xs text-slate-500 mt-1">Avg {avgCheckpoints.toFixed(1)} checkpoints</p>
                </div>
                <Activity className="w-12 h-12 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">User Analytics</TabsTrigger>
            <TabsTrigger value="training">Training Effectiveness</TabsTrigger>
            <TabsTrigger value="incidents">Incident Trends</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Users by Role</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={roleChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {roleChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Engagement Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Active Users</span>
                        <span className="font-semibold">{activeUsers}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-[#c9a227] h-2 rounded-full"
                          style={{ width: `${(activeUsers / users.length) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Total Users</span>
                        <span className="font-semibold">{users.length}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Engagement Rate</span>
                        <span className="font-semibold">
                          {((activeUsers / users.length) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="training" className="space-y-6">
            {analyticsLoading ? (
              <LoadingScreen message="Analyzing training data..." />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Training Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-600">Completion Rate</p>
                        <p className="text-2xl font-bold">{completionRate}%</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-600">Avg Score</p>
                        <p className="text-2xl font-bold">{avgScore.toFixed(1)}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-600">Pass Rate</p>
                        <p className="text-2xl font-bold">{passRate.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="incidents" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Incidents by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={incidentTypeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#c9a227" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Severity Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {severityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Overall Performance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600">Patrol Completion Rate</p>
                    <p className="text-2xl font-bold">
                      {((completedPatrols / patrols.length) * 100 || 0).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600">Avg Checkpoints/Patrol</p>
                    <p className="text-2xl font-bold">{avgCheckpoints.toFixed(1)}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600">Total Patrols</p>
                    <p className="text-2xl font-bold">{patrols.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}