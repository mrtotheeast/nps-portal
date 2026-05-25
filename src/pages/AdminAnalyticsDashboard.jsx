import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { CalendarIcon, TrendingUp, Users, GraduationCap, MapPin, Download } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import ImportSummaryDashboard from "@/components/admin/ImportSummaryDashboard";
import ImportErrorLogViewer from "@/components/admin/ImportErrorLogViewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COLORS = ['#1a2b4a', '#c9a227', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function AdminAnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState("operations");
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 30), to: new Date() });
  const [selectedSite, setSelectedSite] = useState("all");
  const [timeFrame, setTimeFrame] = useState("30days");

  useEffect(() => {
    updateDateRange(timeFrame);
  }, [timeFrame]);

  const updateDateRange = (frame) => {
    const now = new Date();
    switch (frame) {
      case "7days":
        setDateRange({ from: subDays(now, 7), to: now });
        break;
      case "30days":
        setDateRange({ from: subDays(now, 30), to: now });
        break;
      case "thisMonth":
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case "thisWeek":
        setDateRange({ from: startOfWeek(now), to: endOfWeek(now) });
        break;
      default:
        setDateRange({ from: subDays(now, 30), to: now });
    }
  };

  const { data: incidents = [], isLoading: loadingIncidents } = useQuery({
    queryKey: ['analytics-incidents', dateRange, selectedSite],
    queryFn: async () => {
      const all = await base44.entities.Incident.list();
      return all.filter(inc => {
        const incDate = new Date(inc.incident_date);
        const inRange = incDate >= dateRange.from && incDate <= dateRange.to;
        const siteMatch = selectedSite === "all" || inc.site_id === selectedSite;
        return inRange && siteMatch;
      });
    }
  });

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['analytics-employees'],
    queryFn: () => base44.entities.Employee.filter({ employmentType: "officer", status: "active" })
  });

  const { data: trainingAssignments = [], isLoading: loadingTraining } = useQuery({
    queryKey: ['analytics-training', dateRange],
    queryFn: async () => {
      const all = await base44.entities.TrainingAssignment.list();
      return all.filter(t => {
        if (!t.assigned_date) return false;
        const assignedDate = new Date(t.assigned_date);
        return assignedDate >= dateRange.from && assignedDate <= dateRange.to;
      });
    }
  });

  const { data: patrolSessions = [], isLoading: loadingPatrol } = useQuery({
    queryKey: ['analytics-patrol', dateRange, selectedSite],
    queryFn: async () => {
      const all = await base44.entities.PatrolSession.list();
      return all.filter(p => {
        if (!p.start_time) return false;
        const sessionDate = new Date(p.start_time);
        const inRange = sessionDate >= dateRange.from && sessionDate <= dateRange.to;
        const siteMatch = selectedSite === "all" || p.site_id === selectedSite;
        return inRange && siteMatch;
      });
    }
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['analytics-sites'],
    queryFn: () => base44.entities.Site.list()
  });

  const isLoading = loadingIncidents || loadingEmployees || loadingTraining || loadingPatrol;

  const incidentTrends = useMemo(() => {
    const grouped = {};
    incidents.forEach(inc => {
      const day = format(new Date(inc.incident_date), 'MM/dd');
      grouped[day] = (grouped[day] || 0) + 1;
    });
    return Object.entries(grouped).map(([date, count]) => ({ date, count })).slice(-14);
  }, [incidents]);

  const incidentByType = useMemo(() => {
    const grouped = {};
    incidents.forEach(inc => {
      const type = inc.incident_type || 'other';
      grouped[type] = (grouped[type] || 0) + 1;
    });
    return Object.entries(grouped).map(([name, value]) => ({ 
      name: name.replace(/_/g, ' ').toUpperCase(), 
      value 
    }));
  }, [incidents]);

  const incidentBySeverity = useMemo(() => {
    const grouped = {};
    incidents.forEach(inc => {
      const severity = inc.severity || 'medium';
      grouped[severity] = (grouped[severity] || 0) + 1;
    });
    return Object.entries(grouped).map(([name, value]) => ({ 
      name: name.toUpperCase(), 
      value 
    }));
  }, [incidents]);

  const officerPerformance = useMemo(() => {
    const grouped = {};
    incidents.forEach(inc => {
      if (!inc.reporter_id) return;
      const officer = employees.find(e => e.id === inc.reporter_id);
      const name = officer ? `${officer.firstName} ${officer.lastName}` : 'Unknown';
      grouped[name] = (grouped[name] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([name, reports]) => ({ name, reports }))
      .sort((a, b) => b.reports - a.reports)
      .slice(0, 10);
  }, [incidents, employees]);

  const trainingStats = useMemo(() => {
    const completed = trainingAssignments.filter(t => t.status === 'completed').length;
    const inProgress = trainingAssignments.filter(t => t.status === 'in_progress').length;
    const notStarted = trainingAssignments.filter(t => t.status === 'not_started').length;
    
    return [
      { name: 'COMPLETED', value: completed, percentage: trainingAssignments.length ? Math.round((completed / trainingAssignments.length) * 100) : 0 },
      { name: 'IN PROGRESS', value: inProgress, percentage: trainingAssignments.length ? Math.round((inProgress / trainingAssignments.length) * 100) : 0 },
      { name: 'NOT STARTED', value: notStarted, percentage: trainingAssignments.length ? Math.round((notStarted / trainingAssignments.length) * 100) : 0 },
    ];
  }, [trainingAssignments]);

  const patrolEfficiency = useMemo(() => {
    return patrolSessions.map(p => {
      const completionRate = p.total_checkpoints ? Math.round((p.scanned_checkpoints / p.total_checkpoints) * 100) : 0;
      return {
        session: format(new Date(p.start_time), 'MM/dd HH:mm'),
        completionRate,
        checkpoints: p.scanned_checkpoints || 0
      };
    }).slice(-10);
  }, [patrolSessions]);

  const exportIncidentsCSV = () => {
    const siteName = (id) => sites.find(s => s.id === id)?.name || "Unknown Site";
    const officerName = (id) => {
      const emp = employees.find(e => e.id === id);
      return emp ? `${emp.firstName} ${emp.lastName}` : "Unknown";
    };

    const rows = [
      ["Date", "Type", "Severity", "Status", "Site", "Reported By", "Description"]
    ];
    incidents.forEach(inc => {
      rows.push([
        inc.incident_date ? format(new Date(inc.incident_date), "yyyy-MM-dd HH:mm") : "",
        inc.incident_type?.replace(/_/g, " ") || "",
        inc.severity || "",
        inc.status || "",
        siteName(inc.site_id),
        officerName(inc.reporter_id),
        (inc.description || "").replace(/"/g, "'"),
      ]);
    });

    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `incidents-${format(dateRange.from, "yyyy-MM-dd")}-to-${format(dateRange.to, "yyyy-MM-dd")}${selectedSite !== "all" ? `-${siteName(selectedSite).replace(/\s+/g, "_")}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportData = () => {
    const data = {
      dateRange: {
        from: format(dateRange.from, 'yyyy-MM-dd'),
        to: format(dateRange.to, 'yyyy-MM-dd')
      },
      summary: {
        totalIncidents: incidents.length,
        totalPatrols: patrolSessions.length,
        trainingCompletion: trainingStats[0]?.percentage || 0,
        activeOfficers: employees.length
      },
      incidentTrends,
      incidentByType,
      officerPerformance,
      trainingStats,
      patrolEfficiency
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
  };

  if (isLoading) return <LoadingScreen message="Loading analytics..." />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader 
        title="Analytics Dashboard" 
        subtitle="Comprehensive insights and metrics"
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="imports">Import Summary</TabsTrigger>
            <TabsTrigger value="errors">Error Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="operations" className="space-y-6 mt-6">
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium mb-2 block">Time Frame</label>
                    <Select value={timeFrame} onValueChange={setTimeFrame}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7days">Last 7 Days</SelectItem>
                        <SelectItem value="30days">Last 30 Days</SelectItem>
                        <SelectItem value="thisWeek">This Week</SelectItem>
                        <SelectItem value="thisMonth">This Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium mb-2 block">Site Filter</label>
                    <Select value={selectedSite} onValueChange={setSelectedSite}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sites</SelectItem>
                        {sites.map(site => (
                          <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="min-w-[260px]">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from && dateRange.to ? (
                          `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
                        ) : (
                          'Pick a date range'
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={(range) => range && setDateRange(range)}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>

                  <Button onClick={exportIncidentsCSV} variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" disabled={incidents.length === 0}>
                    <Download className="w-4 h-4 mr-2" /> Export Incidents CSV ({incidents.length})
                  </Button>
                  <Button onClick={exportData} variant="outline">
                    <Download className="w-4 h-4 mr-2" /> Export JSON
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
                  <TrendingUp className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{incidents.length}</div>
                  <p className="text-xs text-slate-500 mt-1">In selected period</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Active Officers</CardTitle>
                  <Users className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{employees.length}</div>
                  <p className="text-xs text-slate-500 mt-1">Currently active</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Training Completion</CardTitle>
                  <GraduationCap className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{trainingStats[0]?.percentage || 0}%</div>
                  <p className="text-xs text-slate-500 mt-1">
                    {trainingStats[0]?.value || 0} of {trainingAssignments.length} completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Patrol Sessions</CardTitle>
                  <MapPin className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{patrolSessions.length}</div>
                  <p className="text-xs text-slate-500 mt-1">In selected period</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Incident Trends (Last 14 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={incidentTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="#1a2b4a" strokeWidth={2} name="Incidents" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Incidents by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={incidentByType}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {incidentByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Officers by Incident Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={officerPerformance} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="reports" fill="#c9a227" name="Reports Filed" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Incidents by Severity</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={incidentBySeverity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#1a2b4a" name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Training Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {trainingStats.map((stat, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">{stat.name}</span>
                          <span className="text-sm text-slate-600">{stat.value} ({stat.percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${stat.percentage}%`,
                              backgroundColor: COLORS[idx]
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Patrol Checkpoint Completion (Last 10)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={patrolEfficiency}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="session" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completionRate" fill="#10b981" name="Completion %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="imports" className="mt-6">
            <ImportSummaryDashboard />
          </TabsContent>

          <TabsContent value="errors" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Import Error Log</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ImportErrorLogViewer />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}