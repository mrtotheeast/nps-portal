import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Building2, Upload, Loader2, Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";

export default function InvoiceSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [originalCompanyInfo, setOriginalCompanyInfo] = useState(null);
  const settingsIdRef = React.useRef(null);
  const [companyInfo, setCompanyInfo] = useState({ company_name: "", logo_url: "", address: "", city: "", state: "", zip: "", phone: "", email: "", website: "", accounting_email: "" });

  const { isLoading } = useQuery({
    queryKey: ["app-settings", "company_info"],
    queryFn: async () => {
      const all = await base44.entities.AppSettings.list();
      const s = all.find(s => s.setting_key === "company_info");
      if (s) {
        settingsIdRef.current = s.id;
        try { const parsed = JSON.parse(s.setting_value); setCompanyInfo(parsed); setOriginalCompanyInfo(parsed); } catch {}
      }
      return s || null;
    }
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const payload = { setting_key: "company_info", setting_value: JSON.stringify(companyInfo), setting_type: "string", category: "general", description: "Company information for invoices" };
      if (settingsIdRef.current) return base44.entities.AppSettings.update(settingsIdRef.current, payload);
      const created = await base44.entities.AppSettings.create(payload);
      settingsIdRef.current = created.id;
      return created;
    },
    onSuccess: () => { queryClient.invalidateQueries(["app-settings"]); setOriginalCompanyInfo({ ...companyInfo }); toast.success("Company information saved successfully"); },
    onError: () => toast.error("Failed to save. Please try again.")
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    try { const { file_url } = await base44.integrations.Core.UploadFile({ file }); setCompanyInfo({ ...companyInfo, logo_url: file_url }); toast.success("Logo uploaded"); }
    catch { toast.error("Failed to upload logo"); } finally { setUploading(false); }
  };

  const update = (field, value) => setCompanyInfo(c => ({ ...c, [field]: value }));

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Invoice Settings" subtitle="Configure company information for invoices" showBack currentPage="InvoiceSettings" />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card>
          <CardHeader><div className="flex items-center gap-3"><Building2 className="w-6 h-6 text-[#c9a227]" /><div><CardTitle>Company Information</CardTitle><CardDescription>This information will appear on all generated invoices</CardDescription></div></div></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Company Logo</Label>
              <div className="mt-2 flex items-center gap-4">
                {companyInfo.logo_url && <img src={companyInfo.logo_url} alt="Company Logo" className="w-24 h-24 object-contain border rounded-lg bg-white p-2" />}
                <div>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
                  <label htmlFor="logo-upload"><Button variant="outline" asChild disabled={uploading}><span>{uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}{uploading ? "Uploading..." : "Upload Logo"}</span></Button></label>
                  <p className="text-xs text-slate-500 mt-1">PNG or JPG. Max 2MB. Recommended 400x400px</p>
                </div>
              </div>
            </div>
            <div><Label>Company Name *</Label><Input value={companyInfo.company_name} onChange={e => update("company_name", e.target.value)} placeholder="Nationwide Police Services" /></div>
            <div><Label>Street Address</Label><Input value={companyInfo.address} onChange={e => update("address", e.target.value)} placeholder="123 Main St" /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>City</Label><Input value={companyInfo.city} onChange={e => update("city", e.target.value)} placeholder="Baltimore" /></div>
              <div><Label>State</Label><Input value={companyInfo.state} onChange={e => update("state", e.target.value)} placeholder="MD" maxLength={2} /></div>
              <div><Label>ZIP Code</Label><Input value={companyInfo.zip} onChange={e => update("zip", e.target.value)} placeholder="21236" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Phone Number</Label><Input value={companyInfo.phone} onChange={e => update("phone", e.target.value)} placeholder="(240) 749-1141" /></div>
              <div><Label>Email</Label><Input type="email" value={companyInfo.email} onChange={e => update("email", e.target.value)} placeholder="info@company.com" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Website</Label><Input value={companyInfo.website} onChange={e => update("website", e.target.value)} placeholder="www.company.com" /></div>
              <div><Label>Accounting Email</Label><Input type="email" value={companyInfo.accounting_email} onChange={e => update("accounting_email", e.target.value)} placeholder="accounting@company.com" /></div>
            </div>
            <div className="flex justify-between items-center pt-4 border-t gap-3">
              <Button variant="outline" onClick={() => { if (originalCompanyInfo) setCompanyInfo({ ...originalCompanyInfo }); navigate(-1); }}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { if (originalCompanyInfo) setCompanyInfo({ ...originalCompanyInfo }); }} disabled={saveSettingsMutation.isPending}>Cancel</Button>
                <Button onClick={() => saveSettingsMutation.mutate()} disabled={!companyInfo.company_name || saveSettingsMutation.isPending} className="bg-[#1a2b4a] hover:bg-[#2d4a6f]">{saveSettingsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Save Settings</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}