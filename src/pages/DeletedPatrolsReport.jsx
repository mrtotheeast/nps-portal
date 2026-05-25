import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Trash2, Calendar, User, MapPin, Clock, FileText, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";

export default function DeletedPatrolsReport() {
  const [searchQuery, setSearchQuery] = useState("");
  const [deletedBy, setDeletedBy] = useState("");
  const [dateRange, setDateRange] = useState("90");

  const { data: deletedPatrols = [], isLoading } = useQuery({
    queryKey: ["deleted-patrols", deletedBy, dateRange],
    queryFn: async () => {
      let patrols = await base44.entities.DeletedPatrol.list("-deleted_at");
      if (deletedBy) patrols = patrols.filter(p => p.deleted_by === deletedBy);
      if (dateRange !== "all") {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - parseInt(dateRange));
        patrols = patrols.filter(p => new Date(p.deleted_at) >= cutoff);
      }
      return patrols;
    }
  });

  const { data: admins = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => { const users = await base44.entities.User.list(); return users.filter(u => u.role === 'admin'); }
  });

  const filteredPatrols = deletedPatrols.filter(patrol => {
    const query = searchQuery.toLowerCase();
    return patrol.site_name?.toLowerCase().includes(query) || patrol.officer_name?.toLowerCase().includes(query) || patrol.deleted_by_name?.toLowerCase().includes(query);
  });

  const exportReport = () => {
    const csvContent = [
      ['Patrol ID', 'Site', 'Officer', 'Start Time', 'End Time', 'Deleted By', 'Deleted At', 'Reason', 'Retention Expires'].join(','),
      ...filteredPatrols.map(p => [p.patrol_id, p.site_name, p.officer_name, p.start_time, p.end_time, p.deleted_by_name, p.deleted_at, `"${p.deletion_reason || 'N/A'}"`, p.retention_expires_at].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `deleted-patrols-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); a.remove();
  };

  if (isLoading) return <LoadingScreen />;

  const now = new Date();
  const stats = {
    total: filteredPatrols.length,
    thisMonth: filteredPatrols.filter(p => { const d = new Date(p.deleted_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length,
    expiringSoon: filteredPatrols.filter(p => { const exp = new Date(p.retention_expires_at); const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() + 3); return exp <= cutoff; }).length
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Deleted Patrols Archive" subtitle="Audit trail of deleted patrol records (24-month retention)" showBack />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Deleted", value: stats.total, icon: <Trash2 className="w-12 h-12 text-red-400 opacity-20" />, color: "text-[#1a2b4a]" },
            { label: "This Month", value: stats.thisMonth, icon: <Calendar className="w-12 h-12 text-[#c9a227] opacity-20" />, color: "text-[#1a2b4a]" },
            { label: "Expiring Soon", value: stats.expiringSoon, icon: <Clock className="w-12 h-12 text-amber-600 opacity-20" />, color: "text-amber-600", sub: "Within 3 months" },
          ].map(({ label, value, icon, color, sub }) => (
            <Card key={label}><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-600">{label}</p><p className={`text-3xl font-bold ${color}`}>{value}</p>{sub && <p className="text-xs text-slate-500">{sub}</p>}</div>{icon}</div></CardContent></Card>
          ))}
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex gap-4 flex-wrap">
              <Input placeholder="Search patrols..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 min-w-48" />
              <Select value={deletedBy} onValueChange={setDeletedBy}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Deleted By" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Admins</SelectItem>
                  {admins.map(admin => <SelectItem key={admin.id} value={admin.id}>{admin.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="180">Last 6 Months</SelectItem>
                  <SelectItem value="365">Last Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportReport} variant="outline"><Download className="w-4 h-4 mr-2" />Export CSV</Button>
            </div>
          </CardContent>
        </Card>

        {filteredPatrols.length > 0 ? (
          <div className="space-y-4">
            {filteredPatrols.map((record) => (
              <Card key={record.id} className="border-red-100">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-red-50 border-2 border-red-200 flex items-center justify-center shrink-0"><Trash2 className="w-6 h-6 text-red-600" /></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-semibold text-lg">{record.site_name}</h3>
                        <Badge variant="outline" className="text-red-600 border-red-200">Deleted</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-3"><User className="w-4 h-4" />Officer: {record.officer_name}</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                        <div><p className="text-xs text-slate-500">Patrol Date</p><p className="font-medium">{format(new Date(record.end_time), "MMM d, yyyy")}</p></div>
                        <div><p className="text-xs text-slate-500">Deleted By</p><p className="font-medium text-red-600">{record.deleted_by_name}</p></div>
                        <div><p className="text-xs text-slate-500">Deleted At</p><p className="font-medium">{format(new Date(record.deleted_at), "MMM d, yyyy h:mm a")}</p></div>
                        <div><p className="text-xs text-slate-500">Retention Expires</p><p className="font-medium">{format(new Date(record.retention_expires_at), "MMM d, yyyy")}</p></div>
                      </div>
                      {record.deletion_reason && <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs font-medium text-slate-700 mb-1">Deletion Reason:</p><p className="text-sm text-slate-600">{record.deletion_reason}</p></div>}
                      <div className="flex gap-2 mt-3 text-xs text-slate-500">
                        <span>Patrol ID: {record.patrol_id}</span>
                        {record.patrol_data?.scanned_checkpoints && <span>• Checkpoints: {record.patrol_data.scanned_checkpoints}/{record.patrol_data.total_checkpoints}</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={Trash2} title="No deleted patrols" description="No patrol deletions match your filters" />
        )}
      </div>
    </div>
  );
}