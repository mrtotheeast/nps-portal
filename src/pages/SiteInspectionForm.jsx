import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ClipboardList, Camera, PenLine, Check, Loader2, Plus, X, MapPin, AlertTriangle, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import ChecklistItem from "@/components/checklist/ChecklistItem";
import SignaturePad from "@/components/checklist/SignaturePad";

const DEFAULT_TEMPLATES = {
  site_inspection: [
    { category: "Perimeter", label: "Perimeter fence/walls intact", requires_photo: false },
    { category: "Perimeter", label: "All gates secured properly", requires_photo: true },
    { category: "Perimeter", label: "Lighting operational on all sides", requires_photo: false },
    { category: "Access Points", label: "Main entrance secured", requires_photo: false },
    { category: "Access Points", label: "Emergency exits unobstructed", requires_photo: true },
    { category: "Interior", label: "All interior lights functional", requires_photo: false },
    { category: "Interior", label: "No signs of unauthorized entry", requires_photo: false },
    { category: "Safety", label: "Fire extinguishers in place", requires_photo: false },
    { category: "Safety", label: "First aid kit accessible", requires_photo: false },
    { category: "Equipment", label: "Surveillance cameras operational", requires_photo: false },
    { category: "Equipment", label: "Alarm systems armed/functional", requires_photo: false },
  ],
  patrol_verification: [
    { category: "Start of Patrol", label: "Signed in at post", requires_photo: false },
    { category: "Start of Patrol", label: "Equipment checked and functional", requires_photo: false },
    { category: "Route Check", label: "Zone A checked", requires_photo: true },
    { category: "Route Check", label: "Zone B checked", requires_photo: true },
    { category: "Route Check", label: "Zone C checked", requires_photo: false },
    { category: "Incidents", label: "No suspicious activity observed", requires_photo: false },
    { category: "Incidents", label: "Hazards reported/addressed", requires_photo: false },
    { category: "End of Patrol", label: "All checkpoints scanned", requires_photo: false },
    { category: "End of Patrol", label: "Handoff completed", requires_photo: false },
  ],
  opening_check: [
    { category: "Security", label: "Alarm disarmed properly", requires_photo: false },
    { category: "Security", label: "All locks inspected", requires_photo: false },
    { category: "Facilities", label: "Utilities operational", requires_photo: false },
    { category: "Facilities", label: "Parking lot clear of hazards", requires_photo: true },
    { category: "Staff", label: "Staff sign-in log started", requires_photo: false },
  ],
  closing_check: [
    { category: "Security", label: "All doors/windows locked", requires_photo: false },
    { category: "Security", label: "Alarm armed", requires_photo: false },
    { category: "Facilities", label: "All lights turned off", requires_photo: false },
    { category: "Staff", label: "All personnel accounted for", requires_photo: false },
    { category: "Staff", label: "Final sign-out log completed", requires_photo: false },
  ],
};

