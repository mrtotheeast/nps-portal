import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Upload, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function MultiStepAddEmployeeDialog({ isOpen, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    employmentType: null,
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    emergencyName: "",
    emergencyPhone: "",
    emergencyEmail: "",
    emergencyRelation: "",
    credentials: [],
    sites: [],
    schedule: "",
    role: "",
    positionTitle: "",
    baseRate: "",
    overtimeRate: "",
    maxHours: "40",
    startDate: "",
  });

  const { data: sites = [] } = useQuery({ queryKey: ["sites"], queryFn: () => base44.entities.Site.list() });
  const { data: appSettings = {} } = useQuery({ queryKey: ["appSettings"], queryFn: () => base44.entities.AppSettings.list() });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const startDate = new Date(data.startDate);
      const probationEndDate = new Date(startDate);
      probationEndDate.setDate(probationEndDate.getDate() + 90);
      const probationDateStr = probationEndDate.toISOString().split('T')[0];

      const employee = await base44.entities.Employee.create({
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: data.phone,
        dateOfBirth: data.dateOfBirth,
        address: {
          street: data.street,
          city: data.city,
          state: data.state,
          zip: data.zip,
        },
        employmentClassification: data.employmentType,
        siteIds: data.sites,
        role: data.role,
        positionTitle: data.positionTitle,
        baseHourlyRate: parseFloat(data.baseRate),
        maxHours: parseInt(data.maxHours) || 40,
        hireDate: data.startDate,
        probationEndDate: probationDateStr,
        ptoBalance: 0,
        status: "active",
        invitation_status: "invited",
        invitation_sent_at: new Date().toISOString(),
        emergencyContactName: data.emergencyName,
        emergencyContactPhone: data.emergencyPhone,
        emergencyContactEmail: data.emergencyEmail,
        emergencyContactRelation: data.emergencyRelation,
      });

      // Add credentials
      for (const cred of data.credentials) {
        if (cred.name && cred.expiry) {
          await base44.entities.Credential.create({
            employee_id: employee.id,
            credential_type: cred.name,
            credential_name: cred.name,
            expiry_date: cred.expiry,
            status: "active",
          });
        }
      }

      // Send invitation email
      await base44.functions.invoke("sendInvitationEmail", {
        employee_id: employee.id,
        email: data.email,
        firstName: data.firstName,
      });

      return employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee invited successfully");
      onSuccess?.();
      onClose();
    },
    onError: (err) => toast.error("Failed to invite employee: " + err.message),
  });

  const handleNext = () => {
    if (step === 1 && !formData.employmentType) {
      toast.error("Please select employment type");
      return;
    }
    if (step === 2) {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
        toast.error("Fill all required fields");
        return;
      }
    }
    if (step === 3) {
      if (!formData.emergencyName || !formData.emergencyPhone || !formData.emergencyRelation) {
        toast.error("Fill all required emergency contact fields");
        return;
      }
    }
    if (step === 5) {
      if (!formData.startDate || !formData.role || !formData.baseRate) {
        toast.error("Fill all required assignment fields");
        return;
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handleCredentialAdd = () => {
    setFormData({
      ...formData,
      credentials: [...formData.credentials, { name: "", expiry: "" }],
    });
  };

  const handleCredentialRemove = (idx) => {
    setFormData({
      ...formData,
      credentials: formData.credentials.filter((_, i) => i !== idx),
    });
  };

  const handleCredentialChange = (idx, field, value) => {
    const updated = [...formData.credentials];
    updated[idx][field] = value;
    setFormData({ ...formData, credentials: updated });
  };

  const handleSiteToggle = (siteId) => {
    const updated = formData.sites.includes(siteId)
      ? formData.sites.filter((id) => id !== siteId)
      : [...formData.sites, siteId];
    setFormData({ ...formData, sites: updated });
  };

  const handleSubmit = () => {
    if (!formData.sites.length) {
      toast.error("Assign at least one site");
      return;
    }
    createMutation.mutate(formData);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Employee - Step {step} of 6</DialogTitle>
        </DialogHeader>

        {/* Step 1: Employment Type */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-slate-600 mb-6">Select employment classification:</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setFormData({ ...formData, employmentType: "W2" })}
                className={`p-6 rounded-lg border-2 font-semibold transition-all ${
                  formData.employmentType === "W2"
                    ? "border-[#c9a227] bg-amber-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                W-2 Employee
              </button>
              <button
                onClick={() => setFormData({ ...formData, employmentType: "1099" })}
                className={`p-6 rounded-lg border-2 font-semibold transition-all ${
                  formData.employmentType === "1099"
                    ? "border-[#c9a227] bg-amber-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                1099 Contractor
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Personal Information */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="First Name *" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
              <Input placeholder="Middle Name" value={formData.middleName} onChange={(e) => setFormData({ ...formData, middleName: e.target.value })} />
            </div>
            <Input placeholder="Last Name *" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
            <Input type="date" placeholder="Date of Birth *" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
            <Input placeholder="Email *" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            <Input placeholder="Phone Number *" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            <Input placeholder="Street Address *" value={formData.street} onChange={(e) => setFormData({ ...formData, street: e.target.value })} />
            <div className="grid grid-cols-3 gap-3">
              <Input placeholder="City *" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
              <Input placeholder="State *" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
              <Input placeholder="ZIP *" value={formData.zip} onChange={(e) => setFormData({ ...formData, zip: e.target.value })} />
            </div>
          </div>
        )}

        {/* Step 3: Emergency Contact */}
        {step === 3 && (
          <div className="space-y-4">
            <Input placeholder="Full Name *" value={formData.emergencyName} onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })} />
            <Input placeholder="Phone Number *" value={formData.emergencyPhone} onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })} />
            <Input placeholder="Email" value={formData.emergencyEmail} onChange={(e) => setFormData({ ...formData, emergencyEmail: e.target.value })} />
            <Select value={formData.emergencyRelation} onValueChange={(v) => setFormData({ ...formData, emergencyRelation: v })}>
              <SelectTrigger><SelectValue placeholder="Relationship *" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="spouse">Spouse</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="sibling">Sibling</SelectItem>
                <SelectItem value="child">Child</SelectItem>
                <SelectItem value="friend">Friend</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Step 4: Credentials */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 mb-3">Upload credential documents (optional)</p>
            {formData.credentials.map((cred, idx) => (
              <Card key={idx}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex gap-2">
                    <Input placeholder="Credential Name (e.g., Guard Card)" value={cred.name} onChange={(e) => handleCredentialChange(idx, 'name', e.target.value)} className="flex-1" />
                    <Button variant="ghost" size="icon" onClick={() => handleCredentialRemove(idx)} className="text-red-500">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input type="date" placeholder="Expiration Date" value={cred.expiry} onChange={(e) => handleCredentialChange(idx, 'expiry', e.target.value)} />
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" onClick={handleCredentialAdd} className="w-full gap-2">
              <Plus className="w-4 h-4" /> Add Credential
            </Button>
          </div>
        )}

        {/* Step 5: Assignment */}
        {step === 5 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Sites *</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {sites.map((site) => (
                  <label key={site.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded">
                    <input
                      type="checkbox"
                      checked={formData.sites.includes(site.id)}
                      onChange={() => handleSiteToggle(site.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{site.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
              <SelectTrigger><SelectValue placeholder="Role *" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="officer">Officer</SelectItem>
                <SelectItem value="unarmed_officer">Unarmed Officer</SelectItem>
                <SelectItem value="armed_officer">Armed Officer</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Position Title" value={formData.positionTitle} onChange={(e) => setFormData({ ...formData, positionTitle: e.target.value })} />
            <Input type="number" placeholder="Base Hourly Rate *" step="0.01" value={formData.baseRate} onChange={(e) => {
              const rate = parseFloat(e.target.value);
              setFormData({ ...formData, baseRate: e.target.value, overtimeRate: (rate * 1.5).toFixed(2) });
            }} />
            <Input type="number" placeholder="Overtime Rate" step="0.01" value={formData.overtimeRate} onChange={(e) => setFormData({ ...formData, overtimeRate: e.target.value })} />
            <Input type="number" placeholder="Max Hours Per Week" value={formData.maxHours} onChange={(e) => setFormData({ ...formData, maxHours: e.target.value })} />
            <Input type="date" placeholder="Start Date *" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
          </div>
        )}

        {/* Step 6: Review */}
        {step === 6 && (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <Card>
              <CardContent className="p-4 space-y-3 text-sm">
                <div><span className="font-medium">Type:</span> {formData.employmentType}</div>
                <div><span className="font-medium">Name:</span> {formData.firstName} {formData.middleName} {formData.lastName}</div>
                <div><span className="font-medium">Email:</span> {formData.email}</div>
                <div><span className="font-medium">Phone:</span> {formData.phone}</div>
                <div><span className="font-medium">Address:</span> {formData.street}, {formData.city}, {formData.state} {formData.zip}</div>
                <div><span className="font-medium">Emergency Contact:</span> {formData.emergencyName} ({formData.emergencyRelation})</div>
                <div><span className="font-medium">Sites:</span> {formData.sites.length > 0 ? sites.filter(s => formData.sites.includes(s.id)).map(s => s.name).join(", ") : "None"}</div>
                <div><span className="font-medium">Role:</span> {formData.role}</div>
                <div><span className="font-medium">Base Rate:</span> ${parseFloat(formData.baseRate).toFixed(2)}/hr</div>
                <div><span className="font-medium">Start Date:</span> {formData.startDate}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex gap-2 mt-6 pt-4 border-t">
          {step > 1 && <Button variant="outline" onClick={handleBack} className="gap-2"><ChevronLeft className="w-4 h-4" /> Back</Button>}
          {step < 6 && <Button onClick={handleNext} className="flex-1 bg-[#1a2b4a]">Next</Button>}
          {step === 6 && (
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="flex-1 bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold gap-2">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Send Invitation
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}