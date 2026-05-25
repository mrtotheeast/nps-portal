import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Search, MapPin, Clock, Camera, FileText, Download } from "lucide-react";
import { format, subDays } from "date-fns";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";

export default function ClientPatrolReports() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [dateRange, setDateRange] = useState("30");
  const [statusFilter, setStatusFilter] = useState("all");

  React.useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ["client-sites", user?.client_id],
    queryFn: async () => { if (!user?.client_id) return []; return base44.entities.Site.filter({ client_id: user.client_id }); },
    enabled: !!user?.client_id,
  });

  const { data: patrols = [] } = useQuery({
    queryKey: ["client-patrols", sites],
    queryFn: async () => { if (sites.length === 0) return []; const allPatrols = await base44.entities.PatrolSession.list(); return allPatrols.filter(p => sites.some(s => s.id === p.site_id)); },
    enabled: sites.length > 0,
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ["client-checkins", sites],
    queryFn: async () => { if (sites.length === 0) return []; const allCheckIns = await base44.entities.SiteCheckIn.list(); return allCheckIns.filter(ci => sites.some(s => s.id === ci.siteId)); },
    enabled: sites.length > 0,
  });

  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => base44.entities.Employee.list() });

  if (sitesLoading || !user) return <LoadingScreen />;

  const cutoffDate = subDays(new Date(), parseInt(dateRange));

  const filteredPatrols = patrols.filter(patrol => {
    const site = sites.find(s => s.id === patrol.site_id);
    const emp = employees.find(e => e.id === patrol.officer_id);
    const empName = emp ? `${emp.firstName} ${emp.lastName}` : '';
    return (
      (empName.toLowerCase().includes(searchQuery.toLowerCase()) || site?.name?.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (siteFilter === 'all' || patrol.site_id === siteFilter) &&
      (statusFilter === 'all' || patrol.status === statusFilter) &&
      new Date(patrol.start_time) >= cutoffDate
    );
  });

  const filteredCheckIns = checkIns.filter(ci => {
    const emp = employees.find(e => e.id === ci.employeeId);
    const empName = emp ? `${emp.firstName} ${emp.lastName}` : '';
    const site = sites.find(s => s.id === ci.siteId);
    return (
      (empName.toLowerCase().includes(searchQuery.toLowerCase()) || site?.name?.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (siteFilter === 'all' || ci.siteId === siteFilter) &&
      new Date(ci.checkInTime) >= cutoffDate
    );
  });

  const statusColors = {
    active: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
    incomplete: "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400",
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <PageHeader title="Patrol Reports & Check-ins" subtitle="View historical patrol data and site check-ins" showBack />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { label: "Total Patrols", value: filteredPatrols.length, icon: <Shield className="w-8 h-8 text-blue-500" /> },
            { label: "Check-ins", value: filteredCheckIns.length, icon: <MapPin className="w-8 h-8 text-green-500" /> },
            { label: "Completed", value: filteredPatrols.filter(p => p.status === 'completed').length, icon: <div className="w-3 h-3 rounded-full bg-green-500" /> },
            { label: "Active", value: filteredPatrols.filter(p => p.status === 'active').length, icon: <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" /> },
          ].map(({ label, value, icon }) => (
            <Card key={label} className="dark:border-slate-700"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500 dark:text-slate-400">{label}</p><p className="text-2xl font-bold">{value}</p></div>{icon}</div></CardContent></Card>
          ))}
        </div>

        <Card className="dark:border-slate-700">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search officer or site..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 dark:bg-slate-800 dark:border-slate-600" /></div>
              <Select value={siteFilter} onValueChange={setSiteFilter}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600"><SelectValue placeholder="All Sites" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Sites</SelectItem>{sites.map((site) => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:border-slate-700">
          <CardHeader><CardTitle>Patrol Sessions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {filteredPatrols.length === 0 ? <p className="text-center text-slate-500 dark:text-slate-400 py-8">No patrols found</p> : filteredPatrols.map((patrol) => {
              const site = sites.find(s => s.id === patrol.site_id);
              const emp = employees.find(e => e.id === patrol.officer_id);
              return (
                <div key={patrol.id} className="p-4 border rounded-lg dark:border-slate-700">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center"><Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
                      <div><p className="font-semibold">{emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown Officer'}</p><p className="text-sm text-slate-600 dark:text-slate-400">{site?.name || 'Unknown Site'}</p></div>
                    </div>
                    <Badge className={statusColors[patrol.status]}>{patrol.status}</Badge>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400"><Clock className="w-4 h-4" /><span>{format(new Date(patrol.start_time), 'MMM d, h:mm a')}{patrol.end_time && ` - ${format(new Date(patrol.end_time), 'h:mm a')}`}</span></div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400"><MapPin className="w-4 h-4" /><span>{patrol.scanned_checkpoints || 0} / {patrol.total_checkpoints || 0} checkpoints</span></div>
                    {patrol.photos?.length > 0 && <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400"><Camera className="w-4 h-4" /><span>{patrol.photos.length} photos</span></div>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="dark:border-slate-700">
          <CardHeader><CardTitle>QR Code Check-ins</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {filteredCheckIns.length === 0 ? <p className="text-center text-slate-500 dark:text-slate-400 py-8">No check-ins found</p> : filteredCheckIns.slice(0, 20).map((checkIn) => {
              const site = sites.find(s => s.id === checkIn.siteId);
              const emp = employees.find(e => e.id === checkIn.employeeId);
              return (
                <div key={checkIn.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center"><MapPin className="w-4 h-4 text-green-600 dark:text-green-400" /></div>
                    <div><p className="font-medium text-sm">{emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown'}</p><p className="text-xs text-slate-500 dark:text-slate-400">{site?.name || 'Unknown Site'}</p></div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{format(new Date(checkIn.checkInTime), 'MMM d, h:mm a')}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}