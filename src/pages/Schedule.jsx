import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useTenantFilter } from "@/hooks/useTenantFilter";
import { format, addDays, startOfWeek, parseISO, isSameDay, isBefore } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, Clock, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";

export default function Schedule() {
  const tenantFilter = useTenantFilter();
  const [user, setUser] = useState(null);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedSiteId, setSelectedSiteId] = useState("all");

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  // Get the current user's Employee record
  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee", user?.email],
    queryFn: async () => {
      const emps = await base44.entities.Employee.filter({ email: user.email });
      return emps[0] || null;
    },
    enabled: !!user?.email,
  });

  const role = currentEmployee?.role || user?.role_type || user?.role || "employee";
  const isSupervisor = role === "supervisor";
  const isManager = role === "manager" || role === "admin";
  const isEmployee = !isSupervisor && !isManager;

  const { data: allSites = [] } = useQuery({
    queryKey: ["sites", tenantFilter],
    queryFn: () => base44.entities.Site.filter(tenantFilter),
    enabled: !!tenantFilter.company_id,
  });

  // Determine which sites this user can see
  const visibleSites = isSupervisor
    ? allSites
    : isManager
    ? allSites.filter(s => currentEmployee?.siteIds?.includes(s.id))
    : allSites.filter(s => currentEmployee?.siteIds?.includes(s.id));

  // Fetch all shifts for supervisors/managers (site-scoped), or own shifts + site shifts for employees
  const { data: allShifts = [], isLoading } = useQuery({
    queryKey: ["schedule-shifts", role, currentEmployee?.id, currentEmployee?.siteIds],
    queryFn: async () => {
      if (isSupervisor) {
        // All shifts across all sites for this company
        return base44.entities.Shift.filter(tenantFilter, "-start_time", 2000);
      } else if (isManager) {
        // Shifts for assigned sites only
        const siteIds = currentEmployee?.siteIds || [];
        if (siteIds.length === 0) return [];
        const allFetched = await Promise.all(
          siteIds.map(sid => base44.entities.Shift.filter({ site_id: sid }, "-start_time"))
        );
        return allFetched.flat();
      } else {
        // Employee: own shifts + all shifts at their assigned sites
        const siteIds = currentEmployee?.siteIds || [];
        const [ownShifts, siteShiftsArrays] = await Promise.all([
          base44.entities.Shift.filter({ employee_id: currentEmployee.id }, "-start_time"),
          siteIds.length > 0
            ? Promise.all(siteIds.map(sid => base44.entities.Shift.filter({ site_id: sid }, "-start_time")))
            : Promise.resolve([])
        ]);
        const siteShifts = siteShiftsArrays.flat();
        // Merge, deduplicate by id
        const map = new Map();
        [...ownShifts, ...siteShifts].forEach(s => map.set(s.id, s));
        return Array.from(map.values());
      }
    },
    enabled: !!currentEmployee || isSupervisor,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-schedule", tenantFilter],
    queryFn: () => base44.entities.Employee.filter(tenantFilter, "-created_date", 2000),
    enabled: (isSupervisor || isManager) && !!tenantFilter.company_id,
  });

  const getSiteById = (id) => allSites.find(s => s.id === id);
  const getEmployeeById = (id) => employees.find(e => e.id === id);

  // Filter shifts by selected site (for supervisors/managers)
  const filteredShifts = (isSupervisor || isManager) && selectedSiteId !== "all"
    ? allShifts.filter(s => s.site_id === selectedSiteId)
    : allShifts;

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getShiftsForDay = (date) =>
    filteredShifts.filter(shift => {
      const shiftDate = shift.start_time ? parseISO(shift.start_time) : shift.date ? parseISO(shift.date) : null;
      return shiftDate && isSameDay(shiftDate, date);
    });

  const upcomingShifts = filteredShifts
    .filter(s => {
      const d = s.start_time ? parseISO(s.start_time) : s.date ? parseISO(s.date) : null;
      return d && !isBefore(d, new Date());
    })
    .sort((a, b) => {
      const da = a.start_time || a.date;
      const db = b.start_time || b.date;
      return new Date(da) - new Date(db);
    })
    .slice(0, 20);

  const isMyShift = (shift) => shift.employee_id === currentEmployee?.id;

  const getShiftTime = (shift) => {
    if (shift.start_time) {
      return `${format(parseISO(shift.start_time), "h:mm a")} - ${format(parseISO(shift.end_time || shift.start_time), "h:mm a")}`;
    }
    return `${shift.start_time || ""} - ${shift.end_time || ""}`;
  };

  const pageTitle = isSupervisor ? "All Sites Schedule" : isManager ? "My Sites Schedule" : "My Schedule";
  const pageSubtitle = isSupervisor
    ? "View schedules across all sites"
    : isManager
    ? "View schedules for your assigned sites"
    : "Your shifts and your site's schedule";

  if (!currentEmployee && !isSupervisor) return <LoadingScreen />;
  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title={pageTitle} subtitle={pageSubtitle} showBack />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Site filter for supervisors/managers */}
        {(isSupervisor || isManager) && visibleSites.length > 0 && (
          <div className="mb-6">
            <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by site..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {visibleSites.map(site => (
                  <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Tabs defaultValue="week">
          <TabsList className="mb-6 w-full">
            <TabsTrigger value="week" className="flex-1">Week View</TabsTrigger>
            <TabsTrigger value="list" className="flex-1">List View</TabsTrigger>
          </TabsList>

          <TabsContent value="week">
            {/* Week navigator */}
            <Card className="mb-6 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <h2 className="font-semibold">
                    {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
                  </h2>
                  <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {weekDays.map((day) => {
                const dayShifts = getShiftsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isPast = isBefore(day, new Date()) && !isToday;

                return (
                  <Card
                    key={day.toISOString()}
                    className={`shadow-sm ${isToday ? "border-[#c9a227] border-2" : ""} ${isPast ? "opacity-60" : ""}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`text-center min-w-[60px] p-2 rounded-lg ${isToday ? "bg-[#c9a227] text-[#1a2b4a]" : "bg-slate-100"}`}>
                          <p className="text-xs font-medium">{format(day, "EEE")}</p>
                          <p className="text-2xl font-bold">{format(day, "d")}</p>
                        </div>

                        <div className="flex-1">
                          {dayShifts.length > 0 ? (
                            <div className="space-y-2">
                              {dayShifts.map((shift) => {
                                const site = getSiteById(shift.site_id);
                                const emp = isEmployee ? null : getEmployeeById(shift.employee_id);
                                const mine = isEmployee && isMyShift(shift);
                                return (
                                  <div
                                    key={shift.id}
                                    className={`p-3 rounded-lg border ${mine ? "bg-[#c9a227]/10 border-[#c9a227]/40" : "bg-blue-50 border-blue-100"}`}
                                  >
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                      <div className="flex items-center gap-2">
                                        <Clock className={`w-4 h-4 ${mine ? "text-[#c9a227]" : "text-blue-600"}`} />
                                        <span className="font-medium text-sm">{getShiftTime(shift)}</span>
                                        {mine && <Badge className="bg-[#c9a227] text-[#1a2b4a] text-xs">My Shift</Badge>}
                                      </div>
                                      <Badge variant="outline" className="bg-white text-xs">{shift.status}</Badge>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                                      {site && (
                                        <div className="flex items-center gap-1">
                                          <Building2 className="w-3.5 h-3.5" />
                                          {site.name}
                                        </div>
                                      )}
                                      {emp && (
                                        <div className="flex items-center gap-1">
                                          <User className="w-3.5 h-3.5" />
                                          {emp.firstName} {emp.lastName}
                                        </div>
                                      )}
                                      {shift.role && (
                                        <span className="text-slate-500">{shift.role}</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-slate-400 py-2 text-sm">No shifts scheduled</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="list">
            {upcomingShifts.length > 0 ? (
              <div className="space-y-3">
                {upcomingShifts.map((shift) => {
                  const site = getSiteById(shift.site_id);
                  const emp = isEmployee ? null : getEmployeeById(shift.employee_id);
                  const shiftDate = shift.start_time ? parseISO(shift.start_time) : shift.date ? parseISO(shift.date) : null;
                  const isToday = shiftDate && isSameDay(shiftDate, new Date());
                  const mine = isEmployee && isMyShift(shift);

                  return (
                    <Card key={shift.id} className={`shadow-sm ${isToday ? "border-[#c9a227] border-2" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-slate-500" />
                            <span className="font-semibold">
                              {isToday ? "Today" : shiftDate ? format(shiftDate, "EEEE, MMM d") : ""}
                            </span>
                            {mine && <Badge className="bg-[#c9a227] text-[#1a2b4a] text-xs">My Shift</Badge>}
                          </div>
                          <Badge variant="outline">{shift.status}</Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {getShiftTime(shift)}
                          </div>
                          {site && (
                            <div className="flex items-center gap-1">
                              <Building2 className="w-4 h-4" />
                              {site.name}
                            </div>
                          )}
                          {emp && (
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {emp.firstName} {emp.lastName}
                            </div>
                          )}
                          {shift.role && <span className="text-slate-400">{shift.role}</span>}
                        </div>

                        {shift.notes && (
                          <p className="text-sm text-slate-500 mt-2">{shift.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Calendar}
                title="No upcoming shifts"
                description="Check back later for the schedule"
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}