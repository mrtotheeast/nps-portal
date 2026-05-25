import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";

const DEFAULT_PREFS = {
  schedule_changes: true,
  shift_reminders: true,
  pto_updates: true,
  incident_alerts: true,
  training_reminders: true,
  emergency_alerts: true,
  payroll_notifications: false,
  chat_messages: true,
};

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  const saveMutation = useMutation({
    mutationFn: () => base44.auth.updateMe({ notification_preferences: prefs }),
    onSuccess: () => toast.success("Preferences saved"),
  });

  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

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
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Notification Preferences" subtitle="Control which alerts you receive" showBack />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Alert Settings
            </CardTitle>
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
          className="w-full mt-6 bg-[#1a2b4a]"
        >
          {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}