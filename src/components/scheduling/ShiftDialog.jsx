import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import BottomSheet from "@/components/mobile/BottomSheet";

const DAYS = [{ value: 0, label: "Sun" }, { value: 1, label: "Mon" }, { value: 2, label: "Tue" }, { value: 3, label: "Wed" }, { value: 4, label: "Thu" }, { value: 5, label: "Fri" }, { value: 6, label: "Sat" }];

export default function ShiftDialog({ open, onClose, onSave, shift, employees, sites }) {
  const [formData, setFormData] = useState(shift || { employee_id: "", site_id: "", date: "", start_time: "08:00", end_time: "16:00", recurring: false, recurrence_pattern: "weekly", recurrence_days: [], recurrence_end_date: "" });
  const [saving, setSaving] = useState(false);
  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(formData);
    setSaving(false);
    toast.success(shift ? "Shift updated successfully" : "Shift created successfully");
    onClose();
  };

  const getEmpLabel = (id) => { const e = employees.find(e => e.id === id); return e ? `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.email : "Select employee..."; };
  const getSiteLabel = (id) => sites.find(s => s.id === id)?.name || "Select site...";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{shift ? "Edit Shift" : "Create Shift"}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          {/* Employee - Mobile */}
          <div className="md:hidden">
            <Label>Employee *</Label>
            <BottomSheet trigger={<Button variant="outline" className="w-full justify-start min-h-[44px]">{getEmpLabel(formData.employee_id)}</Button>} title="Select Employee" options={employees.map(e => ({ value: e.id, label: `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.email }))} value={formData.employee_id} onSelect={val => set("employee_id", val)} />
          </div>
          {/* Employee - Desktop */}
          <div className="hidden md:block">
            <Label>Employee *</Label>
            <Select value={formData.employee_id} onValueChange={val => set("employee_id", val)}>
              <SelectTrigger><SelectValue placeholder="Select employee..." /></SelectTrigger>
              <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{`${e.firstName || ""} ${e.lastName || ""}`.trim() || e.email}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {/* Site - Mobile */}
          <div className="md:hidden">
            <Label>Site *</Label>
            <BottomSheet trigger={<Button variant="outline" className="w-full justify-start min-h-[44px]">{getSiteLabel(formData.site_id)}</Button>} title="Select Site" options={sites.map(s => ({ value: s.id, label: s.name }))} value={formData.site_id} onSelect={val => set("site_id", val)} />
          </div>
          {/* Site - Desktop */}
          <div className="hidden md:block">
            <Label>Site *</Label>
            <Select value={formData.site_id} onValueChange={val => set("site_id", val)}>
              <SelectTrigger><SelectValue placeholder="Select site..." /></SelectTrigger>
              <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Date *</Label><Input type="date" value={formData.date} onChange={e => set("date", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Start Time</Label><Input type="time" value={formData.start_time} onChange={e => set("start_time", e.target.value)} /></div>
            <div><Label>End Time</Label><Input type="time" value={formData.end_time} onChange={e => set("end_time", e.target.value)} /></div>
          </div>
          <div className="border-t pt-4">
            <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={formData.recurring} onCheckedChange={checked => set("recurring", checked)} /><span className="text-sm font-medium">Recurring Shift</span></label>
          </div>
          {formData.recurring && (
            <>
              <div>
                <Label>Repeat On</Label>
                <div className="flex gap-2 mt-2">
                  {DAYS.map(day => (
                    <button key={day.value} type="button" onClick={() => { const days = formData.recurrence_days || []; set("recurrence_days", days.includes(day.value) ? days.filter(d => d !== day.value) : [...days, day.value]); }}
                      className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${(formData.recurrence_days || []).includes(day.value) ? "bg-[#c9a227] text-[#1a2b4a]" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
              <div><Label>End Date</Label><Input type="date" value={formData.recurrence_end_date} onChange={e => set("recurrence_end_date", e.target.value)} /></div>
            </>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.employee_id || !formData.site_id || !formData.date || saving} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Shift"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}