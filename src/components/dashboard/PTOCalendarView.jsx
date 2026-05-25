import React, { useState, useMemo } from "react";
import { Calendar, MapPin, AlertTriangle, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";

export default function PTOCalendarView({ ptoRequests = [], employees = [], sites = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSite, setSelectedSite] = useState("all");

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Filter approved PTOs only
  const approvedPTOs = ptoRequests.filter(req => req.status === "approved");

  // Get employee name and sites
  const getEmployeeInfo = (empId) => {
    const emp = employees.find(e => e.id === empId);
    return {
      name: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown",
      sites: emp?.siteIds || [],
    };
  };

  // Filter by selected site
  const filteredPTOs = selectedSite === "all"
    ? approvedPTOs
    : approvedPTOs.filter(pto => {
        const empSites = getEmployeeInfo(pto.employee_id).sites;
        return empSites.includes(selectedSite);
      });

  // Group PTOs by date and detect conflicts
  const ptosByDate = useMemo(() => {
    const grouped = {};
    
    filteredPTOs.forEach(pto => {
      const startDate = new Date(pto.start_date);
      const endDate = new Date(pto.end_date);
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = format(d, "yyyy-MM-dd");
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(pto);
      }
    });

    return grouped;
  }, [filteredPTOs]);

  // Detect conflicts on same date and site
  const getConflictCount = (dateStr) => {
    const dayPTOs = ptosByDate[dateStr] || [];
    if (dayPTOs.length <= 1) return 0;

    // Check if multiple employees from same site have PTO
    const siteMap = {};
    dayPTOs.forEach(pto => {
      const empSites = getEmployeeInfo(pto.employee_id).sites;
      empSites.forEach(siteId => {
        if (!siteMap[siteId]) siteMap[siteId] = [];
        siteMap[siteId].push(pto.employee_id);
      });
    });

    // Count conflicts (multiple people from same site)
    let maxConflict = 0;
    Object.values(siteMap).forEach(empIds => {
      if (empIds.length > 1) {
        maxConflict = Math.max(maxConflict, empIds.length);
      }
    });
    return maxConflict > 0 ? maxConflict : 0;
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Approved PTO Calendar
          </CardTitle>
          {sites.length > 1 && (
            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filter by site..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {sites.map(site => (
                  <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-sm"
            >
              ← Prev
            </button>
            <h3 className="text-lg font-semibold">{format(currentMonth, "MMMM yyyy")}</h3>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-sm"
            >
              Next →
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="border rounded-lg overflow-hidden">
            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-slate-100">
              {weekDays.map(day => (
                <div key={day} className="p-2 text-center text-sm font-semibold text-slate-600">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 border-t">
              {daysInMonth.map(day => {
                const dateStr = format(day, "yyyy-MM-dd");
                const dayPTOs = ptosByDate[dateStr] || [];
                const conflictCount = getConflictCount(dateStr);
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

                return (
                  <div
                    key={dateStr}
                    className={`min-h-24 p-2 border-r border-b ${
                      !isCurrentMonth ? "bg-slate-50" : "bg-white"
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-600 mb-1">
                      {format(day, "d")}
                    </div>
                    <div className="space-y-1">
                      {dayPTOs.slice(0, 2).map((pto, idx) => {
                        const empInfo = getEmployeeInfo(pto.employee_id);
                        return (
                          <div
                            key={`${pto.id}-${idx}`}
                            className={`text-xs p-1 rounded truncate ${
                              pto.pto_type === "vacation"
                                ? "bg-blue-100 text-blue-700"
                                : pto.pto_type === "sick"
                                ? "bg-red-100 text-red-700"
                                : "bg-purple-100 text-purple-700"
                            }`}
                            title={empInfo.name}
                          >
                            {empInfo.name.split(" ")[0]}
                          </div>
                        );
                      })}
                      {dayPTOs.length > 2 && (
                        <div className="text-xs px-1 text-slate-600">
                          +{dayPTOs.length - 2} more
                        </div>
                      )}
                      {conflictCount > 0 && (
                        <div className="flex items-center gap-1 mt-1 p-1 bg-red-50 rounded">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          <span className="text-xs font-semibold text-red-600">{conflictCount} conflict</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-sm mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded" />
              <span>Vacation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded" />
              <span>Sick Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded" />
              <span>Personal/Unpaid</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-red-600">Conflict Alert</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}