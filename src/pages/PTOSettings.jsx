import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Clock, Save, Plus, X, Calendar } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";

export default function PTOSettings() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    fullTime: { accrualPerHour: 0.0385, maxAccrualHours: 200, carryoverLimit: 40 },
    partTime: { accrualPerHour: 0.0385, maxAccrualHours: 80, carryoverLimit: 20 },
    stateRates: [{ state: "CA", accrualPerHour: 0.0577, note: "California law requires 1 hour per 30 worked" }, { state: "MA", accrualPerHour: 0.0385, note: "Massachusetts earned sick time" }],
    resetDate: "01-01", autoCarryover: true, carryoverMaxYear: 1, autoDeductFromTimesheet: true, trackByYear: true
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["pto-settings"],
    queryFn: async () => {
      const configs = await base44.entities.ReportConfig.filter({ config_type: "pto_settings" });
      if (configs.length > 0) { setFormData(configs[0].config_data); return configs[0]; }
      return null;
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (settings) { return base44.entities.ReportConfig.update(settings.id, { config_data: data }); }
      else { return base44.entities.ReportConfig.create({ config_type: "pto_settings", config_data: data, name: "PTO Accumulation Settings" }); }
    },
    onSuccess: () => { queryClient.invalidateQueries(["pto-settings"]); toast.success("PTO settings updated"); }
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="PTO Settings" subtitle="Configure time off accumulation rates" showBack />
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" />Full-Time Employee PTO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Accrual Rate (Hours per Hour Worked)</Label>
              <Input type="number" step="0.0001" value={formData.fullTime.accrualPerHour} onChange={e => setFormData({ ...formData, fullTime: { ...formData.fullTime, accrualPerHour: parseFloat(e.target.value) } })} />
              <p className="text-xs text-slate-500 mt-1">0.0385 = ~2 weeks/year (80 hrs) for 40hrs/week employee</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Accrual (Hours)</Label>
                <Input type="number" value={formData.fullTime.maxAccrualHours} onChange={e => setFormData({ ...formData, fullTime: { ...formData.fullTime, maxAccrualHours: parseInt(e.target.value) } })} />
              </div>
              <div>
                <Label>Carryover Limit (Hours)</Label>
                <Input type="number" value={formData.fullTime.carryoverLimit} onChange={e => setFormData({ ...formData, fullTime: { ...formData.fullTime, carryoverLimit: parseInt(e.target.value) } })} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Part-Time Employee PTO</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Accrual Rate (Hours per Hour Worked)</Label>
              <Input type="number" step="0.0001" value={formData.partTime.accrualPerHour} onChange={e => setFormData({ ...formData, partTime: { ...formData.partTime, accrualPerHour: parseFloat(e.target.value) } })} />
              <p className="text-xs text-slate-500 mt-1">Prorated based on hours worked</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Accrual (Hours)</Label>
                <Input type="number" value={formData.partTime.maxAccrualHours} onChange={e => setFormData({ ...formData, partTime: { ...formData.partTime, maxAccrualHours: parseInt(e.target.value) } })} />
              </div>
              <div>
                <Label>Carryover Limit (Hours)</Label>
                <Input type="number" value={formData.partTime.carryoverLimit} onChange={e => setFormData({ ...formData, partTime: { ...formData.partTime, carryoverLimit: parseInt(e.target.value) } })} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>State-Specific Accrual Rates</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">Override rates for specific states based on local laws</p>
            {formData.stateRates.map((stateRate, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">State</Label>
                      <Input placeholder="CA" value={stateRate.state} onChange={e => { const newRates = [...formData.stateRates]; newRates[index].state = e.target.value; setFormData({ ...formData, stateRates: newRates }); }} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Accrual Per Hour</Label>
                      <Input type="number" step="0.0001" value={stateRate.accrualPerHour} onChange={e => { const newRates = [...formData.stateRates]; newRates[index].accrualPerHour = parseFloat(e.target.value); setFormData({ ...formData, stateRates: newRates }); }} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Note</Label>
                    <Input placeholder="Legal requirement or reason" value={stateRate.note} onChange={e => { const newRates = [...formData.stateRates]; newRates[index].note = e.target.value; setFormData({ ...formData, stateRates: newRates }); }} />
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setFormData({ ...formData, stateRates: formData.stateRates.filter((_, i) => i !== index) }); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={() => { setFormData({ ...formData, stateRates: [...formData.stateRates, { state: "", accrualPerHour: 0.0385, note: "" }] }); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add State Override
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" />Annual Reset & Carryover</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Annual Reset Date</Label>
              <Input type="text" placeholder="MM-DD (e.g., 01-01)" value={formData.resetDate} onChange={e => setFormData({ ...formData, resetDate: e.target.value })} />
              <p className="text-xs text-slate-500 mt-1">Date when PTO balances reset (typically January 1st)</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto Carryover Unused Hours</Label>
                <p className="text-xs text-slate-500">Automatically roll over unused hours up to limit</p>
              </div>
              <Switch checked={formData.autoCarryover} onCheckedChange={c => setFormData({ ...formData, autoCarryover: c })} />
            </div>
            {formData.autoCarryover && (
              <div>
                <Label>Carryover Expiration (Years)</Label>
                <Input type="number" min="1" max="5" value={formData.carryoverMaxYear} onChange={e => setFormData({ ...formData, carryoverMaxYear: parseInt(e.target.value) })} />
                <p className="text-xs text-slate-500 mt-1">Years before carried-over hours expire</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Automation Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Deduct from Timesheet</Label>
                <p className="text-xs text-slate-500">Automatically deduct PTO hours when approved</p>
              </div>
              <Switch checked={formData.autoDeductFromTimesheet} onCheckedChange={c => setFormData({ ...formData, autoDeductFromTimesheet: c })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Track by Calendar Year</Label>
                <p className="text-xs text-slate-500">Track PTO accruals by calendar year (vs. hire date anniversary)</p>
              </div>
              <Switch checked={formData.trackByYear} onCheckedChange={c => setFormData({ ...formData, trackByYear: c })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Accrual Preview</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="font-medium text-sm">Full-Time (40 hrs/week)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-blue-50 rounded-lg text-center"><p className="text-2xl font-bold text-blue-700">{(formData.fullTime.accrualPerHour * 40 * 52).toFixed(0)}</p><p className="text-xs text-slate-600">Hours/Year</p></div>
                  <div className="p-3 bg-purple-50 rounded-lg text-center"><p className="text-2xl font-bold text-purple-700">{(formData.fullTime.accrualPerHour * 40 * 52 / 8).toFixed(1)}</p><p className="text-xs text-slate-600">Days/Year</p></div>
                </div>
              </div>
              <div className="space-y-3">
                <p className="font-medium text-sm">Part-Time (20 hrs/week)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-green-50 rounded-lg text-center"><p className="text-2xl font-bold text-green-700">{(formData.partTime.accrualPerHour * 20 * 52).toFixed(0)}</p><p className="text-xs text-slate-600">Hours/Year</p></div>
                  <div className="p-3 bg-amber-50 rounded-lg text-center"><p className="text-2xl font-bold text-amber-700">{(formData.partTime.accrualPerHour * 20 * 52 / 8).toFixed(1)}</p><p className="text-xs text-slate-600">Days/Year</p></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={() => updateSettingsMutation.mutate(formData)} disabled={updateSettingsMutation.isLoading} className="w-full bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]">
          <Save className="w-4 h-4 mr-2" />
          {updateSettingsMutation.isLoading ? "Saving..." : "Save PTO Settings"}
        </Button>
      </div>
    </div>
  );
}