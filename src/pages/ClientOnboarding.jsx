import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2, Building2, CreditCard, FileText, ArrowRight, ArrowLeft,
  Loader2, MapPin, DollarSign, Percent, Copy, Download, Sparkles, Check
} from "lucide-react";

const STEPS = [
  { id: 1, title: "Client Info", icon: Building2, description: "Basic client details" },
  { id: 2, title: "Billing Setup", icon: CreditCard, description: "Payment preferences" },
  { id: 3, title: "Service Contract", icon: FileText, description: "Generate contract" },
  { id: 4, title: "Complete", icon: CheckCircle2, description: "Review & finish" },
];

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${isCompleted ? "bg-green-500 border-green-500 text-white" : isCurrent ? "bg-[#1a2b4a] border-[#1a2b4a] text-white" : "bg-white border-slate-300 text-slate-400"}`}>
                {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={`text-xs mt-1 font-medium ${isCurrent ? "text-[#1a2b4a]" : isCompleted ? "text-green-600" : "text-slate-400"}`}>{step.title}</span>
            </div>
            {idx < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 mb-4 ${isCompleted ? "bg-green-400" : "bg-slate-200"}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Step1ClientInfo({ data, onChange, onNext }) {
  const [errors, setErrors] = useState({});
  const validate = () => {
    const e = {};
    if (!data.name?.trim()) e.name = "Company name is required";
    if (!data.email?.trim()) e.email = "Email is required";
    if (data.email && !/\S+@\S+\.\S+/.test(data.email)) e.email = "Invalid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Company / Client Name *</Label>
          <Input value={data.name || ""} onChange={e => onChange({ ...data, name: e.target.value })} placeholder="e.g. Acme Corporation" className={errors.name ? "border-red-400" : ""} />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>
        <div><Label>Contact Person</Label><Input value={data.contact_person || ""} onChange={e => onChange({ ...data, contact_person: e.target.value })} placeholder="Full name" /></div>
        <div><Label>Phone</Label><Input value={data.phone || ""} onChange={e => onChange({ ...data, phone: e.target.value })} placeholder="(555) 000-0000" /></div>
        <div className="md:col-span-2">
          <Label>Email Address *</Label>
          <Input type="email" value={data.email || ""} onChange={e => onChange({ ...data, email: e.target.value })} placeholder="billing@client.com" className={errors.email ? "border-red-400" : ""} />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>
      </div>
      <div className="border-t pt-4">
        <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4" /> Billing Address</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><Label>Street</Label><Input value={data.billing_address?.street || ""} onChange={e => onChange({ ...data, billing_address: { ...data.billing_address, street: e.target.value } })} placeholder="123 Main St" /></div>
          <div><Label>City</Label><Input value={data.billing_address?.city || ""} onChange={e => onChange({ ...data, billing_address: { ...data.billing_address, city: e.target.value } })} placeholder="City" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>State</Label><Input value={data.billing_address?.state || ""} onChange={e => onChange({ ...data, billing_address: { ...data.billing_address, state: e.target.value } })} placeholder="FL" maxLength={2} /></div>
            <div><Label>ZIP</Label><Input value={data.billing_address?.zip || ""} onChange={e => onChange({ ...data, billing_address: { ...data.billing_address, zip: e.target.value } })} placeholder="33101" /></div>
          </div>
        </div>
      </div>
      <div><Label>Internal Notes</Label><Textarea value={data.notes || ""} onChange={e => onChange({ ...data, notes: e.target.value })} placeholder="Any special notes about this client..." rows={2} /></div>
      <div className="flex justify-end">
        <Button onClick={() => { if (validate()) onNext(); }} className="bg-[#1a2b4a] hover:bg-[#2d4a6f] text-white">Next: Billing Setup <ArrowRight className="w-4 h-4 ml-2" /></Button>
      </div>
    </div>
  );
}

function Step2BillingSetup({ data, onChange, onNext, onBack }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Preferred Payment Method</Label>
          <Select value={data.preferred_payment_method || ""} onValueChange={v => onChange({ ...data, preferred_payment_method: v })}>
            <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="check">Check</SelectItem>
              <SelectItem value="ach">ACH / Bank Transfer</SelectItem>
              <SelectItem value="wire">Wire Transfer</SelectItem>
              <SelectItem value="credit_card">Credit Card</SelectItem>
              <SelectItem value="zelle">Zelle</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Payment Terms</Label>
          <Select value={data.payment_terms || ""} onValueChange={v => onChange({ ...data, payment_terms: v })}>
            <SelectTrigger><SelectValue placeholder="Select terms" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Net 15">Net 15</SelectItem>
              <SelectItem value="Net 30">Net 30</SelectItem>
              <SelectItem value="Net 45">Net 45</SelectItem>
              <SelectItem value="Net 60">Net 60</SelectItem>
              <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tax Rate (%)</Label>
          <div className="relative">
            <Input type="number" min="0" max="30" step="0.01" value={data.tax_rate ?? ""} onChange={e => onChange({ ...data, tax_rate: parseFloat(e.target.value) || 0 })} placeholder="0.00" className="pr-8" />
            <Percent className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400" />
          </div>
        </div>
        <div>
          <Label>Billing Cycle</Label>
          <Select value={data.billing_cycle || ""} onValueChange={v => onChange({ ...data, billing_cycle: v })}>
            <SelectTrigger><SelectValue placeholder="Select cycle" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="bi_weekly">Bi-Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="per_service">Per Service</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Service Type</Label>
          <Select value={data.service_type || ""} onValueChange={v => onChange({ ...data, service_type: v })}>
            <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Security Patrol Services">Security Patrol Services</SelectItem>
              <SelectItem value="Armed Guard Services">Armed Guard Services</SelectItem>
              <SelectItem value="Unarmed Guard Services">Unarmed Guard Services</SelectItem>
              <SelectItem value="Event Security Services">Event Security Services</SelectItem>
              <SelectItem value="Mobile Patrol Services">Mobile Patrol Services</SelectItem>
              <SelectItem value="Executive Protection">Executive Protection</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Estimated Monthly Rate ($)</Label>
          <div className="relative">
            <DollarSign className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
            <Input type="number" min="0" value={data.monthly_rate ?? ""} onChange={e => onChange({ ...data, monthly_rate: parseFloat(e.target.value) || 0 })} placeholder="0.00" className="pl-8" />
          </div>
        </div>
      </div>
      <div><Label>Special Billing Instructions</Label><Textarea value={data.billing_notes || ""} onChange={e => onChange({ ...data, billing_notes: e.target.value })} placeholder="Any special billing instructions or notes..." rows={2} /></div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
        <Button onClick={onNext} className="bg-[#1a2b4a] hover:bg-[#2d4a6f] text-white">Next: Contract <ArrowRight className="w-4 h-4 ml-2" /></Button>
      </div>
    </div>
  );
}

function Step3Contract({ clientId, billingPrefs, contract, setContract, onNext, onBack }) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("generateOnboardingContract", { clientId, billingPrefs });
      setContract(res.data.contract);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const contractText = contract ? `${contract.title}\n\n${contract.sections?.map(s => `${s.heading}\n\n${s.content}`).join("\n\n")}` : "";

  const handleCopy = () => { navigator.clipboard.writeText(contractText); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleDownload = () => {
    const blob = new Blob([contractText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${contract?.title || "Service Contract"}.txt`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {!contract ? (
        <div className="text-center py-10">
          <div className="w-16 h-16 rounded-full bg-[#1a2b4a]/10 flex items-center justify-center mx-auto mb-4"><Sparkles className="w-8 h-8 text-[#1a2b4a]" /></div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Generate Service Contract</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">Our AI will generate a professional security services contract based on the client details and billing preferences you entered.</p>
          <Button onClick={generate} disabled={loading} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Contract...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate with AI</>}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div><h3 className="font-semibold text-slate-800">{contract.title}</h3><p className="text-xs text-slate-500">AI-generated contract • Review before sending</p></div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>{copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}{copied ? "Copied!" : "Copy"}</Button>
              <Button variant="outline" size="sm" onClick={handleDownload}><Download className="w-4 h-4 mr-1" /> Download</Button>
              <Button variant="outline" size="sm" onClick={generate} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Regenerate</Button>
            </div>
          </div>
          <div className="border rounded-lg bg-slate-50 max-h-96 overflow-y-auto p-4 space-y-4 text-sm">
            {contract.sections?.map((section, i) => (
              <div key={i}><h4 className="font-bold text-slate-800 uppercase text-xs tracking-wide mb-1">{section.heading}</h4><p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{section.content}</p></div>
            ))}
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">⚠️ This contract is AI-generated for reference purposes. Please review with your legal team before sending to the client.</p>
        </div>
      )}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
        <Button onClick={onNext} disabled={!contract} className="bg-[#1a2b4a] hover:bg-[#2d4a6f] text-white">Finish Onboarding <ArrowRight className="w-4 h-4 ml-2" /></Button>
      </div>
    </div>
  );
}

