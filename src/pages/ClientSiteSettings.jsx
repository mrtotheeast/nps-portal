import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Shield, Key, Bell, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import AIAssistant from "@/components/shared/AIAssistant";
import { toast } from "sonner";

export default function ClientSiteSettings() {
  const [user, setUser] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ["client-sites", user?.client_id],
    queryFn: async () => { if (!user?.client_id) return []; return base44.entities.Site.filter({ client_id: user.client_id }); },
    enabled: !!user?.client_id
  });

  useEffect(() => { if (sites.length > 0 && !selectedSite) setSelectedSite(sites[0]); }, [sites]);

  const updateSiteMutation = useMutation({
    mutationFn: (data) => base44.entities.Site.update(selectedSite.id, data),
    onSuccess: (updated) => { queryClient.invalidateQueries(["client-sites"]); setSelectedSite(updated); toast.success("Site updated successfully"); }
  });

  const handleProtocolAdd = () => updateSiteMutation.mutate({ security_protocols: [...(selectedSite.security_protocols || []), { title: "", description: "", priority: "medium" }] });

  const handleProtocolUpdate = (index, field, value) => {
    const protocols = [...(selectedSite.security_protocols || [])];
    protocols[index] = { ...protocols[index], [field]: value };
    updateSiteMutation.mutate({ security_protocols: protocols });
  };

  const handleProtocolDelete = (index) => {
    const protocols = [...(selectedSite.security_protocols || [])];
    protocols.splice(index, 1);
    updateSiteMutation.mutate({ security_protocols: protocols });
  };

  const handleAccessUpdate = (field, value) => updateSiteMutation.mutate({ access_credentials: { ...(selectedSite.access_credentials || {}), [field]: value } });
  const handleAlertUpdate = (field, value) => updateSiteMutation.mutate({ alert_preferences: { ...(selectedSite.alert_preferences || {}), [field]: value } });

  if (isLoading || !user) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <PageHeader title="Site Settings" subtitle="Manage security protocols and access" showBack />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <Label>Select Site</Label>
            <Select value={selectedSite?.id} onValueChange={(id) => setSelectedSite(sites.find(s => s.id === id))}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>{sites.map(site => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}</SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedSite && (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Security Protocols for Officers</CardTitle>
                  <Button onClick={handleProtocolAdd} size="sm"><Plus className="w-4 h-4 mr-2" />Add Protocol</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedSite.security_protocols?.length > 0 ? selectedSite.security_protocols.map((protocol, idx) => (
                  <div key={idx} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <Input placeholder="Protocol title..." value={protocol.title} onChange={(e) => handleProtocolUpdate(idx, 'title', e.target.value)} />
                        <AIAssistant value={protocol.description} onChange={(e) => handleProtocolUpdate(idx, 'description', e.target.value)} placeholder="Protocol details and instructions..." promptContext="Improve this security protocol instruction for officers" rows={3} />
                        <Select value={protocol.priority} onValueChange={(val) => handleProtocolUpdate(idx, 'priority', val)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low Priority</SelectItem>
                            <SelectItem value="medium">Medium Priority</SelectItem>
                            <SelectItem value="high">High Priority</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleProtocolDelete(idx)} className="text-red-600 ml-2"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                )) : <p className="text-center text-slate-500 py-8">No security protocols defined. Click "Add Protocol" to create one.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" />Access Credentials</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Gate Codes (comma-separated)</Label>
                  <Input value={selectedSite.access_credentials?.gate_codes?.join(', ') || ''} onChange={(e) => handleAccessUpdate('gate_codes', e.target.value.split(',').map(c => c.trim()))} placeholder="1234, 5678" className="mt-2" />
                </div>
                <div>
                  <Label>Alarm Codes (comma-separated)</Label>
                  <Input value={selectedSite.access_credentials?.alarm_codes?.join(', ') || ''} onChange={(e) => handleAccessUpdate('alarm_codes', e.target.value.split(',').map(c => c.trim()))} placeholder="9999, 8888" className="mt-2" />
                </div>
                <div>
                  <Label>Key Locations</Label>
                  <AIAssistant value={selectedSite.access_credentials?.key_locations || ''} onChange={(e) => handleAccessUpdate('key_locations', e.target.value)} placeholder="Describe where keys are located..." promptContext="Improve this description of key locations for security officers" rows={2} />
                </div>
                <div>
                  <Label>Special Access Notes</Label>
                  <AIAssistant value={selectedSite.access_credentials?.special_access_notes || ''} onChange={(e) => handleAccessUpdate('special_access_notes', e.target.value)} placeholder="Any special access instructions..." promptContext="Improve these special access instructions for security officers" rows={3} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" />Alert Preferences</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: "geofence_alerts", label: "Geofence Alerts", desc: "Get notified when officers leave the geofence" },
                  { key: "incident_alerts", label: "Incident Alerts", desc: "Get notified of all incidents at this site" },
                  { key: "unusual_activity_alerts", label: "Unusual Activity Alerts", desc: "Get notified of suspicious activity" },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div><p className="font-medium">{label}</p><p className="text-sm text-slate-500">{desc}</p></div>
                    <Switch checked={selectedSite.alert_preferences?.[key] !== false} onCheckedChange={(val) => handleAlertUpdate(key, val)} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}