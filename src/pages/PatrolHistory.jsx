import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Shield, Calendar, Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { format, differenceInMinutes } from "date-fns";
import PullToRefresh from "@/components/mobile/PullToRefresh";

export default function PatrolHistory() {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("30");

  const { data: patrols = [], isLoading, refetch } = useQuery({
    queryKey: ["patrol-history", dateRange],
    queryFn: async () => {
      const all = await base44.entities.PatrolSession.list("-start_time");
      if (dateRange === "all") return all;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(dateRange));
      return all.filter((p) => new Date(p.start_time) >= cutoff);
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: () => base44.entities.Site.list(),
  });

  const getSiteName = (id) => sites.find((s) => s.id === id)?.name || "Unknown Site";
  const getOfficerName = (id) => users.find((u) => u.id === id)?.full_name || "Unknown";
  const getDuration = (p) => {
    if (!p.start_time || !p.end_time) return "—";
    const mins = differenceInMinutes(new Date(p.end_time), new Date(p.start_time));
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const filtered = patrols.filter((p) => {
    const site = getSiteName(p.site_id).toLowerCase();
    const officer = getOfficerName(p.employee_id).toLowerCase();
    return !search || site.includes(search.toLowerCase()) || officer.includes(search.toLowerCase());
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Patrol History" subtitle="Review all completed patrol records" showBack />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Search by site or officer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <PullToRefresh onRefresh={refetch}>
          {filtered.length > 0 ? (
            <div className="space-y-3">
              {filtered.map((patrol) => {
                const completion = patrol.total_checkpoints > 0
                  ? Math.round((patrol.scanned_checkpoints / patrol.total_checkpoints) * 100) : 0;
                return (
                  <Card key={patrol.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Shield className="w-4 h-4 text-slate-400" />
                            <h3 className="font-semibold">{getSiteName(patrol.site_id)}</h3>
                            <Badge className={
                              patrol.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                              patrol.status === "active" ? "bg-blue-100 text-blue-700" :
                              "bg-slate-100 text-slate-700"
                            }>{patrol.status}</Badge>
                          </div>
                          <p className="text-sm text-slate-600">Officer: {getOfficerName(patrol.employee_id)}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {patrol.start_time ? format(new Date(patrol.start_time), "MMM d, yyyy") : "—"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {getDuration(patrol)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{patrol.scanned_checkpoints || 0}/{patrol.total_checkpoints || 0}</p>
                          <Badge className={completion === 100 ? "bg-emerald-100 text-emerald-700" : completion >= 80 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>
                            {completion}%
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={Shield} title="No patrol records found" description="Try adjusting your filters" />
          )}
        </PullToRefresh>
      </div>
    </div>
  );
}