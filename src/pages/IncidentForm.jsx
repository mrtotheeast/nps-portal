import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Save, Send, Loader2, Plus, Trash2, Camera, AlertTriangle, Upload, Video, Sparkles, X, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import LocationMapPicker from "@/components/shared/LocationMapPicker";
import BottomSheet from "@/components/mobile/BottomSheet";
import OfflineSyncBanner from "@/components/offline/OfflineSyncBanner";
import { saveOffline, saveOfflinePhoto, getUnsyncedItems, STORES } from "@/components/utils/offlineStorage";
import { toast } from "sonner";

const INCIDENT_TYPES = [
  { value: "theft", label: "Theft" }, { value: "assault", label: "Assault" }, { value: "vandalism", label: "Vandalism" },
  { value: "trespassing", label: "Trespassing" }, { value: "medical", label: "Medical Emergency" }, { value: "fire", label: "Fire" },
  { value: "suspicious_activity", label: "Suspicious Activity" }, { value: "other", label: "Other" },
];

const STEPS = ["Basic Info", "Description", "Complainants", "Suspects", "Property", "Injuries", "Notifications", "Evidence", "Review"];

const DEFAULT_FORM = {
  incident_date: format(new Date(), "yyyy-MM-dd"),
  incident_time: format(new Date(), "HH:mm"),
  incident_type: "", severity: "medium", description: "", tags: [],
  complainants: [], suspects: [], vehicles: [],
  property_damage: { has_damage: false, description: "", estimated_value: 0, owner_info: "" },
  injuries: { has_injuries: false, who_injured: "", nature_of_injuries: "", medical_treatment: false, hospital_name: "" },
  notifications: { police_notified: false, police_case_number: "", police_officer_name: "", ems_notified: false, ems_unit_number: "", supervisor_notified: false, supervisor_name: "", supervisor_time: "" },
  multimedia_evidence: [], status: "draft"
};

