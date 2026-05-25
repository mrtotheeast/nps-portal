import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const DEFAULT_FORM = { first_name: "", last_name: "", email: "", phone: "", role_type: "officer", employee_id: "", base_hourly_rate: "", max_hours: "40", send_invite: true };

export default function AddEmployeeDialog({ open, onClose, onSave, saving }) {
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
  const handleClose = () => { setFormData(DEFAULT_FORM); onClose(); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add New Employee</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>First Name *</Label><Input value={formData.first_name} onChange={e => set("first_name", e.target.value)} required /></div>
            <div><Label>Last Name *</Label><Input value={formData.last_name} onChange={e => set("last_name", e.target.value)} required /></div>
          </div>
          <div><Label>Email *</Label><Input type="email" value={formData.email} onChange={e => set("email", e.target.value)} required /></div>
          <div><Label>Phone</Label><Input type="tel" value={formData.phone} onChange={e => set("phone", e.target.value)} /></div>
          <div>
            <Label>Role *</Label>
            <Select value={formData.role_type} onValueChange={val => set("role_type", val)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="officer">Officer</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Employee ID</Label><Input value={formData.employee_id} onChange={e => set("employee_id", e.target.value)} /></div>
            <div><Label>Base Hourly Rate</Label><Input type="number" step="0.01" value={formData.base_hourly_rate} onChange={e => set("base_hourly_rate", e.target.value)} /></div>
          </div>
          <div><Label>Max Hours/Week</Label><Input type="number" value={formData.max_hours} onChange={e => set("max_hours", e.target.value)} /></div>
          <div className="flex items-center gap-2">
            <Checkbox id="send_invite" checked={formData.send_invite} onCheckedChange={checked => set("send_invite", checked)} />
            <Label htmlFor="send_invite" className="cursor-pointer">Send invite email to user</Label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Employee"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}