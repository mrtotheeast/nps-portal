import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import OnboardingDocsSection from "@/components/onboarding/OnboardingDocsSection";
import AddEmployeeBillingConfirm from "@/components/billing/AddEmployeeBillingConfirm";
import PlanUpgradeRequired from "@/components/billing/PlanUpgradeRequired";
import { useCompany } from "@/context/CompanyContext";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export default function NewEmployee() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  const scrollRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [billingConfirmOpen, setBillingConfirmOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'save_invite' | 'save_only'

  const [formData, setFormData] = useState({
    employmentType: "",
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    email: "",
    phoneNumber: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    emergencyContactName: "",
    emergencyContactRelation: "",
    emergencyContactPhone: "",
    emergencyContactEmail: "",
    credentials: [],
    siteIds: [],
    schedule: "",
    role: "officer",
    positionTitle: "",
    baseHourlyRate: "",
    overtimeRate: "",
    maxHours: "40",
    hireDate: "",
    duplicateConfirmed: false,
    assignedDocIds: [],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: company } = useQuery({
    queryKey: ["company-for-billing", companyId],
    queryFn: async () => {
      if (!companyId || companyId === "super_admin") return null;
      const r = await base44.entities.Company.filter({ id: companyId });
      return r[0] || null;
    },
    enabled: !!companyId,
  });

  const planTier = company?.plan_tier || "single";
  const activeCount = employees.filter(e => e.status !== "terminated" && e.status !== "inactive").length;
  const SINGLE_PLAN_MAX = 20;

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: () => base44.entities.Site.list(),
  });

  const [saving, setSaving] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.employmentType) newErrors.employmentType = "Please select an employment type";
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
    if (!formData.email.trim()) newErrors.email = "Email address is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Please enter a valid email address";
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required";
    if (!formData.street.trim()) newErrors.street = "Street address is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.state) newErrors.state = "State is required";
    if (!formData.zip.trim()) newErrors.zip = "ZIP code is required";

    if (!formData.emergencyContactName.trim()) newErrors.emergencyContactName = "Emergency contact name is required";
    if (!formData.emergencyContactRelation) newErrors.emergencyContactRelation = "Relationship is required";
    if (!formData.emergencyContactPhone.trim()) newErrors.emergencyContactPhone = "Emergency contact phone is required";

    if (formData.siteIds.length === 0) newErrors.siteIds = "Please select at least one site";
    if (!formData.role) newErrors.role = "Role is required";
    if (!formData.positionTitle.trim()) newErrors.positionTitle = "Position title is required";
    if (!formData.baseHourlyRate) newErrors.baseHourlyRate = "Base hourly rate is required";
    if (!formData.hireDate) newErrors.hireDate = "Start date is required";

    // Check for duplicate email
    if (employees.some(e => e.email === formData.email)) {
      newErrors.email = "This email address is already registered. Please use a different email.";
    }

    // Check for duplicate name
    const nameDuplicate = employees.some(e => e.firstName === formData.firstName && e.lastName === formData.lastName);
    if (nameDuplicate && !formData.duplicateConfirmed) {
      newErrors.duplicateName = `Warning: An employee named ${formData.firstName} ${formData.lastName} already exists. Check the box below to confirm this is a different person.`;
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setTimeout(() => {
        const firstErrorField = Object.keys(newErrors)[0];
        const element = document.getElementById(`field-${firstErrorField}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.focus();
        }
      }, 100);
    }

    return Object.keys(newErrors).length === 0;
  };

  const doCreateEmployee = async (withInvite) => {
    const probationEnd = addDays(new Date(formData.hireDate), 90);
    const employee = await base44.entities.Employee.create({
      firstName: formData.firstName, middleName: formData.middleName,
      lastName: formData.lastName, dateOfBirth: formData.dateOfBirth,
      email: formData.email, phoneNumber: formData.phoneNumber,
      address: { street: formData.street, city: formData.city, state: formData.state, zip: formData.zip },
      employmentType: formData.employmentType,
      emergencyContactName: formData.emergencyContactName,
      emergencyContactRelation: formData.emergencyContactRelation,
      emergencyContactPhone: formData.emergencyContactPhone,
      emergencyContactEmail: formData.emergencyContactEmail,
      siteIds: formData.siteIds, role: formData.role,
      positionTitle: formData.positionTitle,
      baseHourlyRate: parseFloat(formData.baseHourlyRate),
      maxHours: parseInt(formData.maxHours), hireDate: formData.hireDate,
      probationEndDate: format(probationEnd, "yyyy-MM-dd"),
      status: "active",
      invitation_status: withInvite ? "invited" : "not_invited",
    });
    for (const docId of formData.assignedDocIds || []) {
      await base44.entities.DocumentAcknowledgment.create({ document_id: docId, user_id: employee.id, document_version: 1 }).catch(() => {});
    }
    if (withInvite) {
      await base44.functions.invoke("sendInvitationEmail", {
        employee_id: employee.id, email: employee.email,
        firstName: employee.firstName,
        full_name: `${employee.firstName} ${employee.lastName}`, role: employee.role,
      }).catch(() => {});
    }
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    return employee;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    // Check plan limit
    if (planTier === "single" && activeCount >= SINGLE_PLAN_MAX) {
      setUpgradeOpen(true);
      return;
    }
    setPendingAction("save_invite");
    setBillingConfirmOpen(true);
  };

  const handleSaveWithoutInvite = async () => {
    if (!validateForm()) return;
    if (planTier === "single" && activeCount >= SINGLE_PLAN_MAX) {
      setUpgradeOpen(true);
      return;
    }
    setPendingAction("save_only");
    setBillingConfirmOpen(true);
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === "baseHourlyRate" && value) {
        updated.overtimeRate = (parseFloat(value) * 1.5).toFixed(2);
      }
      return updated;
    });
    if (touched[field]) {
      setTouched(prev => ({ ...prev, [field]: true }));
    }
  };

  const addCredential = () => {
    setFormData(prev => ({
      ...prev,
      credentials: [...prev.credentials, { name: "", expiration: "", document: "" }]
    }));
  };

  const removeCredential = (index) => {
    setFormData(prev => ({
      ...prev,
      credentials: prev.credentials.filter((_, i) => i !== index)
    }));
  };

  const hasNameDuplicate = employees.some(e => e.firstName === formData.firstName && e.lastName === formData.lastName);

  return (
    <div className="min-h-screen bg-slate-50" ref={scrollRef}>
      {billingConfirmOpen && (
        <AddEmployeeBillingConfirm
          currentCount={activeCount}
          plan={planTier}
          billingCycle={company?.billing_cycle || "monthly"}
          employeeName={`${formData.firstName} ${formData.lastName}`.trim()}
          onConfirm={async () => {
            try {
              await doCreateEmployee(pendingAction === "save_invite");
              setBillingConfirmOpen(false);
              toast.success(pendingAction === "save_invite" ? "Employee added and invitation sent" : "Employee saved");
              navigate("/EmployeeDirectory");
            } catch (err) {
              throw err;
            }
          }}
          onCancel={() => setBillingConfirmOpen(false)}
        />
      )}
      {upgradeOpen && (
        <PlanUpgradeRequired
          currentCount={activeCount}
          onUpgraded={() => { setUpgradeOpen(false); queryClient.invalidateQueries(); toast.success("Plan upgraded. You can now add employees."); }}
          onCancel={() => setUpgradeOpen(false)}
        />
      )}
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">New Employee</h1>
              <p className="text-sm text-slate-500">Add to Directory</p>
            </div>
          </div>
          <div className="hidden md:flex gap-2">
            <Button variant="outline" onClick={handleSaveWithoutInvite} disabled={saving}>
              Save Only
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-[#1a2b4a] hover:bg-[#2d4a6f]">
              {saving ? "Saving..." : "Save & Send Invite"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 pb-40 md:pb-8">
        <p className="text-slate-600 mb-8">Fill out the information below and send an invitation to join NPS Portal.</p>

        {/* Employment Classification */}
        <section id="field-employmentType" className="mb-12" tabIndex={-1}>
          <h2 className="text-lg font-semibold mb-4">Employment Type</h2>
          <div className="flex gap-3">
            {["W-2", "1099"].map(type => (
              <Button
                key={type}
                variant={formData.employmentType === type ? "default" : "outline"}
                onClick={() => handleFieldChange("employmentType", type)}
                className={`flex-1 h-12 ${formData.employmentType === type ? "bg-[#1a2b4a]" : ""}`}
              >
                {type} {type === "W-2" ? "Employee" : "Contractor"}
              </Button>
            ))}
          </div>
          {errors.employmentType && <p className="text-red-600 text-sm mt-2 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.employmentType}</p>}
        </section>

        {/* Employee Information */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-4 sticky top-16 bg-slate-50 py-2 z-30">Employee Information</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div id="field-firstName">
              <Label className="block font-semibold mb-2">First Name *</Label>
              <Input
                value={formData.firstName}
                onChange={e => handleFieldChange("firstName", e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, firstName: true }))}
                className={`h-11 ${errors.firstName ? "border-red-500" : ""}`}
              />
              {errors.firstName && <p className="text-red-600 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.firstName}</p>}
            </div>

            <div id="field-middleName">
              <Label className="block font-semibold mb-2">Middle Name (optional)</Label>
              <Input
                value={formData.middleName}
                onChange={e => handleFieldChange("middleName", e.target.value)}
                className="h-11"
              />
            </div>

            <div id="field-lastName">
              <Label className="block font-semibold mb-2">Last Name *</Label>
              <Input
                value={formData.lastName}
                onChange={e => handleFieldChange("lastName", e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, lastName: true }))}
                className={`h-11 ${errors.lastName ? "border-red-500" : ""}`}
              />
              {errors.lastName && <p className="text-red-600 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.lastName}</p>}
            </div>

            {hasNameDuplicate && !formData.duplicateConfirmed && (
              <div className="md:col-span-2 bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <p className="text-amber-900 text-sm mb-3">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  Warning: An employee named {formData.firstName} {formData.lastName} already exists. Check the box below to confirm this is a different person.
                </p>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.duplicateConfirmed}
                    onCheckedChange={checked => handleFieldChange("duplicateConfirmed", checked)}
                  />
                  <label className="text-sm cursor-pointer">I confirm this is a different person</label>
                </div>
              </div>
            )}

            <div id="field-dateOfBirth" className="md:col-span-2">
              <Label className="block font-semibold mb-2">Date of Birth *</Label>
              <Input
                type="date"
                value={formData.dateOfBirth}
                onChange={e => handleFieldChange("dateOfBirth", e.target.value)}
                className={`h-11 ${errors.dateOfBirth ? "border-red-500" : ""}`}
              />
              {errors.dateOfBirth && <p className="text-red-600 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.dateOfBirth}</p>}
            </div>

            <div id="field-email" className="md:col-span-2">
              <Label className="block font-semibold mb-2">Personal Email — this will be used to log in to NPS Portal *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={e => handleFieldChange("email", e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                className={`h-11 ${errors.email ? "border-red-500" : ""}`}
              />
              {errors.email && <p className="text-red-600 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.email}</p>}
            </div>

            <div id="field-phoneNumber" className="md:col-span-2">
              <Label className="block font-semibold mb-2">Cell Phone Number *</Label>
              <Input
                value={formData.phoneNumber}
                onChange={e => handleFieldChange("phoneNumber", e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, phoneNumber: true }))}
                className={`h-11 ${errors.phoneNumber ? "border-red-500" : ""}`}
              />
              {errors.phoneNumber && <p className="text-red-600 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.phoneNumber}</p>}
            </div>

            <div id="field-street" className="md:col-span-2">
              <Label className="block font-semibold mb-2">Street Address *</Label>
              <Input
                value={formData.street}
                onChange={e => handleFieldChange("street", e.target.value)}
                className={`h-11 ${errors.street ? "border-red-500" : ""}`}
              />
              {errors.street && <p className="text-red-600 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.street}</p>}
            </div>

            <div id="field-city">
              <Label className="block font-semibold mb-2">City *</Label>
              <Input
                value={formData.city}
                onChange={e => handleFieldChange("city", e.target.value)}
                className={`h-11 ${errors.city ? "border-red-500" : ""}`}
              />
              {errors.city && <p className="text-red-600 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.city}</p>}
            </div>

            <div id="field-state">
              <Label className="block font-semibold mb-2">State *</Label>
              <Select value={formData.state} onValueChange={v => handleFieldChange("state", v)}>
                <SelectTrigger className={`h-11 ${errors.state ? "border-red-500" : ""}`}>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.state && <p className="text-red-600 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.state}</p>}
            </div>

            <div id="field-zip">
              <Label className="block font-semibold mb-2">ZIP Code *</Label>
              <Input
                value={formData.zip}
                onChange={e => handleFieldChange("zip", e.target.value)}
                className={`h-11 ${errors.zip ? "border-red-500" : ""}`}
              />
              {errors.zip && <p className="text-red-600 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.zip}</p>}
            </div>
          </div>
        </section>

        {/* Emergency Contact */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-2 sticky top-16 bg-slate-50 py-2 z-30">Emergency Contact Information</h2>
          <p className="text-slate-600 text-sm mb-4">Who should we contact in case of an emergency? This person is not added to the system.</p>
          <div className="grid md:grid-cols-2 gap-6">
            <div id="field-emergencyContactName">
              <Label className="block font-semibold mb-2">Emergency Contact Full Name *</Label>
              <Input
                value={formData.emergencyContactName}
                onChange={e => handleFieldChange("emergencyContactName", e.target.value)}
                className={`h-11 ${errors.emergencyContactName ? "border-red-500" : ""}`}
              />
              {errors.emergencyContactName && <p className="text-red-600 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.emergencyContactName}</p>}
            </div>

            <div id="field-emergencyContactRelation">
              <Label className="block font-semibold mb-2">Relationship to Employee *</Label>
              <Select value={formData.emergencyContactRelation} onValueChange={v => handleFieldChange("emergencyContactRelation", v)}>
                <SelectTrigger className={`h-11 ${errors.emergencyContactRelation ? "border-red-500" : ""}`}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {["Spouse", "Parent", "Sibling", "Child", "Friend", "Colleague", "Other"].map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.emergencyContactRelation && <p className="text-red-600 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.emergencyContactRelation}</p>}
            </div>

            <div id="field-emergencyContactPhone">
              <Label className="block font-semibold mb-2">Emergency Contact Phone Number *</Label>
              <Input
                value={formData.emergencyContactPhone}
                onChange={e => handleFieldChange("emergencyContactPhone", e.target.value)}
                className={`h-11 ${errors.emergencyContactPhone ? "border-red-500" : ""}`}
              />
              {errors.emergencyContactPhone && <p className="text-red-600 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.emergencyContactPhone}</p>}
            </div>

            <div id="field-emergencyContactEmail">
              <Label className="block font-semibold mb-2">Emergency Contact Email (optional)</Label>
              <Input
                type="email"
                value={formData.emergencyContactEmail}
                onChange={e => handleFieldChange("emergencyContactEmail", e.target.value)}
                className="h-11"
              />
            </div>
          </div>
        </section>

        {/* Credentials */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-2 sticky top-16 bg-slate-50 py-2 z-30">Credentials and Certifications (Optional)</h2>
          <p className="text-slate-600 text-sm mb-4">Upload any existing credentials for this employee. You can also add these later from their profile.</p>
          <div className="space-y-4">
            {formData.credentials.map((cred, idx) => (
              <Card key={idx} className="p-4">
                <div className="grid md:grid-cols-3 gap-4 items-end">
                  <div>
                    <Label className="block font-semibold mb-2">Credential Name (e.g. Guard Card, CPR Certificate)</Label>
                    <Input
                      value={cred.name}
                      onChange={e => {
                        const updated = [...formData.credentials];
                        updated[idx].name = e.target.value;
                        setFormData(prev => ({ ...prev, credentials: updated }));
                      }}
                      className="h-11"
                      placeholder="e.g. Guard Card"
                    />
                  </div>
                  <div>
                    <Label className="block font-semibold mb-2">Expiration Date (optional)</Label>
                    <Input
                      type="date"
                      value={cred.expiration}
                      onChange={e => {
                        const updated = [...formData.credentials];
                        updated[idx].expiration = e.target.value;
                        setFormData(prev => ({ ...prev, credentials: updated }));
                      }}
                      className="h-11"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCredential(idx)}
                    className="text-red-600 hover:text-red-700 h-11"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
            <Button
              variant="outline"
              onClick={addCredential}
              className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-50"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Another Credential
            </Button>
          </div>
        </section>

        {/* Work Assignment */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-2 sticky top-16 bg-slate-50 py-2 z-30">Work Assignment</h2>
          <p className="text-slate-600 text-sm mb-4">Assign this employee to their site, role, and pay rate.</p>
          <div className="grid md:grid-cols-2 gap-6">
            <div id="field-siteIds" className="md:col-span-2">
              <Label className="block font-semibold mb-2">Assigned Site(s) *</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-slate-50">
                {sites.map(site => (
                  <div key={site.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.siteIds.includes(site.id)}
                      onCheckedChange={checked => {
                        if (checked) {
                          setFormData(prev => ({ ...prev, siteIds: [...prev.siteIds, site.id] }));
                        } else {
                          setFormData(prev => ({ ...prev, siteIds: prev.siteIds.filter(s => s !== site.id) }));
                        }
                      }}
                    />
                    <label className="text-sm cursor-pointer">{site.name}</label>
                  </div>
                ))}
              </div>
              {errors.siteIds && <p className="text-red-600 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.siteIds}</p>}
            </div>

            <div id="field-role">
              <Label className="block font-semibold mb-2">Role *</Label>
              <Select value={formData.role} onValueChange={v => handleFieldChange("role", v)}>
                <SelectTrigger className={`h-11 ${errors.role ? "border-red-500" : ""}`}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="officer">Officer</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && <p className="text-red-600 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.role}</p>}
            </div>

            <div id="field-positionTitle">
              <Label className="block font-semibold mb-2">Position Title (e.g. Security Officer) *</Label>
              <Input
                value={formData.positionTitle}
                onChange={e => handleFieldChange("positionTitle", e.target.value)}
                className={`h-11 ${errors.positionTitle ? "border-red-500" : ""}`}
              />
              {errors.positionTitle && <p className="text-red-600 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.positionTitle}</p>}
            </div>

            <div id="field-baseHourlyRate">
              <Label className="block font-semibold mb-2">Base Hourly Rate ($) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.baseHourlyRate}
                onChange={e => handleFieldChange("baseHourlyRate", e.target.value)}
                className={`h-11 ${errors.baseHourlyRate ? "border-red-500" : ""}`}
                placeholder="0.00"
              />
              {errors.baseHourlyRate && <p className="text-red-600 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.baseHourlyRate}</p>}
            </div>

            <div id="field-overtimeRate">
              <Label className="block font-semibold mb-2">Overtime Rate ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.overtimeRate}
                onChange={e => handleFieldChange("overtimeRate", e.target.value)}
                className="h-11 bg-slate-50"
                disabled
              />
              <p className="text-xs text-slate-500 mt-1">Auto-calculated at 1.5x base rate</p>
            </div>

            <div id="field-maxHours">
              <Label className="block font-semibold mb-2">Max Regular Hours Per Week (before overtime)</Label>
              <Input
                type="number"
                value={formData.maxHours}
                onChange={e => handleFieldChange("maxHours", e.target.value)}
                className="h-11"
              />
            </div>

            <div id="field-hireDate">
              <Label className="block font-semibold mb-2">Employment Start Date *</Label>
              <Input
                type="date"
                value={formData.hireDate}
                onChange={e => handleFieldChange("hireDate", e.target.value)}
                className={`h-11 ${errors.hireDate ? "border-red-500" : ""}`}
              />
              {errors.hireDate && <p className="text-red-600 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.hireDate}</p>}
            </div>

            {formData.hireDate && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg md:col-span-2">
                <Label className="block font-semibold mb-2">PTO Probation End Date (Read Only)</Label>
                <p className="text-lg font-semibold text-blue-900 mb-1">{format(addDays(new Date(formData.hireDate), 90), "MMM d, yyyy")}</p>
                <p className="text-sm text-blue-700">PTO accrual begins after this date per company policy</p>
              </div>
            )}
          </div>
        </section>

        {/* Onboarding Documents */}
        <OnboardingDocsSection
          assignedDocIds={formData.assignedDocIds}
          onChange={(ids) => handleFieldChange("assignedDocIds", ids)}
        />
      </div>

      {/* Mobile Sticky Buttons */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t p-4 space-y-2">
        <Button onClick={handleSubmit} disabled={saving} className="w-full bg-[#1a2b4a] hover:bg-[#2d4a6f] h-12 text-base">
          {saving ? "Saving..." : "Save Employee & Send Invite"}
        </Button>
        <Button variant="outline" onClick={handleSaveWithoutInvite} disabled={saving} className="w-full h-12 text-base">
          Save without Invite
        </Button>
      </div>
    </div>
  );
}