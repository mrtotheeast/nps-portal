import React, { useState, useEffect } from "react";
import { X, Search, Briefcase, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ScheduleFiltersPanel({ open, onClose, positions = [], sites = [], employees = [], selectedPositions = [], selectedSites = [], selectedEmployees = [], onPositionsChange, onSitesChange, onEmployeesChange }) {
  const [localPositions, setLocalPositions] = useState(selectedPositions);
  const [localSites, setLocalSites] = useState(selectedSites);
  const [localEmployees, setLocalEmployees] = useState(selectedEmployees);
  const [empSearch, setEmpSearch] = useState("");

  useEffect(() => { if (open) { setLocalPositions(selectedPositions); setLocalSites(selectedSites); setLocalEmployees(selectedEmployees); } }, [open]);

  const handleApply = () => { onPositionsChange(localPositions); onSitesChange(localSites); onEmployeesChange(localEmployees); onClose(); };
  const handleReset = () => { setLocalPositions([]); setLocalSites([]); setLocalEmployees([]); };
  const togglePos = (id) => setLocalPositions(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleSite = (id) => setLocalSites(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleEmp = (id) => setLocalEmployees(e => e.includes(id) ? e.filter(x => x !== id) : [...e, id]);

  const filteredEmps = empSearch.trim() ? employees.filter(e => `${e.firstName} ${e.lastName}`.toLowerCase().includes(empSearch.toLowerCase())) : employees;
  const totalActive = localPositions.length + localSites.length + localEmployees.length;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-slate-300 rounded-full" /></div>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div><h2 className="font-semibold text-slate-900">Filters</h2>{totalActive > 0 && <p className="text-xs text-amber-600">{totalActive} active filter{totalActive !== 1 ? "s" : ""}</p>}</div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-slate-500">Clear All</Button>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2"><Briefcase className="w-4 h-4 text-slate-500" /><h3 className="text-sm font-semibold text-slate-700">Positions</h3></div>
            <div className="flex flex-wrap gap-2">
              {positions.map(pos => <button key={pos.id} onClick={() => togglePos(pos.id)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${localPositions.includes(pos.id) ? "bg-[#c9a227] text-[#1a2b4a] border-[#c9a227]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>{pos.name}</button>)}
              {positions.length === 0 && <p className="text-xs text-slate-400">No positions</p>}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2"><MapPin className="w-4 h-4 text-slate-500" /><h3 className="text-sm font-semibold text-slate-700">Sites</h3></div>
            <div className="flex flex-wrap gap-2">
              {sites.map(site => <button key={site.id} onClick={() => toggleSite(site.id)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${localSites.includes(site.id) ? "bg-[#1a2b4a] text-white border-[#1a2b4a]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>{site.name}</button>)}
              {sites.length === 0 && <p className="text-xs text-slate-400">No sites</p>}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-slate-500" /><h3 className="text-sm font-semibold text-slate-700">Employees</h3>
              {localEmployees.length > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{localEmployees.length} selected</span>}
            </div>
            <div className="relative mb-2"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" /><Input value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder="Search employees..." className="pl-8 h-9 text-sm" /></div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredEmps.map(emp => {
                const selected = localEmployees.includes(emp.id);
                return <button key={emp.id} onClick={() => toggleEmp(emp.id)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${selected ? "bg-[#c9a227]/15 border border-[#c9a227]/40 text-[#1a2b4a] font-medium" : "hover:bg-slate-50 text-slate-700"}`}><span className="flex-1">{emp.firstName} {emp.lastName}</span>{selected && <span className="text-[#c9a227]">✓</span>}</button>;
              })}
            </div>
          </div>
        </div>
        <div className="p-4 border-t bg-white">
          <Button onClick={handleApply} className="w-full bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold">Apply Filters {totalActive > 0 ? `(${totalActive})` : ""}</Button>
        </div>
      </div>
    </div>
  );
}