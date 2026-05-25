import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Archive, Clock, AlertTriangle, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";

const STATUS_COLORS = {
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  resolved: "bg-blue-100 text-blue-700",
  closed: "bg-slate-100 text-slate-600",
};

export default function ArchivedRecords() {
  const [search, setSearch] = useState("");

  const { data: archivedTimesheets = [], isLoading: loadingTS } = useQuery({
    queryKey: ["archived-timesheets"],
    queryFn: () => base44.entities.Timesheet.filter({ archived: true }, "-date", 200),
  });

  const { data: archivedIncidents = [], isLoading: loadingInc } = useQuery({
    queryKey: ["archived-incidents"],
    queryFn: () => base44.entities.Incident.filter({ archived: true }, "-updated_date", 200),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  const filteredTS = archivedTimesheets.filter(ts => {
    const emp = userMap[ts.employee_id];
    return !search || (emp?.full_name || "").toLowerCase().includes(search.toLowerCase());
  });

  const filteredInc = archivedIncidents.filter(inc => {
    const q = search.toLowerCase();
    return !search ||
      (inc.incident_type || "").toLowerCase().includes(q) ||
      (inc.description || "").toLowerCase().includes(q);
  });

  if (loadingTS || loadingInc) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Archived Records"
        subtitle="Incidents and timesheets older than 90 days"
        showBack
        currentPage="Archived Records"
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Badge variant="outline" className="text-slate-600">
            {filteredTS.length + filteredInc.length} archived records
          </Badge>
        </div>

        <Tabs defaultValue="timesheets">
          <TabsList className="mb-4">
            <TabsTrigger value="timesheets">
              Timesheets ({filteredTS.length})
            </TabsTrigger>
            <TabsTrigger value="incidents">
              Incidents ({filteredInc.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timesheets">
            {filteredTS.length === 0 ? (
              <EmptyState icon={Clock} title="No archived timesheets" description="Approved or rejected timesheets older than 90 days will appear here." />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="p-3 text-left text-slate-500 font-medium">Employee</th>
                          <th className="p-3 text-left text-slate-500 font-medium">Date</th>
                          <th className="p-3 text-left text-slate-500 font-medium">Hours</th>
                          <th className="p-3 text-left text-slate-500 font-medium">Status</th>
                          <th className="p-3 text-left text-slate-500 font-medium">Manager Comment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredTS.map(ts => {
                          const emp = userMap[ts.employee_id];
                          return (
                            <tr key={ts.id} className="hover:bg-slate-50">
                              <td className="p-3 font-medium">{emp?.full_name || "Unknown"}</td>
                              <td className="p-3 text-slate-500">{ts.date ? format(parseISO(ts.date), "MMM d, yyyy") : "—"}</td>
                              <td className="p-3">{ts.total_hours?.toFixed(2) || "—"}</td>
                              <td className="p-3">
                                <Badge className={STATUS_COLORS[ts.status] || "bg-slate-100 text-slate-600"}>{ts.status}</Badge>
                              </td>
                              <td className="p-3 text-slate-500 max-w-xs truncate">{ts.manager_comment || ts.rejection_reason || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="incidents">
            {filteredInc.length === 0 ? (
              <EmptyState icon={AlertTriangle} title="No archived incidents" description="Resolved or closed incidents older than 90 days will appear here." />
            ) : (
              <div className="space-y-3">
                {filteredInc.map(inc => (
                  <Card key={inc.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-medium capitalize">{(inc.incident_type || "Incident").replace(/_/g, " ")}</p>
                            <Badge className={STATUS_COLORS[inc.status] || "bg-slate-100 text-slate-600"}>{inc.status}</Badge>
                            {inc.severity && (
                              <Badge variant="outline" className="text-xs">{inc.severity}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 truncate">{inc.description?.substring(0, 120)}</p>
                        </div>
                        <div className="text-xs text-slate-400 whitespace-nowrap">
                          {inc.incident_date ? format(new Date(inc.incident_date), "MMM d, yyyy") : "—"}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}