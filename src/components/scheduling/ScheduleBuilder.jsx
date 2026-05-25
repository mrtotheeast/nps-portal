import React, { useState, useMemo } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Search, X, Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function ScheduleBuilder({ shifts, sites, employees, onPublish }) {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [selectedSite, setSelectedSite] = useState(sites?.[0]?.id || "");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [editingShift, setEditingShift] = useState(null);
  const [isDraft, setIsDraft] = useState(true);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const eligibleEmployees = useMemo(() => {
    let filtered = (employees || []).filter(e => !selectedSite || e.site_id === selectedSite || !e.site_id);
    if (searchQuery) filtered = filtered.filter(e => e.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    return filtered.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
  }, [employees, selectedSite, searchQuery]);

  const getSiteShifts = (employeeId, date) =>
    (shifts || []).filter(s => s.employee_id === employeeId && s.site_id === selectedSite && format(new Date(s.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd"));

  const handleSaveSchedule = async () => {
    await onPublish();
    setIsDraft(false);
    toast.success("Schedule published successfully");
  };

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white overflow-hidden">
      <div className={`transition-all ${sidebarOpen ? "w-56" : "w-0"} border-r overflow-hidden flex flex-col bg-slate-50`}>
        <div className="p-3 border-b">
          <div className="relative"><Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search employees..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 text-sm" /></div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {eligibleEmployees.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">No employees found</div>
          ) : (
            <div className="space-y-1 p-2">
              {eligibleEmployees.map(emp => {
                const empShifts = weekDays.flatMap(day => getSiteShifts(emp.id, day));
                return (
                  <div key={emp.id} className="p-2 bg-white rounded border border-slate-200 hover:border-[#c9a227] transition-colors">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7"><AvatarFallback className="text-xs font-bold bg-[#1a2b4a] text-white">{emp.full_name?.charAt(0) || "?"}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{emp.full_name}</p>
                        {empShifts.length > 0 && <p className="text-xs text-green-600 font-medium">{empShifts.length} shifts</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-3 border-b bg-white space-y-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-600">
              {sidebarOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </Button>
            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger className="w-48 text-sm"><SelectValue placeholder="Select site..." /></SelectTrigger>
              <SelectContent>{sites?.map(site => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex-1" />
            <div className="text-xs font-medium px-2 py-1 rounded bg-slate-100 text-slate-700">{isDraft ? "Draft" : "Published"}</div>
            <Button onClick={handleSaveSchedule} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] gap-2"><Save className="w-4 h-4" />Publish</Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft className="w-4 h-4" /></Button>
            <div className="flex-1 text-sm font-medium text-center">{format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}</div>
            <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <div className="inline-block min-w-full">
            <div className="flex border-b sticky top-0 bg-white">
              <div className="w-40 border-r p-2 font-semibold text-sm bg-slate-50 flex-shrink-0">Employee</div>
              {weekDays.map(day => (
                <div key={day.toISOString()} className="w-32 border-r p-2 font-semibold text-sm text-center bg-slate-50 flex-shrink-0">
                  <div>{format(day, "EEE")}</div><div className="text-xs text-slate-600">{format(day, "MMM d")}</div>
                </div>
              ))}
            </div>
            {eligibleEmployees.map(emp => (
              <div key={emp.id} className="flex border-b hover:bg-slate-50 transition-colors">
                <div className="w-40 border-r p-2 text-sm font-medium bg-white flex-shrink-0 truncate">{emp.full_name}</div>
                {weekDays.map(day => {
                  const dayShifts = getSiteShifts(emp.id, day);
                  return (
                    <div key={`${emp.id}-${day.toISOString()}`} onClick={() => { setSelectedCell({ employee: emp, date: day }); setEditingShift(null); setShowShiftModal(true); }}
                      className="w-32 border-r p-1 min-h-20 cursor-pointer hover:bg-[#c9a227]/5 transition-colors flex-shrink-0 text-xs">
                      {dayShifts.map(shift => (
                        <div key={shift.id} onClick={e => { e.stopPropagation(); setEditingShift(shift); setSelectedCell({ employee: emp, date: day }); setShowShiftModal(true); }}
                          className="bg-[#c9a227]/20 rounded p-1 mb-1 text-[#1a2b4a] font-semibold hover:bg-[#c9a227]/40 transition-colors">
                          <div>{shift.start_time}</div>
                          <div className="text-xs text-slate-600">{sites?.find(s => s.id === shift.site_id)?.name}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={showShiftModal} onOpenChange={setShowShiftModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingShift ? "Edit Shift" : "Add Shift"}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            {selectedCell && (
              <>
                <div className="text-sm text-slate-600"><strong>{selectedCell.employee.full_name}</strong><div>{format(selectedCell.date, "EEEE, MMMM d, yyyy")}</div></div>
                <Button onClick={() => { toast.success("Shift saved"); setShowShiftModal(false); }} className="w-full bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]">Save Shift</Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}