export default function IncidentForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [formData, setFormData] = useState(DEFAULT_FORM);

  const offlineIncidentId = React.useRef(`offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`).current;
  const incidentId = new URLSearchParams(window.location.search).get("id");

  useEffect(() => {
    base44.auth.me().then(setUser);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    getUnsyncedItems(STORES.incidents).then(items => setPendingCount(items.length));
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  const { data: existingIncident, isLoading } = useQuery({
    queryKey: ["incident", incidentId],
    queryFn: async () => { const incidents = await base44.entities.Incident.filter({ id: incidentId }); return incidents[0]; },
    enabled: !!incidentId,
  });

  const { data: sites = [] } = useQuery({ queryKey: ["sites"], queryFn: () => base44.entities.Site.filter({ status: "active" }) });

  useEffect(() => {
    if (existingIncident) setFormData({ ...DEFAULT_FORM, ...existingIncident, incident_date: existingIncident.incident_date || DEFAULT_FORM.incident_date, incident_time: existingIncident.incident_time || DEFAULT_FORM.incident_time });
  }, [existingIncident]);

  const saveMutation = useMutation({
    mutationFn: (data) => incidentId ? base44.entities.Incident.update(incidentId, data) : base44.entities.Incident.create({ ...data, reporter_id: user.id }),
    onSuccess: () => { queryClient.invalidateQueries(["incidents"]); toast.success(incidentId ? 'Incident updated' : 'Incident created'); navigate(createPageUrl("IncidentReports")); },
    onError: () => toast.error('Failed to save incident')
  });

  const handleSaveDraft = async () => {
    setSaving(true);
    if (!isOnline) {
      await saveOffline(STORES.incidents, { ...formData, status: "draft", reporter_id: user?.id, offlineId: offlineIncidentId });
      const pending = await getUnsyncedItems(STORES.incidents);
      setPendingCount(pending.length);
    } else {
      await saveMutation.mutateAsync({ ...formData, status: "draft" });
    }
    setSaving(false);
  };

  const handleSubmit = async () => {
    setSaving(true);
    if (!isOnline) {
      await saveOffline(STORES.incidents, { ...formData, status: "pending", reporter_id: user?.id, offlineId: offlineIncidentId, multimedia_evidence: (formData.multimedia_evidence || []).filter(m => !m._isOfflineBlob) });
      const pending = await getUnsyncedItems(STORES.incidents);
      setPendingCount(pending.length);
      setSaving(false);
      navigate(createPageUrl("IncidentReports"));
      return;
    }
    await saveMutation.mutateAsync({ ...formData, status: "pending" });
    setSaving(false);
  };

  const getSuggestions = async () => {
    if (!formData.description) return;
    setLoadingSuggestions(true);
    try {
      const res = await base44.functions.invoke('suggestIncidentTags', { description: formData.description, incident_type: formData.incident_type });
      setAiSuggestions(res.data.suggestions);
    } catch (e) { console.error(e); } finally { setLoadingSuggestions(false); }
  };

  const applySuggestions = () => {
    if (aiSuggestions) { setFormData({ ...formData, tags: aiSuggestions.tags || [], severity: aiSuggestions.severity || formData.severity }); setAiSuggestions(null); }
  };

  const handleMediaUpload = async (files) => {
    setUploadingMedia(true);
    const newMedia = [];
    for (const file of files) {
      if (!isOnline) {
        await saveOfflinePhoto(offlineIncidentId, file, '');
        newMedia.push({ type: file.type.startsWith('video/') ? 'video' : 'photo', url: URL.createObjectURL(file), caption: '', uploaded_at: new Date().toISOString(), _isOfflineBlob: true });
      } else {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        newMedia.push({ type: file.type.startsWith('video/') ? 'video' : 'photo', url: file_url, caption: '', uploaded_at: new Date().toISOString() });
      }
    }
    setFormData(prev => ({ ...prev, multimedia_evidence: [...(prev.multimedia_evidence || []), ...newMedia] }));
    setUploadingMedia(false);
  };

  const updateComplainant = (index, field, value) => { const arr = [...formData.complainants]; arr[index][field] = value; setFormData({ ...formData, complainants: arr }); };
  const updateSuspect = (index, field, value) => { const arr = [...formData.suspects]; arr[index][field] = value; setFormData({ ...formData, suspects: arr }); };

  if (isLoading) return <LoadingScreen />;

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Incident Date *</Label><Input type="date" value={formData.incident_date} onChange={e => setFormData({ ...formData, incident_date: e.target.value })} /></div>
              <div><Label>Incident Time *</Label><Input type="time" value={formData.incident_time} onChange={e => setFormData({ ...formData, incident_time: e.target.value })} /></div>
            </div>
            <div className="md:hidden"><Label>Location/Site</Label><BottomSheet trigger={<Button variant="outline" className="w-full justify-start min-h-[44px]">{formData.site_id ? sites.find(s => s.id === formData.site_id)?.name : "Select site..."}</Button>} title="Select Site" options={sites.map(s => ({ value: s.id, label: s.name }))} value={formData.site_id} onSelect={v => setFormData({ ...formData, site_id: v })} /></div>
            <div className="hidden md:block"><Label>Location/Site</Label><Select value={formData.site_id} onValueChange={v => setFormData({ ...formData, site_id: v })}><SelectTrigger><SelectValue placeholder="Select site..." /></SelectTrigger><SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="md:hidden"><Label>Incident Type *</Label><BottomSheet trigger={<Button variant="outline" className="w-full justify-start min-h-[44px]">{formData.incident_type ? INCIDENT_TYPES.find(t => t.value === formData.incident_type)?.label : "Select type..."}</Button>} title="Select Incident Type" options={INCIDENT_TYPES} value={formData.incident_type} onSelect={v => setFormData({ ...formData, incident_type: v })} /></div>
            <div className="hidden md:block"><Label>Incident Type *</Label><Select value={formData.incident_type} onValueChange={v => setFormData({ ...formData, incident_type: v })}><SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger><SelectContent>{INCIDENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Severity *</Label><Select value={formData.severity} onValueChange={v => setFormData({ ...formData, severity: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div>
            <LocationMapPicker
              label="Incident Location (GPS)"
              location={formData.location}
              onChange={(loc) => setFormData({ ...formData, location: loc })}
            />
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div><Label>Detailed Description *</Label><Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Describe what happened in detail..." className="min-h-[200px]" /></div>
            {formData.description?.length > 50 && <Button type="button" variant="outline" onClick={getSuggestions} disabled={loadingSuggestions} className="w-full">{loadingSuggestions ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}Get AI Suggestions</Button>}
            {aiSuggestions && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between"><h4 className="font-semibold text-blue-900">AI Suggestions</h4><Button size="sm" onClick={applySuggestions} className="bg-blue-600 hover:bg-blue-700">Apply All</Button></div>
                <div><Label className="text-blue-800">Suggested Tags:</Label><div className="flex flex-wrap gap-2 mt-2">{aiSuggestions.tags?.map((tag, idx) => <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{tag}</span>)}</div></div>
                <div><Label className="text-blue-800">Suggested Severity:</Label><p className="text-sm mt-1 capitalize font-medium">{aiSuggestions.severity}</p><p className="text-sm text-blue-700 mt-1">{aiSuggestions.reasoning}</p></div>
              </div>
            )}
            {formData.tags?.length > 0 && <div><Label>Tags</Label><div className="flex flex-wrap gap-2 mt-2">{formData.tags.map((tag, idx) => <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm flex items-center gap-2">{tag}<button type="button" onClick={() => setFormData({ ...formData, tags: formData.tags.filter((_, i) => i !== idx) })}><X className="w-3 h-3" /></button></span>)}</div></div>}
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Add people who reported or were affected by the incident</p>
            {formData.complainants.map((c, idx) => (
              <Card key={idx} className="p-4">
                <div className="flex justify-between items-start mb-3"><Label>Complainant #{idx + 1}</Label><Button variant="ghost" size="icon" onClick={() => setFormData({ ...formData, complainants: formData.complainants.filter((_, i) => i !== idx) })}><Trash2 className="w-4 h-4 text-red-500" /></Button></div>
                <div className="space-y-3">
                  <Input placeholder="Name" value={c.name} onChange={e => updateComplainant(idx, 'name', e.target.value)} />
                  <Input placeholder="Contact (phone/email)" value={c.contact} onChange={e => updateComplainant(idx, 'contact', e.target.value)} />
                  <Input placeholder="Relationship to incident" value={c.relationship} onChange={e => updateComplainant(idx, 'relationship', e.target.value)} />
                </div>
              </Card>
            ))}
            <Button variant="outline" onClick={() => setFormData({ ...formData, complainants: [...formData.complainants, { name: "", contact: "", relationship: "" }] })} className="w-full"><Plus className="w-4 h-4 mr-2" />Add Complainant</Button>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Add any suspects or persons of interest</p>
            {formData.suspects.map((s, idx) => (
              <Card key={idx} className="p-4">
                <div className="flex justify-between items-start mb-3"><Label>Suspect #{idx + 1}</Label><Button variant="ghost" size="icon" onClick={() => setFormData({ ...formData, suspects: formData.suspects.filter((_, i) => i !== idx) })}><Trash2 className="w-4 h-4 text-red-500" /></Button></div>
                <div className="space-y-3">
                  <Input placeholder="Name (if known)" value={s.name} onChange={e => updateSuspect(idx, 'name', e.target.value)} />
                  <Textarea placeholder="Description (height, weight, clothing, etc.)" value={s.description} onChange={e => updateSuspect(idx, 'description', e.target.value)} />
                  <Input placeholder="Direction fled" value={s.direction_fled} onChange={e => updateSuspect(idx, 'direction_fled', e.target.value)} />
                </div>
              </Card>
            ))}
            <Button variant="outline" onClick={() => setFormData({ ...formData, suspects: [...formData.suspects, { name: "", description: "", direction_fled: "", vehicle_info: "" }] })} className="w-full"><Plus className="w-4 h-4 mr-2" />Add Suspect</Button>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between"><div><Label>Was there property damage?</Label><p className="text-sm text-slate-500">Toggle if any property was damaged</p></div><Switch checked={formData.property_damage.has_damage} onCheckedChange={v => setFormData({ ...formData, property_damage: { ...formData.property_damage, has_damage: v } })} /></div>
            {formData.property_damage.has_damage && (
              <div className="space-y-4 pt-4 border-t">
                <div><Label>Description of Damage</Label><Textarea value={formData.property_damage.description} onChange={e => setFormData({ ...formData, property_damage: { ...formData.property_damage, description: e.target.value } })} placeholder="Describe the damage..." /></div>
                <div><Label>Estimated Value ($)</Label><Input type="number" value={formData.property_damage.estimated_value} onChange={e => setFormData({ ...formData, property_damage: { ...formData.property_damage, estimated_value: parseFloat(e.target.value) || 0 } })} /></div>
                <div><Label>Owner Information</Label><Input value={formData.property_damage.owner_info} onChange={e => setFormData({ ...formData, property_damage: { ...formData.property_damage, owner_info: e.target.value } })} placeholder="Name and contact of property owner" /></div>
              </div>
            )}
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between"><div><Label>Were there any injuries?</Label><p className="text-sm text-slate-500">Toggle if anyone was injured</p></div><Switch checked={formData.injuries.has_injuries} onCheckedChange={v => setFormData({ ...formData, injuries: { ...formData.injuries, has_injuries: v } })} /></div>
            {formData.injuries.has_injuries && (
              <div className="space-y-4 pt-4 border-t">
                <div><Label>Who was injured?</Label><Input value={formData.injuries.who_injured} onChange={e => setFormData({ ...formData, injuries: { ...formData.injuries, who_injured: e.target.value } })} /></div>
                <div><Label>Nature of Injuries</Label><Textarea value={formData.injuries.nature_of_injuries} onChange={e => setFormData({ ...formData, injuries: { ...formData.injuries, nature_of_injuries: e.target.value } })} /></div>
                <div className="flex items-center justify-between"><Label>Medical treatment required?</Label><Switch checked={formData.injuries.medical_treatment} onCheckedChange={v => setFormData({ ...formData, injuries: { ...formData.injuries, medical_treatment: v } })} /></div>
                {formData.injuries.medical_treatment && <div><Label>Hospital Name (if transported)</Label><Input value={formData.injuries.hospital_name} onChange={e => setFormData({ ...formData, injuries: { ...formData.injuries, hospital_name: e.target.value } })} /></div>}
              </div>
            )}
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><Label>Police Notified?</Label><Switch checked={formData.notifications.police_notified} onCheckedChange={v => setFormData({ ...formData, notifications: { ...formData.notifications, police_notified: v } })} /></div>
              {formData.notifications.police_notified && <div className="grid grid-cols-2 gap-4 pl-4 border-l-2"><div><Label>Case Number</Label><Input value={formData.notifications.police_case_number} onChange={e => setFormData({ ...formData, notifications: { ...formData.notifications, police_case_number: e.target.value } })} /></div><div><Label>Officer Name</Label><Input value={formData.notifications.police_officer_name} onChange={e => setFormData({ ...formData, notifications: { ...formData.notifications, police_officer_name: e.target.value } })} /></div></div>}
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between"><Label>EMS Notified?</Label><Switch checked={formData.notifications.ems_notified} onCheckedChange={v => setFormData({ ...formData, notifications: { ...formData.notifications, ems_notified: v } })} /></div>
              {formData.notifications.ems_notified && <div className="pl-4 border-l-2"><Label>EMS Unit Number</Label><Input value={formData.notifications.ems_unit_number} onChange={e => setFormData({ ...formData, notifications: { ...formData.notifications, ems_unit_number: e.target.value } })} /></div>}
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between"><Label>Supervisor Notified?</Label><Switch checked={formData.notifications.supervisor_notified} onCheckedChange={v => setFormData({ ...formData, notifications: { ...formData.notifications, supervisor_notified: v } })} /></div>
              {formData.notifications.supervisor_notified && <div className="grid grid-cols-2 gap-4 pl-4 border-l-2"><div><Label>Supervisor Name</Label><Input value={formData.notifications.supervisor_name} onChange={e => setFormData({ ...formData, notifications: { ...formData.notifications, supervisor_name: e.target.value } })} /></div><div><Label>Time Notified</Label><Input type="time" value={formData.notifications.supervisor_time} onChange={e => setFormData({ ...formData, notifications: { ...formData.notifications, supervisor_time: e.target.value } })} /></div></div>}
            </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Upload photos or videos related to this incident</p>
            {!isOnline && <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-800"><WifiOff className="w-4 h-4 shrink-0" /><span>Offline — media is saved to your device and will upload when you reconnect.</span></div>}

            {/* Hidden file inputs */}
            {/* General: all photos & videos including HEIC, HEVC, MOV, MP4, AVI, MKV, WebM, 3GP, WMV */}
            <input type="file" id="media-upload-all"
              accept="image/*,video/*,image/heic,image/heif,.heic,.heif,.mov,.mp4,.avi,.mkv,.webm,.3gp,.wmv,.m4v,.mts,.ts"
              multiple capture={undefined} className="hidden"
              onChange={e => handleMediaUpload(Array.from(e.target.files))} />
            {/* Camera capture — photo */}
            <input type="file" id="media-upload-camera"
              accept="image/*" capture="environment" className="hidden"
              onChange={e => handleMediaUpload(Array.from(e.target.files))} />
            {/* Camera capture — video */}
            <input type="file" id="media-upload-video"
              accept="video/*,.mov,.mp4,.avi,.mkv,.webm,.3gp,.m4v" capture="environment" className="hidden"
              onChange={e => handleMediaUpload(Array.from(e.target.files))} />

            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-[#c9a227] hover:bg-amber-50 transition-colors"
              onClick={() => document.getElementById("media-upload-all").click()}
            >
              {uploadingMedia ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-10 h-10 text-[#c9a227] animate-spin" />
                  <p className="text-sm text-slate-500">Uploading media...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                  <p className="font-medium text-slate-700">Click to upload files</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Photos: JPG, PNG, HEIC, HEIF, WebP, GIF, BMP<br />
                    Videos: MP4, MOV, AVI, MKV, WebM, 3GP, WMV, M4V
                  </p>
                </>
              )}
            </div>

            {/* Mobile quick-capture buttons */}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1 gap-2" disabled={uploadingMedia}
                onClick={() => document.getElementById("media-upload-camera").click()}>
                <Camera className="w-4 h-4" /> Take Photo
              </Button>
              <Button type="button" variant="outline" className="flex-1 gap-2" disabled={uploadingMedia}
                onClick={() => document.getElementById("media-upload-video").click()}>
                <Video className="w-4 h-4" /> Record Video
              </Button>
            </div>

            {formData.multimedia_evidence?.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Evidence ({formData.multimedia_evidence.length})</Label>
                <div className="grid grid-cols-2 gap-3">
                  {formData.multimedia_evidence.map((media, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden bg-slate-100">
                      {media.type === 'photo'
                        ? <img src={media.url} alt="Evidence" className="w-full h-32 object-cover" />
                        : (
                          <video src={media.url} className="w-full h-32 object-cover" controls preload="metadata">
                            <div className="w-full h-32 flex items-center justify-center"><Video className="w-8 h-8 text-slate-400" /></div>
                          </video>
                        )
                      }
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, multimedia_evidence: formData.multimedia_evidence.filter((_, i) => i !== idx) })}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs px-2 py-1 flex items-center gap-1">
                        {media.type === 'video' ? <Video className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
                        {media.type === 'video' ? 'Video' : 'Photo'}
                        {media._isOfflineBlob && <span className="ml-auto text-amber-300">Offline</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 8:
        return (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4"><div className="flex items-start gap-3"><AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" /><div><p className="font-medium text-amber-800">Review your report</p><p className="text-sm text-amber-700">Please verify all information before submitting</p></div></div></div>
            <Card>
              <CardHeader><CardTitle className="text-base">Incident Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[["Type", formData.incident_type?.replace("_", " ")], ["Severity", formData.severity], ["Date", formData.incident_date], ["Time", formData.incident_time], ["Complainants", formData.complainants.length], ["Suspects", formData.suspects.length], ["Property Damage", formData.property_damage.has_damage ? "Yes" : "No"], ["Injuries", formData.injuries.has_injuries ? "Yes" : "No"]].map(([label, value]) => (
                  <div key={label} className="flex justify-between"><span className="text-slate-500">{label}:</span><span className="font-medium capitalize">{value}</span></div>
                ))}
              </CardContent>
            </Card>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title={incidentId ? "Edit Incident Report" : "New Incident Report"} subtitle={`Step ${currentStep + 1} of ${STEPS.length}: ${STEPS[currentStep]}`} showBack />
      <OfflineSyncBanner pendingCount={pendingCount} />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6"><div className="flex gap-1">{STEPS.map((_, i) => <div key={i} className={`flex-1 h-1 rounded-full ${i <= currentStep ? "bg-[#c9a227]" : "bg-slate-200"}`} />)}</div></div>
        <Card className="mb-6"><CardContent className="p-6">{renderStep()}</CardContent></Card>
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0}><ChevronLeft className="w-4 h-4 mr-2" />Previous</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}{isOnline ? "Save Draft" : "Save Offline"}</Button>
            {currentStep < STEPS.length - 1 ? (
              <Button onClick={() => setCurrentStep(currentStep + 1)} className="bg-[#1a2b4a] hover:bg-[#2d4a6f]">Next<ChevronRight className="w-4 h-4 ml-2" /></Button>
            ) : (
              <Button onClick={handleSubmit} disabled={saving || !formData.incident_type || !formData.description} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isOnline ? <Send className="w-4 h-4 mr-2" /> : <WifiOff className="w-4 h-4 mr-2" />}
                {isOnline ? "Submit Report" : "Queue for Sync"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}