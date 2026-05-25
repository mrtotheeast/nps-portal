import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/context/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Save, Loader2, Check, Sparkles, CreditCard, Calendar, AlertCircle, DollarSign } from "lucide-react";
import BillingDashboard from "@/components/billing/BillingDashboard";
import DeleteAccountSection from "@/components/settings/DeleteAccountSection";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";
import AIPurchaseModal from "@/components/ai/AIPurchaseModal";
import { useAIAccess } from "@/hooks/useAIAccess";
import { usePlatformOwnerCheck } from "@/hooks/usePlatformOwnerCheck";

export default function CompanySettings() {
  const { isPlatformOwner } = usePlatformOwnerCheck();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  const [searchParams] = useSearchParams();
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const { hasAccess, isLoading: accessLoading, subscription } = useAIAccess();

  // Show success toast when redirected back from Stripe
  useEffect(() => {
    if (searchParams.get('ai_success') === '1') {
      toast.success('AI Reporting subscription activated!');
      queryClient.invalidateQueries(['ai-subscription']);
    }
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    primary_color: "#1a2b4a",
    logo_url: ""
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: company, isLoading } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      if (companyId === 'super_admin') {
        throw new Error("Super admins cannot have company settings");
      }
      const companies = await base44.entities.Company.filter({ id: companyId });
      return companies[0] || null;
    },
    enabled: !!companyId && companyId !== 'super_admin'
  });

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || "",
        primary_color: company.primary_color || "#1a2b4a",
        logo_url: company.logo_url || ""
      });
    }
  }, [company]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, logo_url: uploadRes.file_url }));
      toast.success("Logo uploaded successfully");
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!companyId || companyId === 'super_admin') return;

    setSaving(true);
    try {
      await base44.entities.Company.update(companyId, {
        name: formData.name,
        primary_color: formData.primary_color,
        logo_url: formData.logo_url
      });

      queryClient.invalidateQueries(["company", companyId]);
      setSaved(true);
      toast.success("Company branding updated");

      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    const res = await base44.functions.invoke('createBillingPortalSession', {
      company_id: companyId,
      return_url: window.location.href
    });
    setPortalLoading(false);
    if (res.data?.url) {
      window.location.href = res.data.url;
    } else {
      toast.error('Could not open billing portal.');
    }
  };

  if (isLoading) return <LoadingScreen />;

  if (companyId === 'super_admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Super admins do not have individual company settings.</p>
          <Button onClick={() => navigate("/")} className="mt-4">Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Company Settings" subtitle="Branding, billing, and subscription management" />

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Billing Section — hidden for platform owner (NPS) */}
        {!isPlatformOwner && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-[#c9a227]" />
              <h2 className="text-lg font-semibold">Billing and Subscription</h2>
            </div>
            <BillingDashboard />
          </div>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Company Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Company Name */}
            <div>
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter company name"
                className="mt-2"
              />
            </div>

            {/* Logo Upload */}
            <div>
              <Label>Company Logo</Label>
              <div className="mt-2 flex items-center gap-4">
                {formData.logo_url && (
                  <img src={formData.logo_url} alt="Company logo" className="h-16 w-16 object-contain rounded border p-1" />
                )}
                <Button
                  variant="outline"
                  disabled={uploading}
                  onClick={() => document.getElementById("logo-input")?.click()}
                  className="gap-2"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? "Uploading..." : "Upload Logo"}
                </Button>
                <input
                  id="logo-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            </div>

            {/* Primary Color */}
            <div>
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  id="primary-color"
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="h-12 w-20 rounded border cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.primary_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                  placeholder="#1a2b4a"
                  className="max-w-xs"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Preview</h3>
              <div className="rounded-lg border p-4" style={{ borderColor: formData.primary_color }}>
                <div className="flex items-center gap-3">
                  {formData.logo_url && (
                    <img src={formData.logo_url} alt="Preview" className="h-12 w-12 object-contain" />
                  )}
                  <div>
                    <h4 style={{ color: formData.primary_color }} className="font-bold">{formData.name || "Company Name"}</h4>
                    <p className="text-xs text-slate-500">Portal</p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Reporting Subscription — hidden for platform owner (NPS) */}
            {!isPlatformOwner && (
              <div className="border-t pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-[#c9a227]" />
                  <h3 className="font-semibold text-lg">AI Reporting Subscription</h3>
                </div>

                {accessLoading ? (
                <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
              ) : hasAccess ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold text-emerald-800">Active</span>
                    <Badge className="bg-emerald-600 text-white capitalize">{subscription?.plan || 'active'}</Badge>
                  </div>
                  {subscription?.expiry_date && (
                    <div className="flex items-center gap-2 text-sm text-emerald-700">
                      <Calendar className="w-4 h-4" />
                      Next billing: {new Date(subscription.expiry_date).toLocaleDateString()}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                  >
                    {portalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                    Manage Subscription
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <span className="font-semibold text-amber-800">Not subscribed</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    Unlock AI-powered incident reports, training builders, and writing assistance for your entire team.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setPurchaseModalOpen(true)}
                    className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Unlock AI Reporting
                  </Button>
                </div>
              )}
              </div>
            )}

            {/* Save Button */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={saving || saved}
                className={saved ? "bg-emerald-600 hover:bg-emerald-600" : "bg-[#1a2b4a] hover:bg-[#2d4a6f]"}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : saved ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saved ? "Saved!" : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <div className="max-w-2xl mx-auto px-4 pb-10">
        <div className="flex items-center gap-2 mb-3 mt-8">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
        </div>
        <DeleteAccountSection company={company} />
      </div>

      <AIPurchaseModal open={purchaseModalOpen} onClose={() => setPurchaseModalOpen(false)} />
    </div>
  );
}