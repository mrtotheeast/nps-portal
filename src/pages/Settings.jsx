import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { useCompany } from "@/context/CompanyContext";
import { usePlatformOwnerCheck } from "@/hooks/usePlatformOwnerCheck";
import { useAIAccess } from "@/hooks/useAIAccess";
import {
  Building2, DollarSign, Users, Bell, Plug, Lock, Sparkles,
  Upload, Loader2, Save, Check, Eye, Sun, Moon, Globe, Shield,
  CreditCard, Calendar, AlertCircle, ChevronRight, ExternalLink,
  MapPin, Key, Info, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import BillingDashboard from "@/components/billing/BillingDashboard";
import AIPurchaseModal from "@/components/ai/AIPurchaseModal";
import { toast } from "sonner";

// ─── Company Profile Tab ──────────────────────────────────────────────────────
function CompanyProfileTab({ company, companyId, queryClient }) {
  const [formData, setFormData] = useState({ name: "", primary_color: "#1a2b4a", logo_url: "" });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || "",
        primary_color: company.primary_color || "#1a2b4a",
        logo_url: company.logo_url || "",
      });
    }
  }, [company]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const uploadRes = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, logo_url: uploadRes.file_url }));
    setUploading(false);
    toast.success("Logo uploaded");
  };

  const handleSave = async () => {
    if (!companyId || companyId === "super_admin") return;
    setSaving(true);
    await base44.entities.Company.update(companyId, {
      name: formData.name,
      primary_color: formData.primary_color,
      logo_url: formData.logo_url,
    });
    queryClient.invalidateQueries(["company", companyId]);
    setSaved(true);
    setSaving(false);
    toast.success("Company profile saved");
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Company Branding</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="company-name">Company Name</Label>
            <Input
              id="company-name"
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Company Logo</Label>
            <div className="mt-2 flex items-center gap-4">
              {formData.logo_url && (
                <img src={formData.logo_url} alt="Logo" className="h-16 w-16 object-contain rounded border p-1" />
              )}
              <Button variant="outline" disabled={uploading} onClick={() => document.getElementById("logo-input")?.click()} className="gap-2">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Uploading..." : "Upload Logo"}
              </Button>
              <input id="logo-input" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>
          </div>
          <div>
            <Label>Primary Color</Label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="color"
                value={formData.primary_color}
                onChange={e => setFormData(p => ({ ...p, primary_color: e.target.value }))}
                className="h-12 w-20 rounded border cursor-pointer"
              />
              <Input
                type="text"
                value={formData.primary_color}
                onChange={e => setFormData(p => ({ ...p, primary_color: e.target.value }))}
                className="max-w-xs"
              />
            </div>
          </div>
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3 text-sm">Preview</h3>
            <div className="rounded-lg border p-4" style={{ borderColor: formData.primary_color }}>
              <div className="flex items-center gap-3">
                {formData.logo_url && <img src={formData.logo_url} alt="Preview" className="h-10 w-10 object-contain" />}
                <div>
                  <h4 style={{ color: formData.primary_color }} className="font-bold">{formData.name || "Company Name"}</h4>
                  <p className="text-xs text-slate-500">Portal</p>
                </div>
              </div>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || saved}
            className={saved ? "bg-emerald-600 hover:bg-emerald-600" : "bg-[#1a2b4a] hover:bg-[#2d4a6f]"}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : saved ? <Check className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {saved ? "Saved!" : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Billing Tab ──────────────────────────────────────────────────────────────
function BillingTab({ companyId }) {
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const { hasAccess, isLoading: accessLoading, subscription } = useAIAccess();

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    const res = await base44.functions.invoke("createBillingPortalSession", {
      company_id: companyId,
      return_url: window.location.href,
    });
    setPortalLoading(false);
    if (res.data?.url) window.location.href = res.data.url;
    else toast.error("Could not open billing portal.");
  };

  return (
    <div className="space-y-6">
      <BillingDashboard />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-[#c9a227]" />AI Reporting Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          {accessLoading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" />Loading...</div>
          ) : hasAccess ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-emerald-800">Active</span>
                <Badge className="bg-emerald-600 text-white capitalize">{subscription?.plan || "active"}</Badge>
              </div>
              {subscription?.expiry_date && (
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <Calendar className="w-4 h-4" />
                  Next billing: {new Date(subscription.expiry_date).toLocaleDateString()}
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={portalLoading} className="border-emerald-300 text-emerald-700 hover:bg-emerald-100">
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
              <p className="text-sm text-amber-700">Unlock AI-powered incident reports, training builders, and writing assistance.</p>
              <Button size="sm" onClick={() => setPurchaseModalOpen(true)} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold">
                <Sparkles className="w-4 h-4 mr-2" />Unlock AI Reporting
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <AIPurchaseModal open={purchaseModalOpen} onClose={() => setPurchaseModalOpen(false)} />
    </div>
  );
}

// ─── Team & Roles Tab ─────────────────────────────────────────────────────────
function TeamRolesTab({ navigate }) {
  const items = [
    { label: "Employee Directory", description: "Add, manage, and invite employees", page: "EmployeeDirectory", icon: Users },
    { label: "User Management", description: "Manage portal access and user accounts", page: "UserManagement", icon: Users },
    { label: "Roles & Permissions", description: "View and understand role access levels", page: "RolesPermissions", icon: Shield },
    { label: "Role Workspaces", description: "Create and manage role workspaces", page: "RoleWorkspaceAdmin", icon: Shield },
    { label: "Position Management", description: "Manage roles and pay rates", page: "PositionManagement", icon: Users },
    { label: "Timekeeping Security", description: "Clock-in restrictions and geofence rules", page: "TimekeepingSecuritySettings", icon: Lock },
    { label: "Profile Photo Approvals", description: "Review submitted profile photos", page: "ProfilePhotoApproval", icon: Eye },
  ];
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0 divide-y">
          {items.map((item) => (
            <button
              key={item.page}
              onClick={() => navigate(createPageUrl(item.page))}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.description}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────
function NotificationsTab() {
  const DEFAULT_PREFS = {
    schedule_changes: true, shift_reminders: true, pto_updates: true,
    incident_alerts: true, training_reminders: true, emergency_alerts: true,
    payroll_notifications: false, chat_messages: true,
  };
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);
  const toggle = (key) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  // Load saved preferences from the user record on mount
  useEffect(() => {
    if (loaded) return;
    base44.auth.me().then(u => {
      if (u?.notification_preferences && typeof u.notification_preferences === "object") {
        setPrefs(prev => ({ ...prev, ...u.notification_preferences }));
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [loaded]);

  const saveMutation = useMutation({
    mutationFn: () => base44.auth.updateMe({ notification_preferences: prefs }),
    onSuccess: () => toast.success("Notification preferences saved"),
    onError: (err) => toast.error(`Failed to save: ${err.message}`),
  });

  const PREF_LABELS = [
    { key: "emergency_alerts", label: "Emergency Alerts", description: "Critical safety notifications", required: true },
    { key: "schedule_changes", label: "Schedule Changes", description: "When your shifts are updated" },
    { key: "shift_reminders", label: "Shift Reminders", description: "Reminders before your shift starts" },
    { key: "pto_updates", label: "PTO Updates", description: "Approval or denial of PTO requests" },
    { key: "incident_alerts", label: "Incident Alerts", description: "New incidents at your assigned sites" },
    { key: "training_reminders", label: "Training Reminders", description: "Upcoming training deadlines" },
    { key: "payroll_notifications", label: "Payroll Notifications", description: "Pay stubs and payroll updates" },
    { key: "chat_messages", label: "Chat Messages", description: "New messages from team members" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" />Alert Settings</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {PREF_LABELS.map(({ key, label, description, required }) => (
            <div key={key} className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
              </div>
              <Switch
                checked={prefs[key]}
                onCheckedChange={() => !required && toggle(key)}
                disabled={required}
                className={required ? "opacity-60" : ""}
              />
            </div>
          ))}
        </CardContent>
      </Card>
      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="bg-[#1a2b4a] hover:bg-[#2d4a6f]"
      >
        {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Save Preferences
      </Button>
    </div>
  );
}

// ─── Integrations Tab ─────────────────────────────────────────────────────────
function IntegrationsTab({ navigate }) {
  const items = [
    { label: "Payroll Integration", description: "Connect Paychex or other payroll providers", page: "PayrollIntegration", icon: DollarSign },
    { label: "Payroll Settings", description: "Column mappings and export preferences", page: "PayrollSettings", icon: DollarSign },
    { label: "State Licensing Settings", description: "Configure state security license requirements", page: "StateLicensingSettings", icon: MapPin },
    { label: "Data Import", description: "Bulk import employees and sites via CSV or AI", page: "DataImport", icon: Upload },
    { label: "Report Automation", description: "Schedule automated reports", page: "ReportAutomation", icon: Globe },
  ];
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0 divide-y">
          {items.map((item) => (
            <button
              key={item.page}
              onClick={() => navigate(createPageUrl(item.page))}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.description}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────
function SecurityTab({ navigate }) {
  const items = [
    { label: "Change Password", description: "Update your account password", page: "Profile", icon: Key },
    { label: "Timekeeping Security", description: "Clock-in restrictions and GPS rules", page: "TimekeepingSecuritySettings", icon: Lock },
    { label: "Audit Log", description: "View system activity and changes", page: "AuditLog", icon: Shield },
    { label: "Role Workspaces", description: "Review and manage role-based workspace access", page: "RoleWorkspaceAdmin", icon: Shield },
  ];
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0 divide-y">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(createPageUrl(item.page))}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.description}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── AI Settings Tab ──────────────────────────────────────────────────────────
function AISettingsTab({ navigate }) {
  const { hasAccess, isLoading } = useAIAccess();
  const items = [
    { label: "AI Training Builder", description: "Generate training courses with AI", page: "AITrainingBuilder", icon: Sparkles },
    { label: "AI Incident Analysis", description: "AI-powered pattern detection on incidents", page: "AIIncidentAnalysis", icon: Sparkles },
    { label: "AI Reports", description: "Scheduled AI analytics and custom reports", page: "AIReportsNew", icon: Sparkles },
    { label: "Training Suggestions", description: "AI-powered training recommendations", page: "TrainingSuggestions", icon: Sparkles },
  ];
  return (
    <div className="space-y-4">
      {isLoading ? null : !hasAccess && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">AI Reporting not active</p>
            <p className="text-xs text-amber-700 mt-1">Subscribe to AI Reporting in the Billing tab to unlock these features.</p>
            <Button size="sm" className="mt-2 bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]" onClick={() => navigate(createPageUrl("CompanySettings"))}>
              Go to Billing
            </Button>
          </div>
        </div>
      )}
      <Card>
        <CardContent className="p-0 divide-y">
          {items.map((item) => (
            <button
              key={item.page}
              onClick={() => navigate(createPageUrl(item.page))}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#c9a227]/10 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-[#c9a227]" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.description}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function Settings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { companyId } = useCompany();
  const { isPlatformOwner } = usePlatformOwnerCheck();
  const queryClient = useQueryClient();

  const userRole = user?.role_type || user?.role || "employee";
  const isAdmin = ["admin", "super_admin"].includes(userRole);

  const activeTab = searchParams.get("tab") || (isAdmin ? "company" : "notifications");
  const setActiveTab = (tab) => setSearchParams({ tab });

  const { data: company } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      if (!companyId || companyId === "super_admin") return null;
      const r = await base44.entities.Company.filter({ id: companyId });
      return r[0] || null;
    },
    enabled: !!companyId && companyId !== "super_admin",
  });

  // Non-admin: simpler settings page with just relevant tabs
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title="Settings" subtitle="Manage your account" showBack />
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>
            <TabsContent value="notifications"><NotificationsTab /></TabsContent>
            <TabsContent value="security"><SecurityTab navigate={navigate} /></TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // Build admin tabs — hide billing for platform owner
  const tabs = [
    { id: "company", label: "Company Profile", icon: Building2 },
    ...(!isPlatformOwner ? [{ id: "billing", label: "Billing & Subscription", icon: DollarSign }] : []),
    { id: "team", label: "Team & Roles", icon: Users },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "integrations", label: "Integrations", icon: Plug },
    { id: "security", label: "Security", icon: Lock },
    { id: "ai", label: "AI Settings", icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Settings" subtitle="Manage company settings and preferences" showBack />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Horizontal scrollable tab list */}
          <div className="overflow-x-auto mb-6">
            <TabsList className="inline-flex min-w-max gap-1">
              {tabs.map(t => (
                <TabsTrigger key={t.id} value={t.id} className="flex items-center gap-1.5 whitespace-nowrap">
                  <t.icon className="w-3.5 h-3.5" />
                  <span className="text-sm">{t.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="company">
            <CompanyProfileTab company={company} companyId={companyId} queryClient={queryClient} />
          </TabsContent>

          {!isPlatformOwner && (
            <TabsContent value="billing">
              <BillingTab companyId={companyId} />
            </TabsContent>
          )}

          <TabsContent value="team">
            <TeamRolesTab navigate={navigate} />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsTab />
          </TabsContent>

          <TabsContent value="integrations">
            <IntegrationsTab navigate={navigate} />
          </TabsContent>

          <TabsContent value="security">
            <SecurityTab navigate={navigate} />
          </TabsContent>

          <TabsContent value="ai">
            <AISettingsTab navigate={navigate} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}