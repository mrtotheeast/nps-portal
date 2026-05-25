import React, { useState, useMemo } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function ScheduleListView({ shifts, employees, sites, onAddShift, onFilterClick, activeTab }) {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const filteredShifts = useMemo(() => {
    const weekEnd = addDays(weekStart, 6);
    const all = (shifts || []).filter(s => { const d = new Date(s.date); return d >= weekStart && d <= weekEnd; });
    if (activeTab === "open") return all.filter(s => !s.employee_id);
    if (activeTab === "myshifts") return all.filter(s => s.assigned_to === "current_user" || !s.employee_id);
    return all;
  }, [shifts, weekStart, activeTab]);

  const totalHours = useMemo(() => filteredShifts.reduce((sum, s) => {
    const start = parseInt(s.start_time?.split(":")[0]) || 0;
    const end = parseInt(s.end_time?.split(":")[0]) || 0;
    return sum + (end - start);
  }, 0), [filteredShifts]);

  const groupedByDate = useMemo(() => {
    const groups = {};
    filteredShifts.forEach(s => { if (!groups[s.date]) groups[s.date] = []; groups[s.date].push(s); });
    return groups;
  }, [filteredShifts]);

  const getEmployeeName = (id) => employees.find(e => e.id === id)?.full_name || "Unassigned";
  const getSiteName = (id) => sites.find(s => s.id === id)?.name || "Unknown Site";
  const getInitials = (name) => name.split(" ").map(n => n[0]).join("").toUpperCase();

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-2 p-4 border-b overflow-x-auto">
        <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft className="w-4 h-4" /></Button>
        <div className="flex gap-2">
          {weekDays.map(day => {
            const hasShifts = Object.keys(groupedByDate).some(d => isSameDay(new Date(d), day));
            return (
              <div key={day.toISOString()} className="text-center min-w-[50px]">
                <div className="text-xs text-slate-500 font-medium">{format(day, "EEE")}</div>
                <div className={`text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center mx-auto ${hasShifts ? "bg-[#c9a227] text-[#1a2b4a]" : "text-slate-400"}`}>{format(day, "d")}</div>
              </div>
            );
          })}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight className="w-4 h-4" /></Button>
      </div>
      <div className="flex items-center gap-2 p-4 border-b">
        <Button variant="outline" size="sm" onClick={onFilterClick} className="gap-2"><Filter className="w-4 h-4" />Filters</Button>
        <div className="flex-1" />
        <Button onClick={onAddShift} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] gap-2"><Plus className="w-4 h-4" />Add Shift</Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedByDate).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6"><p className="text-sm">No shifts scheduled for this week</p></div>
        ) : (
          <div className="space-y-2 p-4">
            {Object.entries(groupedByDate).sort(([a], [b]) => new Date(a) - new Date(b)).map(([date, dayShifts]) => (
              <div key={date}>
                <div className="text-xs font-semibold text-slate-500 uppercase mb-2">{format(new Date(date), "EEEE, MMMM d")}</div>
                <div className="space-y-2">
                  {dayShifts.map(shift => (
                    <Card key={shift.id} className="p-3 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10"><AvatarFallback className="bg-[#1a2b4a] text-white text-xs font-bold">{getInitials(getEmployeeName(shift.employee_id))}</AvatarFallback></Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{shift.start_time} - {shift.end_time}</p>
                            {shift.status === "confirmed" && <Badge className="bg-green-100 text-green-700 text-xs">✓</Badge>}
                          </div>
                          <p className="text-sm text-slate-600">{getEmployeeName(shift.employee_id)}</p>
                          <p className="text-xs text-slate-500">{getSiteName(shift.site_id)}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border-t bg-slate-50 px-4 py-3 sticky bottom-0">
        <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-600">Total Hours</span><span className="text-lg font-bold text-[#1a2b4a]">{totalHours}</span></div>
      </div>
    </div>
  );
}