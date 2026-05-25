import React, { useState, useMemo } from "react";
import { Plus, Briefcase, Users, MapPin, Search, X, ChevronDown, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SchedulingSidebar({ positions = [], employees = [], sites = [], selectedPositions = [], selectedSites = [], selectedEmployees = [], onPositionsChange, onSitesChange, onEmployeesChange, isAdmin = false, onAddPosition }) {
  const [showAddPositionDialog, setShowAddPositionDialog] = useState(false);
  const [newPosition, setNewPosition] = useState({ name: "", description: "", category: "other", base_pay_rate: "" });
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [collapsedPositions, setCollapsedPositions] = useState({});

  const groupedByPosition = useMemo(() => {
    const groups = {};
    employees.forEach(emp => { const posId = emp.positionId || "__none__"; if (!groups[posId]) groups[posId] = []; groups[posId].push(emp); });
    return groups;
  }, [employees]);

  const getPositionName = (posId) => posId === "__none__" ? "Unassigned" : positions.find(p => p.id === posId)?.name || "Other";
  const getInitials = (first, last) => `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase();

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const q = employeeSearch.toLowerCase();
    return employees.filter(e => `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q));
  }, [employees, employeeSearch]);

  const groupedFiltered = useMemo(() => {
    const groups = {};
    filteredEmployees.forEach(emp => { const posId = emp.positionId || "__none__"; if (!groups[posId]) groups[posId] = []; groups[posId].push(emp); });
    return groups;
  }, [filteredEmployees]);

  const toggleEmployee = (id) => onEmployeesChange(selectedEmployees.includes(id) ? selectedEmployees.filter(x => x !== id) : [...selectedEmployees, id]);
  const togglePositionGroup = (posId) => {
    const empIds = (groupedByPosition[posId] || []).map(e => e.id);
    const allSelected = empIds.every(id => selectedEmployees.includes(id));
    onEmployeesChange(allSelected ? selectedEmployees.filter(id => !empIds.includes(id)) : [...new Set([...selectedEmployees, ...empIds])]);
  };
  const togglePositionFilter = (posId) => onPositionsChange(selectedPositions.includes(posId) ? selectedPositions.filter(p => p !== posId) : [...selectedPositions, posId]);
  const toggleSite = (siteId) => onSitesChange(selectedSites.includes(siteId) ? selectedSites.filter(s => s !== siteId) : [...selectedSites, siteId]);
  const toggleCollapse = (posId) => setCollapsedPositions(prev => ({ ...prev, [posId]: !prev[posId] }));

  const handleAddPosition = () => {
    if (newPosition.name.trim()) { onAddPosition(newPosition); setNewPosition({ name: "", description: "", category: "other", base_pay_rate: "" }); setShowAddPositionDialog(false); }
  };

  const positionGroupKeys = Object.keys(groupedFiltered).sort((a, b) => getPositionName(a).localeCompare(getPositionName(b)));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-1">
        {/* Positions */}
        <div className="border-b">
          <div className="px-4 py-3 sticky top-0 bg-white z-10 flex items-center justify-between">
            <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-slate-600" /><h3 className="font-semibold text-sm text-slate-900">Positions</h3></div>
            {isAdmin && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAddPositionDialog(true)}><Plus className="w-4 h-4" /></Button>}
          </div>
          <div className="px-4 pb-3 space-y-1">
            {positions.map(pos => {
              const isSelected = selectedPositions.includes(pos.id);
              return <button key={pos.id} onClick={() => togglePositionFilter(pos.id)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left ${isSelected ? "bg-[#c9a227] text-[#1a2b4a] font-semibold" : "hover:bg-slate-50 text-slate-700"}`}><span>{pos.name}</span><span className={`text-xs px-1.5 py-0.5 rounded-full ${isSelected ? "bg-[#1a2b4a]/20" : "bg-slate-100 text-slate-500"}`}>{(groupedByPosition[pos.id] || []).length}</span></button>;
            })}
            {positions.length === 0 && <p className="text-xs text-slate-400 px-2 py-1">No positions yet</p>}
          </div>
        </div>

        {/* Sites */}
        <div className="border-b">
          <div className="px-4 py-3 sticky top-0 bg-white z-10 flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-600" /><h3 className="font-semibold text-sm text-slate-900">Sites</h3></div>
          <div className="px-4 pb-3 space-y-1">
            {sites.map(site => <button key={site.id} onClick={() => toggleSite(site.id)} className={`w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors text-left ${selectedSites.includes(site.id) ? "bg-[#1a2b4a] text-white font-semibold" : "hover:bg-slate-50 text-slate-700"}`}>{site.name}</button>)}
            {sites.length === 0 && <p className="text-xs text-slate-400 px-2 py-1">No sites</p>}
          </div>
        </div>

        {/* Employees */}
        <div>
          <div className="px-4 py-3 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-slate-600" /><h3 className="font-semibold text-sm text-slate-900">Employees</h3>
              {selectedEmployees.length > 0 && <span className="text-xs bg-[#c9a227] text-[#1a2b4a] font-bold px-1.5 py-0.5 rounded-full ml-auto">{selectedEmployees.length}</span>}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} placeholder="Search employees..." className="pl-8 h-8 text-sm" />
              {employeeSearch && <button onClick={() => setEmployeeSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>}
            </div>
          </div>
          <div className="px-4 pb-4 space-y-3">
            {positionGroupKeys.map(posId => {
              const groupEmps = groupedFiltered[posId] || [];
              const posName = getPositionName(posId);
              const allSelected = groupEmps.length > 0 && groupEmps.every(e => selectedEmployees.includes(e.id));
              const someSelected = groupEmps.some(e => selectedEmployees.includes(e.id));
              const isCollapsed = collapsedPositions[posId];
              return (
                <div key={posId}>
                  <div className="flex items-center gap-2 mb-1">
                    <button onClick={() => toggleCollapse(posId)} className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 flex-1 text-left">
                      {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}{posName} ({groupEmps.length})
                    </button>
                    <button onClick={() => togglePositionGroup(posId)} className={`text-xs px-2 py-0.5 rounded transition-colors ${allSelected ? "bg-[#c9a227] text-[#1a2b4a] font-semibold" : someSelected ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{allSelected ? "All ✓" : "All"}</button>
                  </div>
                  {!isCollapsed && (
                    <div className="space-y-0.5 ml-4">
                      {groupEmps.map(emp => {
                        const isEmpSelected = selectedEmployees.includes(emp.id);
                        return (
                          <button key={emp.id} onClick={() => toggleEmployee(emp.id)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left ${isEmpSelected ? "bg-[#c9a227]/15 border border-[#c9a227]/40 text-[#1a2b4a] font-medium" : "hover:bg-slate-50 text-slate-700"}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${isEmpSelected ? "bg-[#c9a227] text-[#1a2b4a]" : "bg-amber-100 text-amber-700"}`}>{getInitials(emp.firstName, emp.lastName)}</div>
                            <span className="truncate">{emp.firstName} {emp.lastName}</span>
                            {isEmpSelected && <span className="ml-auto text-[#c9a227]">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredEmployees.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No employees found</p>}
          </div>
        </div>
      </ScrollArea>

      <Dialog open={showAddPositionDialog} onOpenChange={setShowAddPositionDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Position</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Position Name*</Label><Input value={newPosition.name} onChange={e => setNewPosition({ ...newPosition, name: e.target.value })} placeholder="e.g., Armed Officer MD" /></div>
            <div><Label>Category</Label><Select value={newPosition.category} onValueChange={val => setNewPosition({ ...newPosition, category: val })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="armed">Armed</SelectItem><SelectItem value="unarmed">Unarmed</SelectItem><SelectItem value="supervisor">Supervisor</SelectItem><SelectItem value="management">Management</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
            <div><Label>Description</Label><Textarea value={newPosition.description} onChange={e => setNewPosition({ ...newPosition, description: e.target.value })} rows={2} /></div>
            <div><Label>Base Hourly Rate</Label><Input type="number" step="0.01" value={newPosition.base_pay_rate} onChange={e => setNewPosition({ ...newPosition, base_pay_rate: e.target.value })} placeholder="15.00" /></div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddPositionDialog(false)}>Cancel</Button>
              <Button onClick={handleAddPosition} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]">Add Position</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}