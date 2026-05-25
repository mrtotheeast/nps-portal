import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";

const SETTING_KEY = "timekeeping_security";

export default function TimekeepingSecuritySettings() {
  const queryClient = useQueryClient();
  const [settingId, setSettingId] = useState(null);
  const [settings, setSettings] = useState({
    require_photo: false,
    geofence_enabled: false,
    geofence_radius: 50,
    allow_manual_entry: false,
  });

  const { isLoading } = useQuery({
    queryKey: ["timekeeping-settings"],
    queryFn: async () => {
      const all = await base44.entities.AppSettings.list();
      const s = all.find(r => r.setting_key === SETTING_KEY);
      if (s) {
        setSettingId(s.id);
        try { setSettings(JSON.parse(s.setting_value)); } catch {}
      }
      return s || null;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        setting_key: SETTING_KEY,
        setting_value: JSON.stringify(settings),
        setting_type: "string",
        category: "timekeeping",
        description: "Timekeeping security settings",
      };
      if (settingId) {
        return base44.entities.AppSettings.update(settingId, payload);
      } else {
        const created = await base44.entities.AppSettings.create(payload);
        setSettingId(created.id);
        return created;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["timekeeping-settings"]);
      toast.success("Settings saved successfully");
    },
    onError: (err) => toast.error(`Failed to save: ${err.message}`),
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Timekeeping & Security" subtitle="Configure clocking and security features" />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="font-medium">Require Photo at Clock In</Label>
                <p className="text-sm text-slate-500 mt-1">Employees must take a photo when clocking in</p>
              </div>
              <Switch
                checked={settings.require_photo}
                onCheckedChange={(checked) => setSettings({ ...settings, require_photo: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="font-medium">Geofence Enforcement</Label>
                <p className="text-sm text-slate-500 mt-1">Require employees to be at the assigned site</p>
              </div>
              <Switch
                checked={settings.geofence_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, geofence_enabled: checked })}
              />
            </div>

            {settings.geofence_enabled && (
              <div>
                <Label>Geofence Radius (meters)</Label>
                <Input
                  type="number"
                  value={settings.geofence_radius}
                  onChange={(e) => setSettings({ ...settings, geofence_radius: parseInt(e.target.value) })}
                  min="10"
                  max="500"
                />
              </div>
            )}

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="font-medium">Allow Manual Time Entry</Label>
                <p className="text-sm text-slate-500 mt-1">Supervisors can manually add time entries</p>
              </div>
              <Switch
                checked={settings.allow_manual_entry}
                onCheckedChange={(checked) => setSettings({ ...settings, allow_manual_entry: checked })}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                className="bg-[#1a2b4a]"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}