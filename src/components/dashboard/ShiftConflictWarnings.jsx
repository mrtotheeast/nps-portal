import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function shiftsOverlap(a, b) {
  if (a.date !== b.date) return false;
  const aStart = timeToMinutes(a.start_time), aEnd = timeToMinutes(a.end_time);
  const bStart = timeToMinutes(b.start_time), bEnd = timeToMinutes(b.end_time);
  return aStart < bEnd && bStart < aEnd;
}

export default function ShiftConflictWarnings() {
  const today = new Date().toISOString().slice(0, 10);
  const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: shifts = [] } = useQuery({ queryKey: ["shifts-conflict-check"], queryFn: () => base44.entities.Shift.filter({ status: "scheduled" }, "", 500), staleTime: 300000, gcTime: 600000 });
  const { data: ptoRequests = [] } = useQuery({ queryKey: ["pto-approved"], queryFn: () => base44.entities.PTORequest.filter({ status: "approved" }, "", 200), staleTime: 300000, gcTime: 600000 });
  const { data: users = [] } = useQuery({ queryKey: ["all-users-conflict"], queryFn: () => base44.entities.User.list(), staleTime: 600000, gcTime: 900000 });
  const { data: sites = [] } = useQuery({ queryKey: ["sites"], queryFn: () => base44.entities.Site.list(), staleTime: 600000, gcTime: 900000 });

  const userMap = useMemo(() => { const m = {}; users.forEach(u => { m[u.id] = u; }); return m; }, [users]);
  const siteMap = useMemo(() => { const m = {}; sites.forEach(s => { m[s.id] = s; }); return m; }, [sites]);

  const upcomingShifts = shifts.filter(s => s.date >= today && s.date <= futureDate);

  const conflicts = useMemo(() => {
    const results = [];
    const byEmployee = {};
    upcomingShifts.forEach(s => { if (!byEmployee[s.employee_id]) byEmployee[s.employee_id] = []; byEmployee[s.employee_id].push(s); });
    Object.entries(byEmployee).forEach(([empId, empShifts]) => {
      for (let i = 0; i < empShifts.length; i++) {
        for (let j = i + 1; j < empShifts.length; j++) {
          if (shiftsOverlap(empShifts[i], empShifts[j])) {
            results.push({ type: "shift_overlap", employee: userMap[empId], shift1: empShifts[i], shift2: empShifts[j], site1: siteMap[empShifts[i].site_id], site2: siteMap[empShifts[j].site_id] });
          }
        }
      }
    });
    upcomingShifts.forEach(shift => {
      ptoRequests.filter(p => p.employee_id === shift.employee_id).forEach(pto => {
        if (shift.date >= pto.start_date && shift.date <= pto.end_date) {
          results.push({ type: "pto_conflict", employee: userMap[shift.employee_id], shift, pto, site: siteMap[shift.site_id] });
        }
      });
    });
    return results;
  }, [upcomingShifts, ptoRequests, userMap, siteMap]);

  if (conflicts.length === 0) return null;

  return (
    <Card className="mb-6 border-red-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-red-700"><AlertTriangle className="w-5 h-5" />Scheduling Conflicts ({conflicts.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {conflicts.map((c, i) => {
            const name = c.employee?.full_name || "Unknown Officer";
            if (c.type === "shift_overlap") {
              return (
                <div key={i} className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-red-800 text-sm">{name} — Double-booked</p>
                    <p className="text-xs text-red-600 mt-0.5">{c.shift1.date}: {c.site1?.name || "Site"} ({c.shift1.start_time}–{c.shift1.end_time}) &amp; {c.site2?.name || "Site"} ({c.shift2.start_time}–{c.shift2.end_time})</p>
                  </div>
                  <Badge className="bg-red-100 text-red-700 border-0 shrink-0">Overlap</Badge>
                </div>
              );
            }
            return (
              <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-amber-800 text-sm">{name} — Shift during approved PTO</p>
                  <p className="text-xs text-amber-600 mt-0.5">Shift on {c.shift.date} at {c.site?.name || "Site"} ({c.shift.start_time}–{c.shift.end_time}) — PTO: {c.pto.start_date} to {c.pto.end_date}</p>
                </div>
                <Badge className="bg-amber-100 text-amber-700 border-0 shrink-0">PTO</Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}