import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Globe, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
];

export default function LanguageSettings() {
  const [selected, setSelected] = useState("en");

  const saveMutation = useMutation({
    mutationFn: () => base44.auth.updateMe({ preferred_language: selected }),
    onSuccess: () => toast.success("Language preference saved"),
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Language Settings" subtitle="Choose your preferred language" showBack />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Select Language
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelected(lang.code)}
                className="w-full flex items-center justify-between py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="font-medium">{lang.label}</span>
                </div>
                {selected === lang.code && (
                  <Check className="w-5 h-5 text-[#c9a227]" />
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full mt-6 bg-[#1a2b4a]"
        >
          {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Language
        </Button>
      </div>
    </div>
  );
}