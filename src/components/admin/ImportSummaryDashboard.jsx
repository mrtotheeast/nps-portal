import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";

const COLORS = ["#10b981", "#ef4444", "#f59e0b"];

export default function ImportSummaryDashboard() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["import-summary"],
    queryFn: () => base44.entities.ImportErrorLog.list("-import_date", 100),
  });

  const runAudit = async () => {
    try {
      const res = await base44.functions.invoke("auditAndRemoveDuplicateEmployees", {});
      alert(`Audit Complete:\n${res.data.message}`);
    } catch (err) {
      alert(`Audit failed: ${err.message}`);
    }
  };

  // Calculate summary statistics
  const stats = {
    totalSessions: logs.length,
    totalImported: logs.reduce((sum, l) => sum + (l.successful_imports || 0), 0),
    totalFailed: logs.reduce((sum, l) => sum + (l.failed_imports || 0), 0),
    successRate: logs.length > 0 
      ? Math.round((logs.reduce((sum, l) => sum + (l.successful_imports || 0), 0) / logs.reduce((sum, l) => sum + (l.total_rows || 0), 0)) * 100)
      : 0,
    completedSessions: logs.filter(l => l.status === 'completed').length,
    partialSessions: logs.filter(l => l.status === 'partially_failed').length,
    failedSessions: logs.filter(l => l.status === 'failed').length,
  };

  // Prepare chart data - last 10 sessions
  const chartData = logs.slice(0, 10).reverse().map(session => ({
    name: new Date(session.import_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Successful: session.successful_imports || 0,
    Failed: session.failed_imports || 0,
  }));

  // Status pie chart data
  const statusData = [
    { name: 'Completed', value: stats.completedSessions },
    { name: 'Partial Failures', value: stats.partialSessions },
    { name: 'Failed', value: stats.failedSessions },
  ].filter(d => d.value > 0);

  if (isLoading) {
    return <div className="text-slate-500">Loading import summary...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-1">Total Imported</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.totalImported}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-1">Total Failed</p>
            <p className="text-2xl font-bold text-red-600">{stats.totalFailed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-1">Success Rate</p>
            <p className="text-2xl font-bold text-blue-600">{stats.successRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-1">Sessions</p>
            <p className="text-2xl font-bold">{stats.totalSessions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Button onClick={runAudit} size="sm" className="w-full bg-[#1a2b4a] text-xs">
              Run Audit
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Success/Failure by Session */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Import Results by Session</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Successful" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-slate-400 text-sm">No import data</div>
            )}
          </CardContent>
        </Card>

        {/* Session Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Session Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-slate-400 text-sm">No session data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Session Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-600">Completed</p>
                <p className="text-lg font-bold text-emerald-600">{stats.completedSessions}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-600">Partial Failures</p>
                <p className="text-lg font-bold text-amber-600">{stats.partialSessions}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-600">Failed</p>
                <p className="text-lg font-bold text-red-600">{stats.failedSessions}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}