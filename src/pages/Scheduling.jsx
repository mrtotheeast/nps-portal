import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useTenantFilter } from "@/hooks/useTenantFilter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, startOfWeek, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Bell, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import ShiftDialog from "@/components/scheduling/ShiftDialog";
import BulkAssignDialog from "@/components/scheduling/BulkAssignDialog";
import CopyWeekDialog from "@/components/scheduling/CopyWeekDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Scheduling() {
  const queryClient = useQueryClient();
  const tenantFilter = useTenantFilter();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [selectedTab, setSelectedTab] = useState("all");
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showCopyWeek, setShowCopyWeek] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: employees = [], isLoading: empLoading } = useQuery({
    queryKey: ["all-employees", tenantFilter],
    queryFn: () => base44.entities.Employee.filter(tenantFilter, "", 2000),
    enabled: !!tenantFilter.company_id,
  });

  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ["sites", tenantFilter],
    queryFn: async () => {
      const filtered = await base44.entities.Site.filter(tenantFilter);
      if (filtered.length > 0) return filtered;
      return base44.entities.Site.filter({});
    },
    enabled: !!tenantFilter.company_id,
  });

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ["shifts", tenantFilter],
    queryFn: () => base44.entities.Shift.filter(tenantFilter, "", 1000),
    enabled: !!tenantFilter.company_id,
  });

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, [weekStart]);

  const shiftsForWeek = useMemo(() => {
    return shifts.filter(s => {
      const shiftDate = new Date(s.date);
      return shiftDate >= weekStart && shiftDate < addDays(weekStart, 7);
    });
  }, [shifts, weekStart]);

  const createShiftMutation = useMutation({
    mutationFn: async (shiftData) => {
      return base44.entities.Shift.create({
        employee_id: shiftData.employee_id,
        site_id: shiftData.site_id,
        date: shiftData.date,
        start_time: shiftData.start_time,
        end_time: shiftData.end_time,
        status: 'scheduled'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["shifts"]);
      toast.success("Shift created");
      setShowShiftDialog(false);
    }
  });

  const bulkAssignMutation = useMutation({
    mutationFn: async (data) => {
      const allShifts = data.employee_ids.map(emp_id => ({
        employee_id: emp_id,
        site_id: data.site_id,
        date: data.date,
        start_time: data.start_time,
        end_time: data.end_time,
        status: 'scheduled'
      }));
      return base44.entities.Shift.bulkCreate(allShifts);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(["shifts"]);
      toast.success(`Shifts assigned to ${result?.length || 0} employees successfully`);
      setShowBulkDialog(false);
    }
  });

  const copyWeekMutation = useMutation({
    mutationFn: async () => {
      const weeksShifts = shiftsForWeek;
      const nextWeekShifts = weeksShifts.map(s => ({
        employee_id: s.employee_id,
        site_id: s.site_id,
        date: format(addDays(new Date(s.date), 7), "yyyy-MM-dd"),
        start_time: s.start_time,
        end_time: s.end_time,
        status: 'scheduled'
      }));
      return base44.entities.Shift.bulkCreate(nextWeekShifts);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(["shifts"]);
      toast.success(`Copied ${result?.length || 0} shifts to next week`);
      setShowCopyWeek(false);
    }
  });

  const getInitials = (firstName, lastName) => `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();

  if (empLoading || sitesLoading || shiftsLoading) return <LoadingScreen />;

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-[#1a2b4a] text-white px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold">Schedule</h1>
            <p className="text-sm opacity-90">{format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d")}</p>
          </div>
          <Button size="sm" onClick={() => setShowShiftDialog(true)} className="bg-[#c9a227] text-[#1a2b4a] hover:bg-[#b8922a] h-9 font-semibold">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Week Navigator */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))} className="text-white hover:bg-[#2d4a6f] h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCopyWeek(true)} className="text-white hover:bg-[#2d4a6f] text-xs h-8">
              Copy Week
            </Button>
          </div>
          <div className="flex gap-1 overflow-x-auto flex-1">
            {weekDays.map((day, idx) => (
              <div key={idx} className="text-center min-w-[45px]">
                <div className="text-xs opacity-75">{format(day, "E")}</div>
                <div className="text-sm font-bold">{format(day, "d")}</div>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))} className="text-white hover:bg-[#2d4a6f] h-8 w-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b sticky top-20 z-30">
        <div className="flex gap-0">
          {["all", "myshifts", "unassigned"].map(tab => (
            <button key={tab} onClick={() => setSelectedTab(tab)} className={cn("flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors", selectedTab === tab ? "border-[#c9a227] text-[#1a2b4a] bg-blue-50 font-semibold" : "border-transparent text-slate-600")}>
              {tab === "all" ? "All Shifts" : tab === "myshifts" ? "My Shifts" : "Open"}
            </button>
          ))}
        </div>
      </div>

      {/* Shifts List */}
      <div className="max-w-2xl mx-auto px-0 sm:px-4 py-4">
        {shiftsForWeek.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No shifts scheduled</p>
            <Button onClick={() => setShowShiftDialog(true)} className="mt-4 bg-emerald-500 hover:bg-emerald-600">
              <Plus className="w-4 h-4 mr-2" /> Add Shift
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {shiftsForWeek.map((shift) => {
              const emp = employees.find(e => e.id === shift.employee_id);
              const site = sites.find(s => s.id === shift.site_id);
              return (
                <Card key={shift.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="bg-gradient-to-r from-blue-50 to-slate-50 p-4 border-l-4 border-[#c9a227]">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1a2b4a] text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {emp ? getInitials(emp.firstName, emp.lastName) : "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{emp ? `${emp.firstName} ${emp.lastName}` : "Unknown"}</p>
                        <p className="text-xs text-slate-500">{site?.name || "Unknown Site"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#1a2b4a]">{shift.start_time} - {shift.end_time}</p>
                        <p className="text-xs text-slate-500">{format(new Date(shift.date), "MMM d")}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!isMobile && (
        <div className="fixed bottom-6 right-6 flex gap-3">
          <Button onClick={() => setShowBulkDialog(true)} className="bg-[#1a2b4a] hover:bg-[#2d4a6f] rounded-full shadow-lg h-12 w-12 p-0">
            <Users className="w-5 h-5" />
          </Button>
        </div>
      )}

      <ShiftDialog
        open={showShiftDialog}
        onClose={() => { setShowShiftDialog(false); setSelectedShift(null); }}
        onSave={(data) => createShiftMutation.mutate(data)}
        shift={selectedShift}
        employees={employees}
        sites={sites}
      />

      <BulkAssignDialog
        open={showBulkDialog}
        onClose={() => setShowBulkDialog(false)}
        onSave={(data) => bulkAssignMutation.mutate(data)}
        employees={employees}
        sites={sites}
      />

      <CopyWeekDialog
        open={showCopyWeek}
        onClose={() => setShowCopyWeek(false)}
        onConfirm={() => copyWeekMutation.mutate()}
        weekStart={weekStart}
        shiftCount={shiftsForWeek.length}
      />
    </div>
  );
}