import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, Type, Zap } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";
import {
  getEffectiveTheme,
  setManualTheme,
  getEffectiveReduceMotion,
  setManualReduceMotion,
  applyReduceMotion,
} from "@/components/shared/ThemeManager";

const FONT_SIZE_MAP = { default: "100%", large: "115%", xlarge: "130%" };

function applyHighContrast(value) {
  document.documentElement.classList.toggle("high-contrast", value);
}

function applyColorblindMode(mode) {
  document.documentElement.classList.remove(
    "colorblind-protanopia", "colorblind-deuteranopia", "colorblind-tritanopia"
  );
  if (mode !== "none") document.documentElement.classList.add(`colorblind-${mode}`);
}

export default function Accessibility() {
  const [settings, setSettings] = useState({
    darkMode: false,
    reduceMotion: false,
    highContrast: false,
    fontSize: "default",
    colorblindMode: "none",
  });

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("nps_accessibility") || "{}");

    const merged = {
      darkMode: getEffectiveTheme() === "dark",
      reduceMotion: getEffectiveReduceMotion(), // reads override OR system setting
      highContrast: saved.highContrast ?? false,
      fontSize: saved.fontSize ?? "default",
      colorblindMode: saved.colorblindMode ?? "none",
    };
    setSettings(merged);

    // Apply persisted non-theme settings on mount
    document.documentElement.style.fontSize = FONT_SIZE_MAP[merged.fontSize] || "100%";
    applyHighContrast(merged.highContrast);
    applyColorblindMode(merged.colorblindMode);

    // Stay in sync if system settings change while page is open
    const onTheme = () => setSettings(s => ({ ...s, darkMode: getEffectiveTheme() === "dark" }));
    const onMotion = () => setSettings(s => ({ ...s, reduceMotion: getEffectiveReduceMotion() }));
    window.addEventListener("nps-theme-changed", onTheme);
    window.addEventListener("nps-motion-changed", onMotion);
    return () => {
      window.removeEventListener("nps-theme-changed", onTheme);
      window.removeEventListener("nps-motion-changed", onMotion);
    };
  }, []);

  const update = (key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };

      if (key === "darkMode") {
        setManualTheme(value ? "dark" : "light");
      }
      if (key === "reduceMotion") {
        setManualReduceMotion(value);
      }
      if (key === "highContrast") {
        applyHighContrast(value);
      }
      if (key === "fontSize") {
        document.documentElement.style.fontSize = FONT_SIZE_MAP[value] || "100%";
      }
      if (key === "colorblindMode") {
        applyColorblindMode(value);
      }

      // Persist everything except darkMode (handled by ThemeManager)
      const { darkMode, reduceMotion, ...rest } = next;
      localStorage.setItem("nps_accessibility", JSON.stringify(rest));

      return next;
    });
  };

  const toggle = (key) => update(key, !settings[key]);

  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const systemPrefersReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const saveMutation = useMutation({
    mutationFn: () => base44.auth.updateMe({ accessibility: settings }),
    onSuccess: () => toast.success("Accessibility settings saved"),
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <PageHeader
        title="Accessibility"
        subtitle="Customize the app to meet your visual and motion needs"
        showBack
      />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Vision */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-500" aria-hidden="true" />
              Vision
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-sm">Dark Mode</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {systemPrefersDark
                    ? "Auto-enabled from your system setting. Toggle to override."
                    : "Switch to a dark color scheme (gold on navy)"}
                </p>
              </div>
              <Switch
                checked={settings.darkMode}
                onCheckedChange={() => toggle("darkMode")}
                aria-label="Toggle dark mode"
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-sm">High Contrast</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Increase contrast between text and backgrounds
                </p>
              </div>
              <Switch
                checked={settings.highContrast}
                onCheckedChange={() => toggle("highContrast")}
                aria-label="Toggle high contrast mode"
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-sm">Color-Blind Mode</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Apply a color filter to help distinguish status colors
                </p>
              </div>
              <Select
                value={settings.colorblindMode}
                onValueChange={(v) => update("colorblindMode", v)}
              >
                <SelectTrigger className="w-48" aria-label="Color blind mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="protanopia">Protanopia (red-blind)</SelectItem>
                  <SelectItem value="deuteranopia">Deuteranopia (green-blind)</SelectItem>
                  <SelectItem value="tritanopia">Tritanopia (blue-blind)</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </CardContent>
        </Card>

        {/* Text Size */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Type className="w-4 h-4 text-slate-500" aria-hidden="true" />
              Text Size
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Font Size</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  All text scales proportionally using rem units
                </p>
              </div>
              <Select
                value={settings.fontSize}
                onValueChange={(v) => update("fontSize", v)}
              >
                <SelectTrigger className="w-44" aria-label="Font size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default (100%)</SelectItem>
                  <SelectItem value="large">Large (115%)</SelectItem>
                  <SelectItem value="xlarge">Extra Large (130%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Preview: Dashboard · Scheduling · Directory · Forms</p>
            </div>
          </CardContent>
        </Card>

        {/* Motion */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-slate-500" aria-hidden="true" />
              Motion &amp; Animation
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Reduce Motion</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {systemPrefersReduceMotion
                    ? "Auto-enabled from your system Reduce Motion setting. Toggle to override."
                    : "Disables page transitions, loading spinners, and chart animations"}
                </p>
              </div>
              <Switch
                checked={settings.reduceMotion}
                onCheckedChange={() => toggle("reduceMotion")}
                aria-label="Toggle reduce motion"
              />
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full bg-[#0b1f3a] hover:bg-[#1a2f4a] dark:bg-[#c9a84c] dark:text-[#0b1f3a] dark:hover:bg-[#dbb85c]"
        >
          {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Accessibility Settings
        </Button>
      </div>
    </div>
  );
}