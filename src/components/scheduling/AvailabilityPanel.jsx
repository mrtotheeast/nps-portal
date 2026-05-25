import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, AlertCircle } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AvailabilityPanel({ employees, availability, selectedDate }) {
  const dayOfWeek = selectedDate ? selectedDate.getDay() : null;
  const getAvail = (empId) => dayOfWeek === null ? null : availability.find(a => a.employee_id === empId && a.day_of_week === dayOfWeek);

  const availableEmployees = employees.filter(emp => { const a = getAvail(emp.id); return !a || a.is_available !== false; });
  const unavailableEmployees = employees.filter(emp => { const a = getAvail(emp.id); return a && a.is_available === false; });

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" />Employee Availability
          {selectedDate && <Badge variant="outline" className="ml-auto">{DAYS[dayOfWeek]}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="p-4 space-y-4">
            {availableEmployees.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-700 mb-2">Available ({availableEmployees.length})</p>
                <div className="space-y-2">
                  {availableEmployees.map(emp => {
                    const avail = getAvail(emp.id);
                    return (
                      <div key={emp.id} className="p-2 bg-green-50 border border-green-200 rounded text-xs">
                        <p className="font-medium">{emp.full_name}</p>
                        <p className="text-slate-600">{emp.role_type}</p>
                        {avail && <p className="text-green-700 mt-1">{avail.start_time} - {avail.end_time}</p>}
                        {emp.max_hours && <Badge variant="outline" className="mt-1 text-xs">Max {emp.max_hours}h/wk</Badge>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {unavailableEmployees.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Unavailable ({unavailableEmployees.length})</p>
                <div className="space-y-2">
                  {unavailableEmployees.map(emp => {
                    const avail = getAvail(emp.id);
                    return (
                      <div key={emp.id} className="p-2 bg-red-50 border border-red-200 rounded text-xs opacity-60">
                        <p className="font-medium">{emp.full_name}</p>
                        <p className="text-slate-600">{emp.role_type}</p>
                        {avail?.notes && <p className="text-red-700 mt-1 text-xs">{avail.notes}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {availableEmployees.length === 0 && unavailableEmployees.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">No availability data for this day</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}