export default function SiteInspectionForm() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sites, setSites] = useState([]);
  const [step, setStep] = useState("setup");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    type: "site_inspection",
    site_id: "",
    site_name: "",
    items: [],
    photos: [],
    notes: "",
    signature_url: "",
  });

  const [overallPhotos, setOverallPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("idle");
  const [gpsDistance, setGpsDistance] = useState(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverride, setShowOverride] = useState(false);

  const DEFAULT_RADIUS = 200;

  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const checkGeofence = () => {
    const site = sites.find((s) => s.id === form.site_id);
    if (!site || !site.geofence?.latitude || !site.geofence?.longitude) {
      setGpsStatus("no_site");
      return;
    }
    setGpsStatus("checking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = haversineDistance(
          pos.coords.latitude,
          pos.coords.longitude,
          site.geofence.latitude,
          site.geofence.longitude
        );
        const radius = site.geofence.radius_meters || DEFAULT_RADIUS;
        setGpsDistance(Math.round(dist));
        if (dist <= radius) {
          setGpsStatus("inside");
          setShowOverride(false);
        } else {
          setGpsStatus("outside");
          setShowOverride(true);
        }
      },
      () => setGpsStatus("error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [currentUser, sitesData] = await Promise.all([
      base44.auth.me(),
      base44.entities.Site.list(),
    ]);
    setUser(currentUser);
    setSites(sitesData || []);
  };

  const startChecklist = () => {
    if (!form.title || !form.type) return;
    const site = sites.find((s) => s.id === form.site_id);
    if (site && site.geofence?.latitude && site.geofence?.longitude) {
      if (gpsStatus !== "inside" && gpsStatus !== "no_site") {
        if (gpsStatus === "outside" && !overrideReason.trim()) return;
        if (gpsStatus === "idle" || gpsStatus === "error") {
          checkGeofence();
          return;
        }
      }
    }
    const template = DEFAULT_TEMPLATES[form.type] || DEFAULT_TEMPLATES.site_inspection;
    const items = template.map((t, i) => ({
      id: `item_${i}`,
      ...t,
      checked: false,
      notes: "",
      photo_urls: [],
      flagged: false,
    }));
    setForm((f) => ({ ...f, items, location_override_reason: overrideReason || null, gps_distance_meters: gpsDistance }));
    setStep("checklist");
  };

  const updateItem = (idx, updated) => {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = updated;
      return { ...f, items };
    });
  };

  const addCustomItem = () => {
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        { id: `custom_${Date.now()}`, label: "Custom item", category: "Other", checked: false, notes: "", photo_urls: [], flagged: false },
      ],
    }));
  };

  const handleOverallPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setOverallPhotos((p) => [...p, { url: file_url, caption: "", uploaded_at: new Date().toISOString() }]);
    setUploadingPhoto(false);
  };

  const submit = async () => {
    setSaving(true);
    await base44.entities.SiteInspectionChecklist.create({
      ...form,
      officer_id: user?.id,
      officer_name: user?.full_name,
      photos: overallPhotos,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    });
    setSaving(false);
    navigate(createPageUrl("SiteInspections"));
  };

  const checkedCount = form.items.filter((i) => i.checked).length;
  const flaggedCount = form.items.filter((i) => i.flagged).length;
  const categories = [...new Set(form.items.map((i) => i.category))];

  const grouped = categories.reduce((acc, cat) => {
    acc[cat] = form.items.filter((i) => i.category === cat);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Site Inspection"
        subtitle={step === "setup" ? "Configure checklist" : step === "checklist" ? `${checkedCount}/${form.items.length} completed` : step === "signature" ? "Sign off" : "Review & Submit"}
        showBack
      />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {step !== "setup" && (
          <div className="flex gap-2 mb-2">
            {["setup", "checklist", "signature", "review"].map((s, i) => (
              <div key={s} className={`flex-1 h-1.5 rounded-full ${["setup","checklist","signature","review"].indexOf(step) >= i ? "bg-[#c9a227]" : "bg-slate-200"}`} />
            ))}
          </div>
        )}

        {step === "setup" && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5" /> New Checklist</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Checklist Title *</Label>
                <Input placeholder="e.g. Morning Site Inspection" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="site_inspection">Site Inspection</SelectItem>
                    <SelectItem value="patrol_verification">Patrol Verification</SelectItem>
                    <SelectItem value="opening_check">Opening Check</SelectItem>
                    <SelectItem value="closing_check">Closing Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Site (optional)</Label>
                <Select value={form.site_id} onValueChange={(v) => {
                  const site = sites.find((s) => s.id === v);
                  setForm((f) => ({ ...f, site_id: v, site_name: site?.name || "" }));
                  setGpsStatus("idle");
                  setGpsDistance(null);
                  setShowOverride(false);
                  setOverrideReason("");
                }}>
                  <SelectTrigger><SelectValue placeholder="Select site..." /></SelectTrigger>
                  <SelectContent>
                    {sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.site_id && (() => {
                const site = sites.find((s) => s.id === form.site_id);
                if (!site?.geofence?.latitude) return null;
                const radius = site.geofence.radius_meters || DEFAULT_RADIUS;
                return (
                  <div className="space-y-3">
                    <div className={`rounded-lg border p-3 flex items-start gap-3 ${
                      gpsStatus === "inside" ? "border-emerald-300 bg-emerald-50" :
                      gpsStatus === "outside" ? "border-amber-300 bg-amber-50" :
                      gpsStatus === "error" ? "border-red-300 bg-red-50" :
                      "border-slate-200 bg-slate-50"
                    }`}>
                      <div className="mt-0.5">
                        {gpsStatus === "checking" && <Loader2 className="w-4 h-4 animate-spin text-slate-500" />}
                        {gpsStatus === "inside" && <MapPin className="w-4 h-4 text-emerald-600" />}
                        {(gpsStatus === "outside") && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                        {(gpsStatus === "error") && <AlertTriangle className="w-4 h-4 text-red-500" />}
                        {(gpsStatus === "idle") && <Navigation className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div className="flex-1 text-sm">
                        {gpsStatus === "idle" && <p className="text-slate-600">Tap below to verify your location at <strong>{site.name}</strong> (within {radius}m).</p>}
                        {gpsStatus === "checking" && <p className="text-slate-600">Getting your GPS location...</p>}
                        {gpsStatus === "inside" && <p className="text-emerald-700 font-medium">✓ You are within the site ({gpsDistance}m from center)</p>}
                        {gpsStatus === "outside" && <p className="text-amber-700 font-medium">You are {gpsDistance}m from {site.name} (limit: {radius}m). An override reason is required.</p>}
                        {gpsStatus === "error" && <p className="text-red-700">Could not get GPS location. Please enable location access.</p>}
                      </div>
                      {(gpsStatus === "idle" || gpsStatus === "error") && (
                        <Button size="sm" variant="outline" onClick={checkGeofence} className="shrink-0">Check GPS</Button>
                      )}
                      {gpsStatus !== "idle" && gpsStatus !== "checking" && (
                        <Button size="sm" variant="ghost" onClick={checkGeofence} className="shrink-0 text-xs">Retry</Button>
                      )}
                    </div>
                    {showOverride && (
                      <div>
                        <Label className="text-amber-700">Override Reason *</Label>
                        <Textarea
                          placeholder="Explain why you are outside the site boundary..."
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          className="mt-1 border-amber-300 focus:ring-amber-400"
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              <Button
                onClick={startChecklist}
                disabled={!form.title || (showOverride && !overrideReason.trim()) || gpsStatus === "checking"}
                className="w-full bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold h-12"
              >
                {gpsStatus === "checking" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Start Checklist →"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "checklist" && (
          <>
            <div className="flex gap-3">
              <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-emerald-700">{checkedCount}</p>
                <p className="text-xs text-emerald-600">Checked</p>
              </div>
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-slate-700">{form.items.length - checkedCount}</p>
                <p className="text-xs text-slate-500">Remaining</p>
              </div>
              {flaggedCount > 0 && (
                <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-red-600">{flaggedCount}</p>
                  <p className="text-xs text-red-500">Flagged</p>
                </div>
              )}
            </div>

            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{cat}</p>
                <div className="space-y-2">
                  {items.map((item) => {
                    const idx = form.items.findIndex((i) => i.id === item.id);
                    return <ChecklistItem key={item.id} item={item} onChange={(u) => updateItem(idx, u)} />;
                  })}
                </div>
              </div>
            ))}

            <Button variant="outline" className="w-full" onClick={addCustomItem}>
              <Plus className="w-4 h-4 mr-2" /> Add Custom Item
            </Button>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Camera className="w-4 h-4" /> Overall Photos</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {overallPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {overallPhotos.map((p, i) => (
                      <div key={i} className="relative">
                        <img src={p.url} className="w-20 h-20 object-cover rounded-lg border" />
                        <button onClick={() => setOverallPhotos((ps) => ps.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleOverallPhoto} />
                  <Button variant="outline" size="sm" asChild disabled={uploadingPhoto}>
                    <span><Camera className="w-4 h-4 mr-2" />{uploadingPhoto ? "Uploading..." : "Take / Upload Photo"}</span>
                  </Button>
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <Label>Overall Notes</Label>
                <Textarea
                  placeholder="Any additional observations..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="mt-1"
                />
              </CardContent>
            </Card>

            <Button onClick={() => setStep("signature")} className="w-full bg-[#1a2b4a] hover:bg-[#2d4a6f] text-white font-semibold h-12">
              Continue to Signature →
            </Button>
          </>
        )}

        {step === "signature" && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><PenLine className="w-5 h-5" /> Officer Signature</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-500">By signing, you certify that this inspection was conducted accurately.</p>
              <SignaturePad
                existingUrl={form.signature_url}
                onSave={(dataUrl) => setForm((f) => ({ ...f, signature_url: dataUrl }))}
              />
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("checklist")}>← Back</Button>
                <Button
                  className="flex-1 bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold"
                  onClick={() => setStep("review")}
                  disabled={!form.signature_url}
                >
                  Review →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "review" && (
          <>
            <Card>
              <CardHeader><CardTitle>Review Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-500">Title:</span> <span className="font-medium">{form.title}</span></div>
                  <div><span className="text-slate-500">Type:</span> <Badge variant="outline">{form.type.replace("_", " ")}</Badge></div>
                  {form.site_name && <div><span className="text-slate-500">Site:</span> <span className="font-medium">{form.site_name}</span></div>}
                  <div><span className="text-slate-500">Officer:</span> <span className="font-medium">{user?.full_name}</span></div>
                </div>
                <div className="flex gap-3 pt-2">
                  <div className="flex-1 bg-emerald-50 rounded-lg p-3 text-center border border-emerald-200">
                    <p className="text-2xl font-bold text-emerald-700">{checkedCount}/{form.items.length}</p>
                    <p className="text-xs text-emerald-600">Items Checked</p>
                  </div>
                  {flaggedCount > 0 && (
                    <div className="flex-1 bg-red-50 rounded-lg p-3 text-center border border-red-200">
                      <p className="text-2xl font-bold text-red-600">{flaggedCount}</p>
                      <p className="text-xs text-red-500">Flagged Issues</p>
                    </div>
                  )}
                  <div className="flex-1 bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                    <p className="text-2xl font-bold text-slate-700">{overallPhotos.length}</p>
                    <p className="text-xs text-slate-500">Photos</p>
                  </div>
                </div>
                {flaggedCount > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-700 mb-2">⚠️ Flagged Items</p>
                    <ul className="space-y-1">
                      {form.items.filter((i) => i.flagged).map((i) => (
                        <li key={i.id} className="text-sm text-red-600">• {i.label}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {form.signature_url && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Signature</p>
                    <img src={form.signature_url} className="h-16 border rounded bg-white p-1" alt="signature" />
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("signature")}>← Back</Button>
              <Button onClick={submit} disabled={saving} className="flex-1 bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold h-12">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5 mr-2" /> Submit Report</>}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}