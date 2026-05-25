import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminShiftCalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: shifts = [] } = useQuery({
    queryKey: ["admin-shifts-calendar"],
    queryFn: () => base44.entities.Shift.filter({ status: "confirmed" }, "date", 500),
    staleTime: 300000,
    gcTime: 600000,
  });

  const { data: sites = [] } = useQuery({ queryKey: ["sites"], queryFn: () => base44.entities.Site.list(), staleTime: 600000, gcTime: 900000 });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => base44.entities.User.list(), staleTime: 600000, gcTime: 900000 });

  const siteColors = useMemo(() => {
    const colors = [
      { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
      { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" },
      { bg: "bg-green-100", text: "text-green-700", border: "border-green-300" },
      { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" },
      { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300" },
      { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-300" },
      { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-300" },
      { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-300" },
    ];
    const colorMap = {};
    sites.forEach((site, idx) => { colorMap[site.id] = colors[idx % colors.length]; });
    return colorMap;
  }, [sites]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const shiftsByDate = useMemo(() => {
    const map = {};
    shifts.forEach((shift) => {
      if (shift.date) {
        if (!map[shift.date]) map[shift.date] = [];
        map[shift.date].push(shift);
      }
    });
    return map;
  }, [shifts]);

  const getEmployeeName = (id) => employees.find(e => e.id === id)?.full_name || "Unknown";
  const getSiteName = (id) => sites.find(s => s.id === id)?.name || "Unknown Site";
  const getShiftsForDate = (date) => shiftsByDate[format(date, "yyyy-MM-dd")] || [];

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-700 mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" />Shift Calendar ({format(currentMonth, "MMMM yyyy")})</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 pb-4 border-b">
          <p className="text-sm font-semibold text-slate-600 mb-2">Sites:</p>
          <div className="flex flex-wrap gap-3">
            {sites.slice(0, 8).map((site) => {
              const colors = siteColors[site.id];
              return (
                <div key={site.id} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${colors.bg} border ${colors.border}`}></div>
                  <span className="text-xs text-slate-600">{site.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-slate-600 py-2">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map((date) => {
              const dayShifts = getShiftsForDate(date);
              const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
              return (
                <div key={format(date, "yyyy-MM-dd")} className={`min-h-24 p-1 border rounded ${isToday ? "bg-[#c9a227]/10 border-[#c9a227]" : "bg-white border-slate-200"}`}>
                  <div className={`text-xs font-semibold mb-1 ${isToday ? "text-[#c9a227]" : "text-slate-600"}`}>{format(date, "d")}</div>
                  <div className="space-y-0.5">
                    {dayShifts.slice(0, 3).map((shift) => {
                      const colors = siteColors[shift.site_id] || { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" };
                      return (
                        <div key={shift.id} className={`text-xs p-1 rounded border ${colors.bg} ${colors.text} ${colors.border} truncate`} title={`${getEmployeeName(shift.employee_id)} - ${getSiteName(shift.site_id)}`}>
                          {getEmployeeName(shift.employee_id).split(" ")[0]}
                        </div>
                      );
                    })}
                    {dayShifts.length > 3 && <div className="text-xs text-slate-500 px-1 py-0.5">+{dayShifts.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {shifts.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <p className="text-sm text-slate-600"><strong>{shifts.length}</strong> confirmed shifts scheduled this month</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}