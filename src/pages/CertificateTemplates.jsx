import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Award, Upload, Loader2, Save, Eye, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const SETTING_KEY = "certificate_template";
const DEFAULT_CONFIG = {
  template_url: "", name_x: 50, name_y: 52, name_font_size: 28, name_color: "#1a2b4a",
  course_x: 50, course_y: 62, course_font_size: 16, course_color: "#4a4a4a",
  date_x: 50, date_y: 70, date_font_size: 14, date_color: "#4a4a4a",
  score_x: 50, score_y: 76, score_font_size: 14, score_color: "#4a4a4a",
};

export default function CertificateTemplates() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [settingsId, setSettingsId] = useState(null);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [previewMode, setPreviewMode] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ["app-settings", SETTING_KEY],
    queryFn: async () => {
      const all = await base44.entities.AppSettings.list();
      const existing = all.find(s => s.setting_key === SETTING_KEY);
      if (existing) { setSettingsId(existing.id); setConfig({ ...DEFAULT_CONFIG, ...(existing.certificate_template || {}) }); return existing; }
      return null;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { setting_key: SETTING_KEY, certificate_template: config };
      if (settingsId) return base44.entities.AppSettings.update(settingsId, payload);
      return base44.entities.AppSettings.create(payload);
    },
    onSuccess: (data) => {
      if (!settingsId && data?.id) setSettingsId(data.id);
      queryClient.invalidateQueries(["app-settings"]);
      toast.success("Certificate template saved");
    }
  });

  const handleTemplateUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setConfig(c => ({ ...c, template_url: file_url }));
      toast.success("Template uploaded successfully");
    } catch { toast.error("Failed to upload template"); } finally { setUploading(false); }
  };

  const field = (key, label, type = "number") => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={config[key]} onChange={e => setConfig(c => ({ ...c, [key]: type === "number" ? parseFloat(e.target.value) : e.target.value }))} className="h-8 text-sm" />
    </div>
  );

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Certificate Templates" subtitle="Upload and configure completion certificate templates" showBack />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Award className="w-6 h-6 text-[#c9a227]" />
              <div>
                <CardTitle>Certificate Template Image</CardTitle>
                <CardDescription>Upload a PNG or JPG certificate background. The app will overlay the trainee's name and course info on top.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              {config.template_url ? (
                <div className="relative group">
                  <img src={config.template_url} alt="Certificate Template" className="w-64 h-44 object-contain border rounded-lg bg-white p-1 shadow" />
                  <button onClick={() => setConfig(c => ({ ...c, template_url: "" }))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-64 h-44 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-white">
                  <div className="text-center text-slate-400"><Award className="w-8 h-8 mx-auto mb-2" /><p className="text-sm">No template uploaded</p></div>
                </div>
              )}
              <div className="flex-1 space-y-3">
                <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleTemplateUpload} className="hidden" id="cert-upload" />
                <label htmlFor="cert-upload">
                  <Button variant="outline" asChild disabled={uploading}>
                    <span>{uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}{uploading ? "Uploading..." : "Upload Template"}</span>
                  </Button>
                </label>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-800">Use a landscape image (e.g. 1056×816px). Leave blank space where you want the text placed. Positions below are expressed as <strong>% from the left/top</strong> of the image.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Text Placement Configuration</CardTitle>
            <CardDescription>Set the X/Y position (as % of image size) and font size for each text element overlaid on the certificate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              { label: "Recipient Name", badge: <Badge className="bg-[#1a2b4a]">1</Badge>, prefix: "name" },
              { label: "Course Title", badge: <Badge className="bg-[#c9a227] text-[#1a2b4a]">2</Badge>, prefix: "course" },
              { label: "Completion Date", badge: <Badge variant="outline">3</Badge>, prefix: "date" },
              { label: "Final Score", badge: <Badge variant="outline">4</Badge>, prefix: "score" },
            ].map(({ label, badge, prefix }) => (
              <div key={prefix} className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">{badge} {label}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {field(`${prefix}_x`, "X Position (%)")}
                  {field(`${prefix}_y`, "Y Position (%)")}
                  {field(`${prefix}_font_size`, "Font Size (px)")}
                  {field(`${prefix}_color`, "Color", "color")}
                </div>
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-[#1a2b4a] hover:bg-[#2d4a6f]">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Save Template Config
              </Button>
            </div>
          </CardContent>
        </Card>

        {config.template_url && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle className="text-base">Live Preview</CardTitle><CardDescription>How the certificate will look with sample data</CardDescription></div>
                <Button variant="outline" size="sm" onClick={() => setPreviewMode(!previewMode)}><Eye className="w-4 h-4 mr-2" />{previewMode ? "Hide" : "Show"} Preview</Button>
              </div>
            </CardHeader>
            {previewMode && (
              <CardContent>
                <div className="relative w-full overflow-hidden rounded-lg border shadow">
                  <img src={config.template_url} alt="Certificate Preview" className="w-full" />
                  <div className="absolute inset-0">
                    {[
                      { key: "name", text: "John Doe", extra: { paddingLeft: `${config.name_x}%`, paddingRight: `${100 - config.name_x}%` } },
                      { key: "course", text: "De-Escalation Techniques" },
                      { key: "date", text: `Completed: ${new Date().toLocaleDateString()}` },
                      { key: "score", text: "Final Score: 95%" },
                    ].map(({ key, text, extra }) => (
                      <div key={key} className="absolute w-full text-center" style={{ top: `${config[`${key}_y`]}%`, fontSize: `${config[`${key}_font_size`]}px`, color: config[`${key}_color`], ...extra }}>{text}</div>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}