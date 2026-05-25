import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

const EMPTY = { name: "", address: "", city: "", state: "", zip: "", site_type: "", notes: "", latitude: "", longitude: "", status: "active" };

export default function SiteFormInline({ onSave, onCancel, saving }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [geocoding, setGeocoding] = useState(false);

  const set = (field, val) => {
    setForm(p => ({ ...p, [field]: val }));
    if (errors[field]) setErrors(p => { const n = { ...p }; delete n[field]; return n; });
  };

  const geocodeAddress = async () => {
    const addr = [form.address, form.city, form.state, form.zip].filter(Boolean).join(", ");
    if (!addr) return;
    setGeocoding(true);
    try {
      const resp = await base44.functions.invoke("geocodeSiteAddress", { address: addr });
      if (resp?.data?.lat && resp?.data?.lng) {
        setForm(p => ({ ...p, latitude: resp.data.lat, longitude: resp.data.lng }));
        toast.success("GPS coordinates auto-populated");
      }
    } catch {
      // silent - manual entry still works
    } finally {
      setGeocoding(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.name?.trim()) errs.name = "Required";
    if (!form.address?.trim()) errs.address = "Required";
    if (!form.city?.trim()) errs.city = "Required";
    if (!form.state?.trim()) errs.state = "Required";
    if (!form.zip?.trim()) errs.zip = "Required";
    return errs;
  };

  const handleSave = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave(form);
  };

  return (
    <div className="space-y-4 py-2">
      <div>
        <Label>Site Name <span className="text-red-500">*</span></Label>
        <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Main Campus Building A" className={errors.name ? "border-red-500" : ""} />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      <div>
        <Label>Street Address <span className="text-red-500">*</span></Label>
        <Input value={form.address} onChange={e => set("address", e.target.value)} onBlur={geocodeAddress} placeholder="123 Main St" className={errors.address ? "border-red-500" : ""} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>City <span className="text-red-500">*</span></Label>
          <Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Atlanta" className={errors.city ? "border-red-500" : ""} />
        </div>
        <div>
          <Label>State <span className="text-red-500">*</span></Label>
          <Input value={form.state} onChange={e => set("state", e.target.value)} placeholder="GA" maxLength={2} className={errors.state ? "border-red-500" : ""} />
        </div>
        <div>
          <Label>ZIP <span className="text-red-500">*</span></Label>
          <Input value={form.zip} onChange={e => set("zip", e.target.value)} placeholder="30301" className={errors.zip ? "border-red-500" : ""} />
        </div>
      </div>

      {/* GPS */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Latitude</Label>
          <div className="flex gap-2">
            <Input value={form.latitude} onChange={e => set("latitude", e.target.value)} placeholder="Auto-populated" />
            {geocoding && <Loader2 className="w-4 h-4 animate-spin self-center text-slate-400" />}
          </div>
        </div>
        <div>
          <Label>Longitude</Label>
          <Input value={form.longitude} onChange={e => set("longitude", e.target.value)} placeholder="Auto-populated" />
        </div>
      </div>
      <p className="text-xs text-slate-400">GPS coordinates auto-populate when you enter the address (editable)</p>

      <div>
        <Label>Site Type</Label>
        <Select value={form.site_type} onValueChange={v => set("site_type", v)}>
          <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="residential">Residential</SelectItem>
            <SelectItem value="government">Government</SelectItem>
            <SelectItem value="event">Event</SelectItem>
            <SelectItem value="school">School</SelectItem>
            <SelectItem value="healthcare">Healthcare</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Site Notes</Label>
        <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Special instructions, access notes, etc." rows={3} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Site"}
        </Button>
      </div>
    </div>
  );
}