import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";

export default function UserPreferences() {
  const [prefs, setPrefs] = useState({
    darkMode: false,
    compactView: false,
    showAnimations: true,
    timeFormat: "12h",
    dateFormat: "MM/DD/YYYY",
    defaultView: "list",
  });

  const saveMutation = useMutation({
    mutationFn: () => base44.auth.updateMe({ preferences: prefs }),
    onSuccess: () => toast.success("Preferences saved"),
  });

  useEffect(() => {
    const stored = localStorage.getItem("nps_dark_mode");
    if (stored !== null) {
      const isDark = stored === "true";
      setPrefs((p) => ({ ...p, darkMode: isDark }));
      document.documentElement.classList.toggle("dark", isDark);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setPrefs((p) => ({ ...p, darkMode: prefersDark }));
      document.documentElement.classList.toggle("dark", prefersDark);
    }
  }, []);

  const toggle = (key) => {
    setPrefs((p) => {
      const next = { ...p, [key]: !p[key] };
      if (key === "darkMode") {
        document.documentElement.classList.toggle("dark", next.darkMode);
        localStorage.setItem("nps_dark_mode", String(next.darkMode));
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="User Preferences" subtitle="Customize your app experience" showBack />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Display</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {[
              { key: "darkMode", label: "Dark Mode", desc: "Use dark color scheme" },
              { key: "compactView", label: "Compact View", desc: "Show more items with less spacing" },
              { key: "showAnimations", label: "Animations", desc: "Enable UI animations and transitions" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
                <Switch checked={prefs[key]} onCheckedChange={() => toggle(key)} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Formatting</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Time Format</Label>
              <Select value={prefs.timeFormat} onValueChange={(v) => setPrefs({ ...prefs, timeFormat: v })}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12-hour</SelectItem>
                  <SelectItem value="24h">24-hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label>Date Format</Label>
              <Select value={prefs.dateFormat} onValueChange={(v) => setPrefs({ ...prefs, dateFormat: v })}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label>Default View</Label>
              <Select value={prefs.defaultView} onValueChange={(v) => setPrefs({ ...prefs, defaultView: v })}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="grid">Grid</SelectItem>
                  <SelectItem value="calendar">Calendar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full bg-[#1a2b4a]"
        >
          {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}