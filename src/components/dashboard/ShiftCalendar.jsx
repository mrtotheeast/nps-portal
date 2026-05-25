import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, MapPin, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ShiftCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const { data: shifts = [] } = useQuery({ queryKey: ["shifts-calendar"], queryFn: () => base44.entities.Shift.list("-start_time", 500), staleTime: 300000, gcTime: 600000 });
  const { data: employees = [] } = useQuery({ queryKey: ["shift-calendar-employees"], queryFn: () => base44.entities.Employee.filter({ status: "active" }, "", 200), staleTime: 600000, gcTime: 900000 });
  const { data: sites = [] } = useQuery({ queryKey: ["shift-calendar-sites"], queryFn: () => base44.entities.Site.list(), staleTime: 600000, gcTime: 900000 });

  const monthDays = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = startOfMonth(currentMonth).getDay();
  const paddingDays = Array.from({ length: firstDayOfWeek });

  const getShiftsForDay = (day) => shifts.filter((s) => { try { return isSameDay(new Date(s.date + "T00:00:00"), day); } catch { return false; } });
  const getEmployeeName = (id) => { const emp = employees.find(e => e.id === id); return emp ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email || "Employee" : "Unknown"; };
  const getSiteName = (id) => sites.find(s => s.id === id)?.name || "Unknown Site";

  const selectedShifts = selectedDay ? getShiftsForDay(selectedDay) : [];

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-[#c9a227]" />Patrol Shift Calendar</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm font-semibold min-w-[120px] text-center">{format(currentMonth, "MMMM yyyy")}</span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-lg overflow-hidden">
          {paddingDays.map((_, i) => <div key={`pad-${i}`} className="bg-white min-h-[72px]" />)}
          {monthDays.map((day) => {
            const dayShifts = getShiftsForDay(day);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const today = isToday(day);
            return (
              <div key={day.toISOString()} onClick={() => setSelectedDay(isSelected ? null : day)} className={`bg-white min-h-[72px] p-1 cursor-pointer transition-colors hover:bg-amber-50 ${isSelected ? "bg-amber-50 ring-2 ring-inset ring-[#c9a227]" : ""}`}>
                <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${today ? "bg-[#1a2b4a] text-white" : "text-slate-700"}`}>{format(day, "d")}</div>
                <div className="space-y-0.5">
                  {dayShifts.slice(0, 2).map((shift) => (
                    <div key={shift.id} className="text-[10px] leading-tight bg-[#c9a227]/15 text-[#1a2b4a] rounded px-1 py-0.5 truncate font-medium">{getEmployeeName(shift.employee_id).split(" ")[0]}</div>
                  ))}
                  {dayShifts.length > 2 && <div className="text-[10px] text-slate-400 px-1">+{dayShifts.length - 2} more</div>}
                </div>
              </div>
            );
          })}
        </div>

        {selectedDay && (
          <div className="mt-4 border border-slate-200 rounded-lg p-4">
            <h4 className="font-semibold text-slate-800 mb-3">
              {format(selectedDay, "EEEE, MMMM d, yyyy")}
              <Badge className="ml-2 bg-[#c9a227]/10 text-[#c9a227] border-0">{selectedShifts.length} shift{selectedShifts.length !== 1 ? "s" : ""}</Badge>
            </h4>
            {selectedShifts.length === 0 ? <p className="text-sm text-slate-400">No shifts scheduled for this day.</p> : (
              <div className="space-y-2">
                {selectedShifts.map((shift) => (
                  <div key={shift.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-[#1a2b4a] flex items-center justify-center text-white text-xs font-bold">{getEmployeeName(shift.employee_id).charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{getEmployeeName(shift.employee_id)}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500"><MapPin className="w-3 h-3" /><span className="truncate">{getSiteName(shift.site_id)}</span></div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-medium text-[#1a2b4a]">{shift.start_time} – {shift.end_time}</div>
                      <Badge className={`text-[10px] mt-1 ${shift.status === "completed" ? "bg-green-100 text-green-700" : shift.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>{shift.status || "scheduled"}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}