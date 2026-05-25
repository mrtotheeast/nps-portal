import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Upload, FileText, Users, Settings as SettingsIcon, Loader2, Info, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";

export default function EmployeeImportSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    autoSendInvites: false,
    defaultRole: "employee",
    defaultStatus: "active",
    requirePosition: false,
    allowDuplicateEmails: false,
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ["import-settings"],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  useEffect(() => {
    const importSettings = appSettings.find(s => s.setting_key === "employee_import_settings");
    if (importSettings) {
      try {
        setSettings(JSON.parse(importSettings.setting_value));
      } catch (e) {
        console.error("Failed to parse import settings:", e);
      }
    }
  }, [appSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const existing = appSettings.find(s => s.setting_key === "employee_import_settings");
      if (existing) {
        await base44.entities.AppSettings.update(existing.id, {
          setting_value: JSON.stringify(settings),
          last_modified_at: new Date().toISOString(),
        });
      } else {
        await base44.entities.AppSettings.create({
          setting_key: "employee_import_settings",
          setting_value: JSON.stringify(settings),
          setting_type: "string",
          description: "Employee bulk import configuration",
          category: "general",
          last_modified_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      toast.success("Import settings saved");
    },
  });

  const handleQuickImport = async (e) => {
    e.preventDefault();
    const input = document.getElementById("quick-import-file");
    if (input && input.files[0]) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: input.files[0] });
        const res = await base44.functions.invoke("importEmployeesCSV", { file_url });
        toast.success(`Imported ${res.data?.count || 0} employees`);
        input.value = "";
      } catch (err) {
        toast.error("Failed to import employees");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Employee Import Settings" subtitle="Configure bulk upload behavior" showBack />
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Quick Import
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleQuickImport} className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  id="quick-import-file"
                />
                <label htmlFor="quick-import-file" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Click to upload CSV or Excel file</p>
                  <p className="text-xs text-slate-400 mt-1">Required: firstName, lastName, email</p>
                </label>
              </div>
              <Button type="submit" className="w-full bg-[#1a2b4a]">
                Import Now
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Import Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              Import Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Send Invitations</Label>
                <p className="text-xs text-slate-500">Automatically send portal invites to imported employees</p>
              </div>
              <Switch
                checked={settings.autoSendInvites}
                onCheckedChange={(v) => setSettings({ ...settings, autoSendInvites: v })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Default Role</Label>
                <p className="text-xs text-slate-500">Role assigned to imported employees</p>
              </div>
              <Select
                value={settings.defaultRole}
                onValueChange={(v) => setSettings({ ...settings, defaultRole: v })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="officer">Officer</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Default Status</Label>
                <p className="text-xs text-slate-500">Employment status for new imports</p>
              </div>
              <Select
                value={settings.defaultStatus}
                onValueChange={(v) => setSettings({ ...settings, defaultStatus: v })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Require Position</Label>
                <p className="text-xs text-slate-500">Force position assignment during import</p>
              </div>
              <Switch
                checked={settings.requirePosition}
                onCheckedChange={(v) => setSettings({ ...settings, requirePosition: v })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Duplicate Emails</Label>
                <p className="text-xs text-slate-500">Permit multiple employees with same email</p>
              </div>
              <Switch
                checked={settings.allowDuplicateEmails}
                onCheckedChange={(v) => setSettings({ ...settings, allowDuplicateEmails: v })}
              />
            </div>
          </CardContent>
        </Card>

        {/* CSV Template */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              CSV Template
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Download a sample CSV file with the correct column structure for employee imports.
              </p>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs font-mono text-slate-700 mb-2">Required columns:</p>
                <code className="text-xs bg-slate-100 px-2 py-1 rounded">firstName, lastName, email</code>
                <p className="text-xs font-mono text-slate-700 mt-3 mb-2">Optional columns:</p>
                <code className="text-xs bg-slate-100 px-2 py-1 rounded">phoneNumber, positionTitle, role, status, address.street, address.city, address.state, address.zip</code>
              </div>
              <Button variant="outline" className="w-full">
                Download Template
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Import History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Import Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="text-sm text-slate-600 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5" />
                <span>CSV files must be UTF-8 encoded</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5" />
                <span>Maximum file size: 10 MB</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5" />
                <span>Imports add new records only (do not overwrite existing)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5" />
                <span>Email addresses must be unique unless duplicates are enabled</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5" />
                <span>Position titles will be auto-created if they don't exist</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full bg-[#1a2b4a]"
        >
          {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}