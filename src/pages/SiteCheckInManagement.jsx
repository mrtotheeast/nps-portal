import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { format } from "date-fns";

export default function SiteCheckInManagement() {
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");

  const { data: checkIns = [], isLoading } = useQuery({
    queryKey: ["site-checkins"],
    queryFn: () => base44.entities.SiteCheckIn?.list?.("-created_date") || Promise.resolve([]),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: () => base44.entities.Site.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const getSiteName = (id) => sites.find((s) => s.id === id)?.name || "Unknown Site";
  const getOfficerName = (id) => users.find((u) => u.id === id)?.full_name || "Unknown";

  const filtered = checkIns.filter((ci) => {
    const officer = getOfficerName(ci.employee_id).toLowerCase();
    const site = getSiteName(ci.site_id).toLowerCase();
    const matchSearch = !search || officer.includes(search.toLowerCase()) || site.includes(search.toLowerCase());
    const matchSite = siteFilter === "all" || ci.site_id === siteFilter;
    return matchSearch && matchSite;
  });

  const activeCounts = sites.map((site) => ({
    site,
    count: checkIns.filter((ci) => ci.site_id === site.id && !ci.check_out_time).length,
  }));

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Check-In Management" subtitle="Monitor who is on site" showBack />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {activeCounts.slice(0, 4).map(({ site, count }) => (
            <Card key={site.id}>
              <CardContent className="p-4">
                <p className="text-sm text-slate-600 truncate">{site.name}</p>
                <p className="text-2xl font-bold text-[#1a2b4a]">{count}</p>
                <p className="text-xs text-slate-500">on site now</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Search by officer or site..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
              <Select value={siteFilter} onValueChange={setSiteFilter}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((ci) => (
              <Card key={ci.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{getOfficerName(ci.employee_id)}</p>
                      <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5" />{getSiteName(ci.site_id)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {ci.check_in_time ? format(new Date(ci.check_in_time), "h:mm a") : "—"}
                        {ci.check_out_time ? ` → ${format(new Date(ci.check_out_time), "h:mm a")}` : " (Active)"}
                      </p>
                    </div>
                    <Badge className={ci.check_out_time ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-700"}>
                      {ci.check_out_time ? "Checked Out" : "On Site"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={Users} title="No check-ins found" />
        )}
      </div>
    </div>
  );
}