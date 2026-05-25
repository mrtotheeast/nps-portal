import React, { useState } from "react";
import { Plus, X, Building2, User, Phone, Mail, MapPin, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const EMPTY_CONTACT = { full_name: "", title: "", phone: "", email: "" };

const EMPTY_FORM = {
  name: "",
  primary_contact: { full_name: "", title: "", phone: "", email: "" },
  additional_contacts: [],
  billing_address: { street: "", city: "", state: "", zip: "" },
  contract_start_date: "",
  contract_end_date: "",
  service_type: "",
  status: "active",
  notes: "",
};

export function getEmptyClientForm() { return JSON.parse(JSON.stringify(EMPTY_FORM)); }

export function clientToFormData(client) {
  return {
    name: client.name || "",
    primary_contact: client.primary_contact || {
      full_name: client.contact_name || "",
      title: "",
      phone: client.contact_phone || "",
      email: client.contact_email || "",
    },
    additional_contacts: client.additional_contacts || [],
    billing_address: client.billing_address || { street: "", city: "", state: "", zip: "" },
    contract_start_date: client.contract_start_date || "",
    contract_end_date: client.contract_end_date || "",
    service_type: client.service_type || "",
    status: client.status || "active",
    notes: client.notes || "",
  };
}

export default function ClientForm({ formData, onChange, errors = {} }) {
  const set = (field, value) => onChange({ ...formData, [field]: value });
  const setNested = (parent, field, value) => onChange({ ...formData, [parent]: { ...formData[parent], [field]: value } });

  const addContact = () => onChange({ ...formData, additional_contacts: [...(formData.additional_contacts || []), { ...EMPTY_CONTACT }] });
  const removeContact = (i) => onChange({ ...formData, additional_contacts: formData.additional_contacts.filter((_, idx) => idx !== i) });
  const updateContact = (i, field, value) => {
    const updated = [...formData.additional_contacts];
    updated[i] = { ...updated[i], [field]: value };
    onChange({ ...formData, additional_contacts: updated });
  };

  return (
    <div className="space-y-6">
      {/* Company */}
      <div>
        <Label className="flex items-center gap-1.5 mb-1.5"><Building2 className="w-4 h-4" /> Company / Organization Name <span className="text-red-500">*</span></Label>
        <Input value={formData.name} onChange={e => set("name", e.target.value)} placeholder="Acme Corporation" className={errors.name ? "border-red-500" : ""} />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      {/* Primary Contact */}
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><User className="w-4 h-4" /> Primary Contact</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Full Name <span className="text-red-500">*</span></Label>
            <Input value={formData.primary_contact?.full_name || ""} onChange={e => setNested("primary_contact", "full_name", e.target.value)} placeholder="John Smith" />
          </div>
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={formData.primary_contact?.title || ""} onChange={e => setNested("primary_contact", "title", e.target.value)} placeholder="Director of Operations" />
          </div>
          <div>
            <Label className="text-xs">Phone <span className="text-red-500">*</span></Label>
            <Input value={formData.primary_contact?.phone || ""} onChange={e => setNested("primary_contact", "phone", e.target.value)} placeholder="(555) 123-4567" />
          </div>
          <div>
            <Label className="text-xs">Email <span className="text-red-500">*</span></Label>
            <Input type="email" value={formData.primary_contact?.email || ""} onChange={e => setNested("primary_contact", "email", e.target.value)} placeholder="john@acme.com" />
          </div>
        </div>
      </div>

      {/* Additional Contacts */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2"><User className="w-4 h-4" /> Additional Contacts</h3>
          <Button type="button" variant="outline" size="sm" onClick={addContact} className="gap-1 text-xs">
            <Plus className="w-3 h-3" /> Add Contact
          </Button>
        </div>
        {(formData.additional_contacts || []).map((contact, i) => (
          <div key={i} className="grid grid-cols-2 gap-3 pt-3 border-t relative">
            <button type="button" onClick={() => removeContact(i)} className="absolute top-3 right-0 text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
            <div>
              <Label className="text-xs">Full Name</Label>
              <Input value={contact.full_name} onChange={e => updateContact(i, "full_name", e.target.value)} placeholder="Jane Doe" />
            </div>
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={contact.title} onChange={e => updateContact(i, "title", e.target.value)} placeholder="VP of Security" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={contact.phone} onChange={e => updateContact(i, "phone", e.target.value)} placeholder="(555) 987-6543" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={contact.email} onChange={e => updateContact(i, "email", e.target.value)} placeholder="jane@acme.com" />
            </div>
          </div>
        ))}
        {(formData.additional_contacts || []).length === 0 && (
          <p className="text-xs text-slate-400 text-center py-2">No additional contacts. Click "+ Add Contact" to add one.</p>
        )}
      </div>

      {/* Billing Address */}
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><MapPin className="w-4 h-4" /> Billing Address</h3>
        <div>
          <Label className="text-xs">Street</Label>
          <Input value={formData.billing_address?.street || ""} onChange={e => setNested("billing_address", "street", e.target.value)} placeholder="123 Business Ave" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <Label className="text-xs">City</Label>
            <Input value={formData.billing_address?.city || ""} onChange={e => setNested("billing_address", "city", e.target.value)} placeholder="Atlanta" />
          </div>
          <div>
            <Label className="text-xs">State</Label>
            <Input value={formData.billing_address?.state || ""} onChange={e => setNested("billing_address", "state", e.target.value)} placeholder="GA" maxLength={2} />
          </div>
          <div>
            <Label className="text-xs">ZIP</Label>
            <Input value={formData.billing_address?.zip || ""} onChange={e => setNested("billing_address", "zip", e.target.value)} placeholder="30301" />
          </div>
        </div>
      </div>

      {/* Contract & Service */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="flex items-center gap-1.5 mb-1.5 text-sm"><Calendar className="w-4 h-4" /> Contract Start</Label>
          <Input type="date" value={formData.contract_start_date || ""} onChange={e => set("contract_start_date", e.target.value)} />
        </div>
        <div>
          <Label className="flex items-center gap-1.5 mb-1.5 text-sm"><Calendar className="w-4 h-4" /> Contract End</Label>
          <Input type="date" value={formData.contract_end_date || ""} onChange={e => set("contract_end_date", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="mb-1.5 block text-sm">Service Type</Label>
          <Select value={formData.service_type || ""} onValueChange={v => set("service_type", v)}>
            <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="armed">Armed</SelectItem>
              <SelectItem value="unarmed">Unarmed</SelectItem>
              <SelectItem value="both">Both</SelectItem>
              <SelectItem value="spo">SPO</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="patrol">Patrol</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">Status</Label>
          <Select value={formData.status || "active"} onValueChange={v => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label className="flex items-center gap-1.5 mb-1.5 text-sm"><FileText className="w-4 h-4" /> Notes</Label>
        <Textarea value={formData.notes || ""} onChange={e => set("notes", e.target.value)} placeholder="General notes about this client..." rows={3} />
      </div>
    </div>
  );
}