import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, User, MapPin, Clock } from "lucide-react";
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns";

export default function ClientScheduleView({ sites = [] }) {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd = addDays(weekStart, 7);

  const { data: shifts = [] } = useQuery({
    queryKey: ["client-schedule-view", weekStart.toISOString(), sites.map(s => s.id).join(",")],
    queryFn: async () => {
      if (sites.length === 0) return [];
      const allShifts = await base44.entities.Shift.list();
      return allShifts.filter(shift => {
        const d = new Date(shift.date);
        return sites.some(s => s.id === shift.site_id) && d >= weekStart && d < weekEnd && shift.status !== 'cancelled';
      });
    },
    enabled: sites.length > 0,
    refetchInterval: 30000,
  });

  const { data: users = [] } = useQuery({ queryKey: ["users-schedule-view"], queryFn: () => base44.entities.User.list() });
  const { data: employees = [] } = useQuery({ queryKey: ["employees-schedule-view"], queryFn: () => base44.entities.Employee.list() });

  const getOfficerName = (id) => {
    const u = users.find(u => u.id === id);
    if (u?.full_name) return u.full_name;
    const e = employees.find(e => e.id === id);
    if (e) return `${e.firstName || ''} ${e.lastName || ''}`.trim();
    return "Unknown";
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = format(new Date(), 'yyyy-MM-dd');
  const statusColors = { scheduled: "bg-blue-100 text-blue-800", confirmed: "bg-green-100 text-green-800", completed: "bg-slate-100 text-slate-700" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setWeekStart(subWeeks(weekStart, 1))}><ChevronLeft className="w-4 h-4 mr-1" />Previous</Button>
        <div className="text-center"><p className="text-sm text-slate-500">Week of</p><p className="font-semibold">{format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}</p></div>
        <Button variant="outline" size="sm" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>Next<ChevronRight className="w-4 h-4 ml-1" /></Button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayShifts = shifts.filter(s => s.date === dayStr);
          const isToday = dayStr === today;
          return (
            <Card key={dayStr} className={`min-h-24 ${isToday ? 'ring-2 ring-[#c9a227]' : ''}`}>
              <CardHeader className="p-2 pb-1"><div className="text-center"><p className="text-xs text-slate-500">{format(day, 'EEE')}</p><p className={`text-sm font-bold ${isToday ? 'text-[#c9a227]' : ''}`}>{format(day, 'd')}</p></div></CardHeader>
              <CardContent className="p-1 space-y-1">
                {dayShifts.length === 0 ? <p className="text-xs text-center text-slate-300 py-1">—</p> : (
                  dayShifts.map(shift => {
                    const site = sites.find(s => s.id === shift.site_id);
                    return (
                      <div key={shift.id} className="p-1.5 bg-slate-50 rounded text-xs space-y-0.5 border">
                        <div className="flex items-center gap-1"><User className="w-2.5 h-2.5 text-slate-500 flex-shrink-0" /><span className="font-medium truncate">{getOfficerName(shift.employee_id)}</span></div>
                        <div className="flex items-center gap-1 text-slate-500"><MapPin className="w-2.5 h-2.5 flex-shrink-0" /><span className="truncate">{site?.name || '—'}</span></div>
                        <div className="flex items-center gap-1 text-slate-500"><Clock className="w-2.5 h-2.5 flex-shrink-0" /><span>{shift.start_time}–{shift.end_time}</span></div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="md:hidden">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4" />This Week's Shifts</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {shifts.length === 0 ? <p className="py-4 text-center text-slate-500 text-sm">No shifts scheduled this week</p> : (
            shifts.map(shift => {
              const site = sites.find(s => s.id === shift.site_id);
              return (
                <div key={shift.id} className="py-3">
                  <div className="flex items-center justify-between"><p className="font-medium">{getOfficerName(shift.employee_id)}</p><Badge className={statusColors[shift.status] || 'bg-slate-100 text-slate-700'} variant="outline">{shift.status}</Badge></div>
                  <p className="text-sm text-slate-500">{site?.name} · {format(new Date(shift.date), 'EEE, MMM d')} · {shift.start_time}–{shift.end_time}</p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 bg-blue-50 rounded-lg text-center"><p className="text-2xl font-bold text-blue-700">{shifts.length}</p><p className="text-xs text-blue-600">Total Shifts</p></div>
        <div className="p-3 bg-green-50 rounded-lg text-center"><p className="text-2xl font-bold text-green-700">{new Set(shifts.map(s => s.employee_id)).size}</p><p className="text-xs text-green-600">Officers</p></div>
        <div className="p-3 bg-purple-50 rounded-lg text-center"><p className="text-2xl font-bold text-purple-700">{new Set(shifts.map(s => s.site_id)).size}</p><p className="text-xs text-purple-600">Sites Covered</p></div>
      </div>
      <p className="text-xs text-slate-400 text-center">Schedule updates automatically when changes are made. Read-only view.</p>
    </div>
  );
}