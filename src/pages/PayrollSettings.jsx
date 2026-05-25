import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, DollarSign, Save, Loader2, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";

const SYSTEM_COLUMNS = [
  { value: "employee_id", label: "Employee ID" },
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "hours_worked", label: "Hours Worked" },
  { value: "regular_hours", label: "Regular Hours" },
  { value: "overtime_hours", label: "Overtime Hours" },
  { value: "hourly_rate", label: "Hourly Rate" },
  { value: "regular_pay", label: "Regular Pay" },
  { value: "overtime_pay", label: "Overtime Pay" },
  { value: "gross_pay", label: "Gross Pay" },
  { value: "pay_period_start", label: "Pay Period Start" },
  { value: "pay_period_end", label: "Pay Period End" },
  { value: "pay_date", label: "Pay Date" },
  { value: "department", label: "Department" },
  { value: "position", label: "Position" },
];

const PRESET_PROVIDERS = [
  { name: "Paychex", columns: { first_name: "First Name", last_name: "Last Name", hours_worked: "Total Hours", hourly_rate: "Rate", gross_pay: "Gross Pay" } },
  { name: "ADP", columns: { employee_id: "Emp ID", first_name: "First Name", last_name: "Last Name", hours_worked: "Hours", hourly_rate: "Rate", gross_pay: "Gross" } },
  { name: "Gusto", columns: { first_name: "First", last_name: "Last", hours_worked: "Hours Worked", hourly_rate: "Hourly Rate", gross_pay: "Gross Wages" } },
  { name: "QuickBooks Payroll", columns: { employee_id: "Employee ID", first_name: "First Name", last_name: "Last Name", hours_worked: "Hours", hourly_rate: "Pay Rate", gross_pay: "Gross Pay" } },
];

export default function() {
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(true);
    const [providerName, setProviderName] = useState("");
    const [providerWebsite, setProviderWebsite] = useState("");
    const [columnMappings, setColumnMappings] = useState({});

    useEffect(() => {
      loadSettings();
    }, []);

    const loadSettings = async () => {
      try {
        const all = await base44.entities.AppSettings.list();
        const providerSetting = all.find(s => s.setting_key === "payroll_provider_name");
        const websiteSetting = all.find(s => s.setting_key === "payroll_provider_website");
        const columnsSetting = all.find(s => s.setting_key === "payroll_column_mappings");

        if (providerSetting) setProviderName(providerSetting.setting_value);
        if (websiteSetting) setProviderWebsite(websiteSetting.setting_value);
        if (columnsSetting) setColumnMappings(JSON.parse(columnsSetting.setting_value));
      } catch (error) {
        console.error("Failed to load payroll settings:", error);
      } finally {
        setLoading(false);
      }
    };

    const saveMutation = useMutation({
      mutationFn: async () => {
        const settings = [
          {
            setting_key: "payroll_provider_name",
            setting_value: providerName,
            setting_type: "string",
            category: "general",
            description: "Payroll provider name",
          },
          {
            setting_key: "payroll_provider_website",
            setting_value: providerWebsite,
            setting_type: "string",
            category: "general",
            description: "Payroll provider website URL",
          },
          {
            setting_key: "payroll_column_mappings",
            setting_value: JSON.stringify(columnMappings),
            setting_type: "string",
            category: "general",
            description: "Column mappings for payroll export",
          },
        ];

        const all = await base44.entities.AppSettings.list();
        
        for (const setting of settings) {
          const existing = all.find(s => s.setting_key === setting.setting_key);
          if (existing) {
            await base44.entities.AppSettings.update(existing.id, setting);
          } else {
            await base44.entities.AppSettings.create(setting);
          }
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries(["app-settings"]);
        toast.success("Payroll settings saved");
      },
      onError: () => toast.error("Failed to save settings"),
    });

    const loadPreset = (preset) => {
      setProviderName(preset.name);
      setColumnMappings(preset.columns);
      toast.success(`Loaded ${preset.name} preset`);
    };

    const handleMappingChange = (systemColumn, customName) => {
      if (customName) {
        setColumnMappings(prev => ({ ...prev, [systemColumn]: customName }));
      } else {
        setColumnMappings(prev => {
          const updated = { ...prev };
          delete updated[systemColumn];
          return updated;
        });
      }
    };

    if (loading) return <LoadingScreen />;

    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title="Payroll Settings" subtitle="Configure payroll provider and export column mappings" showBack />
        
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-[#c9a227]" />
                <div>
                  <CardTitle>Payroll Provider</CardTitle>
                  <CardDescription>Select your payroll provider for standardized exports</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Quick Select Provider</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {PRESET_PROVIDERS.map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      onClick={() => loadPreset(preset)}
                      className="justify-start"
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Provider Name</Label>
                  <Input
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    placeholder="e.g., Paychex, ADP, Gusto"
                  />
                </div>
                <div>
                  <Label>Provider Website</Label>
                  <Input
                    value={providerWebsite}
                    onChange={(e) => setProviderWebsite(e.target.value)}
                    placeholder="https://www.paychex.com/"
                    type="url"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Column Mappings</CardTitle>
              <CardDescription>Map system columns to your payroll provider's required format</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 pb-2 border-b">
                <p className="text-sm font-semibold text-slate-700">System Column</p>
                <p className="text-sm font-semibold text-slate-700">Your Provider's Column Name</p>
              </div>
              
              {SYSTEM_COLUMNS.map((systemCol) => (
                <div key={systemCol.value} className="grid grid-cols-2 gap-4 items-center">
                  <div className="text-sm text-slate-700">{systemCol.label}</div>
                  <Input
                    value={columnMappings[systemCol.value] || ""}
                    onChange={(e) => handleMappingChange(systemCol.value, e.target.value)}
                    placeholder={systemCol.label}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-slate-600">
                When you export payroll data from the Payroll Export page, the system will use these column mappings 
                to generate a CSV file that matches your payroll provider's exact requirements.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800">
                  <strong>Tip:</strong> Select a preset provider above to automatically load recommended column names. 
                  You can then customize any mappings to match your specific account configuration.
                </p>
              </div>
              <p className="text-slate-600">
                The export will include all approved timesheets within the selected pay period, with overtime 
                calculated at 1.5x for hours exceeding 40 per week.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => loadSettings()}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-[#1a2b4a]">
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    );
  }