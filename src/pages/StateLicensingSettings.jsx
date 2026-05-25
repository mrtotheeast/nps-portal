import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, Plus, Trash2, Save, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";

export default function StateLicensingSettings() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [stateWebsites, setStateWebsites] = useState({});
  const [newState, setNewState] = useState("");
  const [newUrl, setNewUrl] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const all = await base44.entities.AppSettings.list();
      const licensingSettings = all.find(s => s.setting_key === "state_licensing_websites");
      if (licensingSettings) {
        const parsed = JSON.parse(licensingSettings.setting_value);
        setStateWebsites(parsed);
      }
    } catch (error) {
      console.error("Failed to load state licensing settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        setting_key: "state_licensing_websites",
        setting_value: JSON.stringify(stateWebsites),
        setting_type: "string",
        category: "general",
        description: "State licensing website URLs for employee credentials",
      };
      const existing = await base44.entities.AppSettings.filter({ setting_key: "state_licensing_websites" });
      if (existing.length > 0) {
        return base44.entities.AppSettings.update(existing[0].id, payload);
      }
      return base44.entities.AppSettings.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["app-settings"]);
      toast.success("State licensing websites saved");
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const addState = () => {
    if (!newState || !newUrl) {
      toast.error("Please fill in both state name and website URL");
      return;
    }
    setStateWebsites(prev => ({
      ...prev,
      [newState.trim()]: newUrl.trim(),
    }));
    setNewState("");
    setNewUrl("");
  };

  const removeState = (state) => {
    setStateWebsites(prev => {
      const updated = { ...prev };
      delete updated[state];
      return updated;
    });
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="State Licensing Websites" subtitle="Configure official licensing websites for each state" showBack />
      
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Globe className="w-6 h-6 text-[#c9a227]" />
              <div>
                <CardTitle>State Websites</CardTitle>
                <CardDescription>Add official state licensing board websites for employee credentials</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <Label>State Name</Label>
                <Input
                  value={newState}
                  onChange={(e) => setNewState(e.target.value)}
                  placeholder="e.g., California"
                />
              </div>
              <div className="col-span-2">
                <Label>Website URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://www.bsis.ca.gov/"
                    type="url"
                  />
                  <Button onClick={addState} className="bg-[#1a2b4a]">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {Object.keys(stateWebsites).length > 0 ? (
              <div className="space-y-2 mt-4">
                {Object.entries(stateWebsites).map(([state, url]) => (
                  <div key={state} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{state}</p>
                      <p className="text-xs text-slate-500 truncate">{url}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(url, "_blank")}
                        className="text-[#c9a227] hover:text-[#b8922a]"
                        title="Test link"
                      >
                        <Globe className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeState(state)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Globe className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">No state websites configured</p>
                <p className="text-xs mt-1">Add states above to enable quick access for employees</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-slate-600">
              When employees view their credentials in the State Licensing page, they can click the external link icon 
              next to each state name to open that state's official licensing website directly in the app's internal browser.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800">
                <strong>Tip:</strong> Use official state government URLs (e.g., .gov domains) for security and accuracy. 
                Employees can renew licenses and verify status directly through the app.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => loadSettings()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Cancel
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-[#1a2b4a]">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}