import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, MapPin } from "lucide-react";

export default function OfficerRosterView({ sites = [] }) {
  const { data: shifts = [] } = useQuery({
    queryKey: ["client-roster-shifts", sites.map(s => s.id).join(",")],
    queryFn: async () => {
      if (sites.length === 0) return [];
      const allShifts = await base44.entities.Shift.list();
      return allShifts.filter(s => sites.some(site => site.id === s.site_id) && s.status !== 'cancelled');
    },
    enabled: sites.length > 0, refetchInterval: 60000,
  });

  const { data: users = [] } = useQuery({ queryKey: ["users-roster"], queryFn: () => base44.entities.User.list() });
  const { data: employees = [] } = useQuery({ queryKey: ["employees-roster"], queryFn: () => base44.entities.Employee.list() });
  const { data: activePatrols = [] } = useQuery({ queryKey: ["active-patrols-roster"], queryFn: () => base44.entities.PatrolSession.filter({ status: "active" }), refetchInterval: 30000 });

  const getOfficerName = (employeeId) => {
    const user = users.find(u => u.id === employeeId);
    if (user?.full_name) return user.full_name;
    const emp = employees.find(e => e.id === employeeId);
    if (emp) return `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
    return null;
  };

  const rosterBySite = sites.map(site => {
    const siteShifts = shifts.filter(s => s.site_id === site.id);
    const officerIds = [...new Set(siteShifts.map(s => s.employee_id))];
    const officers = officerIds.map(id => {
      const name = getOfficerName(id);
      if (!name) return null;
      const isOnPatrol = activePatrols.some(p => p.officer_id === id);
      const todayShift = siteShifts.find(s => s.employee_id === id && s.date === new Date().toISOString().split('T')[0]);
      return { id, name, isOnPatrol, todayShift };
    }).filter(Boolean);
    return { site, officers };
  });

  return (
    <div className="space-y-4">
      {rosterBySite.map(({ site, officers }) => (
        <Card key={site.id}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-4 h-4 text-[#1a2b4a]" />{site.name}
              {site.address && <span className="text-sm font-normal text-slate-500">— {site.address.city || site.address.street}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {officers.length === 0 ? <p className="text-sm text-slate-500 py-2">No officers currently assigned to this site.</p> : (
              <div className="divide-y">
                {officers.map((officer) => (
                  <div key={officer.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#1a2b4a] flex items-center justify-center"><Shield className="w-4 h-4 text-[#c9a227]" /></div>
                      <span className="font-medium">{officer.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {officer.isOnPatrol && <Badge className="bg-emerald-100 text-emerald-800"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1.5 animate-pulse" />On Patrol</Badge>}
                      {officer.todayShift ? <Badge variant="outline" className="text-xs">{officer.todayShift.start_time} – {officer.todayShift.end_time}</Badge> : <Badge variant="outline" className="text-xs text-slate-400">Off Today</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {rosterBySite.length === 0 && <Card><CardContent className="py-8 text-center text-slate-500">No sites found for your account.</CardContent></Card>}
      <p className="text-xs text-slate-400 text-center">This roster is read-only. Officer names are shown for identification purposes only.</p>
    </div>
  );
}