function Step4Complete({ clientInfo, billingPrefs, onViewClient, onCreateAnother }) {
  const summaryItems = [
    { label: "Company", value: clientInfo.name }, { label: "Contact", value: clientInfo.contact_person || "—" },
    { label: "Email", value: clientInfo.email }, { label: "Payment Method", value: billingPrefs.preferred_payment_method || "—" },
    { label: "Payment Terms", value: billingPrefs.payment_terms || "—" }, { label: "Tax Rate", value: billingPrefs.tax_rate ? `${billingPrefs.tax_rate}%` : "0%" },
    { label: "Service Type", value: billingPrefs.service_type || "—" }, { label: "Monthly Rate", value: billingPrefs.monthly_rate ? `$${billingPrefs.monthly_rate.toLocaleString()}` : "—" },
  ];
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto"><CheckCircle2 className="w-10 h-10 text-green-500" /></div>
      <div><h3 className="text-xl font-bold text-slate-900">Client Onboarded Successfully!</h3><p className="text-slate-500 mt-1">Everything is set up and ready to go.</p></div>
      <div className="text-left bg-slate-50 rounded-xl border p-4 space-y-2">
        {summaryItems.map(item => (
          <div key={item.label} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
            <span className="text-sm text-slate-500">{item.label}</span>
            <span className="text-sm font-medium text-slate-800">{item.value}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={onViewClient} className="bg-[#1a2b4a] hover:bg-[#2d4a6f] text-white"><Building2 className="w-4 h-4 mr-2" /> View Client Profile</Button>
        <Button variant="outline" onClick={onCreateAnother}><ArrowRight className="w-4 h-4 mr-2" /> Onboard Another Client</Button>
      </div>
    </div>
  );
}

export default function ClientOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [clientInfo, setClientInfo] = useState({});
  const [billingPrefs, setBillingPrefs] = useState({ tax_rate: 0 });
  const [createdClientId, setCreatedClientId] = useState(null);
  const [contract, setContract] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleClientNext = async () => {
    setSaving(true);
    try {
      const created = await base44.entities.Client.create({ ...clientInfo, payment_terms: billingPrefs.payment_terms || "Net 30", status: "active" });
      setCreatedClientId(created.id);
      setStep(2);
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const handleBillingNext = async () => {
    setSaving(true);
    try {
      await base44.entities.Client.update(createdClientId, { payment_terms: billingPrefs.payment_terms || "Net 30", notes: billingPrefs.billing_notes || clientInfo.notes || "" });
      setStep(3);
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const reset = () => { setStep(1); setClientInfo({}); setBillingPrefs({ tax_rate: 0 }); setCreatedClientId(null); setContract(null); };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#1a2b4a] flex items-center justify-center mx-auto mb-3"><Building2 className="w-6 h-6 text-[#c9a227]" /></div>
          <h1 className="text-2xl font-bold text-slate-900">Client Onboarding</h1>
          <p className="text-slate-500 text-sm mt-1">Set up a new client in just a few steps</p>
        </div>
        <StepIndicator currentStep={step} />
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {React.createElement(STEPS[step - 1].icon, { className: "w-5 h-5 text-[#1a2b4a]" })}
              {STEPS[step - 1].title}
              <span className="text-xs font-normal text-slate-400 ml-auto">Step {step} of {STEPS.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {step === 1 && <Step1ClientInfo data={clientInfo} onChange={setClientInfo} onNext={handleClientNext} saving={saving} />}
            {step === 2 && <Step2BillingSetup data={billingPrefs} onChange={setBillingPrefs} onNext={handleBillingNext} onBack={() => setStep(1)} saving={saving} />}
            {step === 3 && <Step3Contract clientId={createdClientId} billingPrefs={billingPrefs} contract={contract} setContract={setContract} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
            {step === 4 && <Step4Complete clientInfo={clientInfo} billingPrefs={billingPrefs} onViewClient={() => navigate(createPageUrl("ClientManagement"))} onCreateAnother={reset} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}