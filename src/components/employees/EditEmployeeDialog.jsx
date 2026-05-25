import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const DEFAULT_FORM = { firstName: "", lastName: "", email: "", phoneNumber: "", position: "", role: "employee", employeeId: "", paychexWorkerId: "", baseHourlyRate: "", maxHours: "40", isActive: true, send_invite: false };

export default function EditEmployeeDialog({ open, employee, onClose, onSave, saving, positions }) {
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  useEffect(() => {
    if (employee) {
      setFormData({
        firstName: employee.firstName || "", lastName: employee.lastName || "",
        email: employee.email || "", phoneNumber: employee.phoneNumber || "",
        position: employee.position || "", role: employee.role || "employee",
        employeeId: employee.employeeId || "", paychexWorkerId: employee.paychexWorkerId || "",
        baseHourlyRate: employee.baseHourlyRate || "", maxHours: employee.maxHours || "40",
        isActive: employee.isActive !== undefined ? employee.isActive : true, send_invite: false
      });
    }
  }, [employee, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setFormData(DEFAULT_FORM);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Employee</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>First Name</Label><Input value={formData.firstName} onChange={e => set("firstName", e.target.value)} required /></div>
            <div><Label>Last Name</Label><Input value={formData.lastName} onChange={e => set("lastName", e.target.value)} required /></div>
          </div>
          <div><Label>Email</Label><Input type="email" value={formData.email} onChange={e => set("email", e.target.value)} /></div>
          <div><Label>Phone Number</Label><Input value={formData.phoneNumber} onChange={e => set("phoneNumber", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Position</Label>
              <Select value={formData.position} onValueChange={val => set("position", val)}>
                <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                <SelectContent>{positions.filter(p => p.status === 'active').map(pos => <SelectItem key={pos.id} value={pos.name}>{pos.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={val => set("role", val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="officer">Officer</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Employee ID</Label><Input value={formData.employeeId} onChange={e => set("employeeId", e.target.value)} /></div>
            <div><Label>Paychex Worker ID</Label><Input value={formData.paychexWorkerId} onChange={e => set("paychexWorkerId", e.target.value)} placeholder="For payroll" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Hourly Rate ($)</Label><Input type="number" step="0.01" value={formData.baseHourlyRate} onChange={e => set("baseHourlyRate", e.target.value)} /></div>
            <div><Label>Max Hours/Week</Label><Input type="number" value={formData.maxHours} onChange={e => set("maxHours", e.target.value)} /></div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={formData.isActive} onChange={e => set("isActive", e.target.checked)} className="rounded" id="isActive" />
            <label htmlFor="isActive" className="text-sm cursor-pointer">Active</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="send_invite" checked={formData.send_invite} onCheckedChange={checked => set("send_invite", checked)} />
            <Label htmlFor="send_invite" className="cursor-pointer">Send invite email to user</Label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}