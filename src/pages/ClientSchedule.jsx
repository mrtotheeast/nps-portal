import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";

export default function ClientSchedule() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["client-shifts"],
    queryFn: () => base44.entities.Shift?.list?.() || Promise.resolve([]),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const getOfficerName = (id) => {
    const emp = employees.find((e) => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : "TBD";
  };

  const shiftsForDay = (day) =>
    shifts.filter((s) => s.date && isSameDay(new Date(s.date), day));

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Security Schedule" subtitle="Officers assigned to your sites" showBack />
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Week Navigation */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="font-semibold">
                {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {weekDays.map((day) => {
            const dayShifts = shiftsForDay(day);
            return (
              <Card key={day.toISOString()}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{format(day, "EEEE, MMM d")}</span>
                    {dayShifts.length > 0 && (
                      <Badge className="bg-emerald-100 text-emerald-700">{dayShifts.length} shift(s)</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dayShifts.length > 0 ? (
                    <div className="space-y-2">
                      {dayShifts.map((shift) => (
                        <div key={shift.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{getOfficerName(shift.employee_id)}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {shift.start_time || "—"} – {shift.end_time || "—"}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">{shift.position || "Security"}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 py-2">No shifts scheduled</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}