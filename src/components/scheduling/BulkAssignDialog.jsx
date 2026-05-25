import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format, addDays } from "date-fns";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BulkAssignDialog({ open, onClose, onSave, employees = [], sites = [] }) {
  const [step, setStep] = useState("select"); // select, assign, copy
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPosition, setExpandedPosition] = useState(null);
  const [selectAll, setSelectAll] = useState(false);
  
  // Assign step
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [site, setSite] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  
  // Copy week step
  const [copyMode, setCopyMode] = useState(false);

  const grouped = useMemo(() => {
    const positions = {};
    const active = employees.filter(e => e.status === "active" && e.invitation_status === "active");
    active.forEach(emp => {
      const pos = emp.positionTitle || "Unassigned";
      if (!positions[pos]) positions[pos] = [];
      if (!searchQuery || emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) {
        positions[pos].push(emp);
      }
    });
    return positions;
  }, [employees, searchQuery]);

  const filteredEmployees = useMemo(() => {
    return Object.values(grouped).flat();
  }, [grouped]);

  const handleSelectPosition = (position) => {
    const positionEmps = grouped[position];
    const allSelected = positionEmps.every(e => selectedEmployees.includes(e.id));
    if (allSelected) {
      setSelectedEmployees(prev => prev.filter(id => !positionEmps.some(e => e.id === id)));
    } else {
      setSelectedEmployees(prev => [...new Set([...prev, ...positionEmps.map(e => e.id)])]);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedEmployees([]);
      setSelectAll(false);
    } else {
      setSelectedEmployees(filteredEmployees.map(e => e.id));
      setSelectAll(true);
    }
  };

  const handleSave = () => {
    if (selectedEmployees.length === 0 || !site || !date) return;
    onSave({
      employee_ids: selectedEmployees,
      site_id: site,
      date,
      start_time: startTime,
      end_time: endTime
    });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setStep("select");
    setSelectedEmployees([]);
    setSelectAll(false);
    setSearchQuery("");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setSite("");
    setStartTime("08:00");
    setEndTime("17:00");
    setExpandedPosition(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "select" ? "Select Employees" : step === "assign" ? "Assign Shift" : "Copy Week"}
          </DialogTitle>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4">
            <div className="relative">
              <Input placeholder="Search employees..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="rounded-lg" />
            </div>

            <div className="flex items-center justify-between px-2">
              <span className="text-sm font-medium">
                {selectedEmployees.length} of {filteredEmployees.length} selected
              </span>
              <Button variant="outline" size="sm" onClick={handleSelectAll} className="text-xs">
                {selectAll ? "Clear All" : "Select All"}
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3 bg-slate-50">
              {Object.keys(grouped).map(position => {
                const positionEmps = grouped[position];
                const allSelected = positionEmps.every(e => selectedEmployees.includes(e.id));
                const someSelected = positionEmps.some(e => selectedEmployees.includes(e.id));
                return (
                  <div key={position}>
                    <div onClick={() => setExpandedPosition(expandedPosition === position ? null : position)} className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-lg cursor-pointer font-medium text-sm">
                      <Checkbox checked={allSelected} indeterminate={someSelected && !allSelected} onClick={e => { e.stopPropagation(); handleSelectPosition(position); }} />
                      <ChevronDown className={cn("w-4 h-4 transition-transform", expandedPosition === position && "rotate-180")} />
                      <span>{position}</span>
                      <Badge className="ml-auto text-xs bg-slate-200">{positionEmps.length}</Badge>
                    </div>
                    {expandedPosition === position && (
                      <div className="ml-6 space-y-1">
                        {positionEmps.map(emp => (
                          <div key={emp.id} onClick={() => setSelectedEmployees(prev => prev.includes(emp.id) ? prev.filter(x => x !== emp.id) : [...prev, emp.id])} className={cn("flex items-center gap-2 p-2 rounded cursor-pointer text-sm", selectedEmployees.includes(emp.id) ? "bg-blue-100" : "hover:bg-slate-100")}>
                            <Checkbox checked={selectedEmployees.includes(emp.id)} />
                            <span>{emp.full_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button onClick={() => setStep("assign")} disabled={selectedEmployees.length === 0} className="flex-1 bg-[#1a2b4a]">
                Continue ({selectedEmployees.length})
              </Button>
            </div>
          </div>
        )}

        {step === "assign" && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Site</Label>
              <Select value={site} onValueChange={setSite}>
                <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                <SelectContent>
                  {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-lg" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Start Time</Label>
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="rounded-lg" />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">End Time</Label>
                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="rounded-lg" />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <p className="font-medium">Will assign {selectedEmployees.length} employees to this shift</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("select")}>Back</Button>
              <Button onClick={handleSave} disabled={!site || !date} className="flex-1 bg-[#1a2b4a]">
                Assign Now
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}