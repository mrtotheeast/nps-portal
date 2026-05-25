import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import LoadingScreen from "@/components/shared/LoadingScreen";

export default function SiteCheckInConfig() {
  const navigate = useNavigate();
  const [selectedSite, setSelectedSite] = useState(null);
  const [config, setConfig] = useState({
    requirePhoto: false,
    requireNotes: false,
    checkInRadius: 100
  });

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: () => base44.entities.Site.list(),
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Site Check-In Configuration</h1>
            <p className="text-sm text-slate-500">Configure check-in settings for each site</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sites List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Sites ({sites.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sites.map(site => (
                <button
                  key={site.id}
                  onClick={() => setSelectedSite(site)}
                  className={`w-full text-left p-2 rounded transition-colors ${
                    selectedSite?.id === site.id
                      ? 'bg-[#c9a227]/10 border border-[#c9a227] text-[#c9a227]'
                      : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <p className="font-medium text-sm">{site.name}</p>
                  <p className="text-xs text-slate-500">{site.city}, {site.state}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Configuration */}
          {selectedSite ? (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {selectedSite.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked={config.requirePhoto} onChange={(e) => setConfig({...config, requirePhoto: e.target.checked})} />
                    Require Photo on Check-In
                  </Label>
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked={config.requireNotes} onChange={(e) => setConfig({...config, requireNotes: e.target.checked})} />
                    Require Notes on Check-In
                  </Label>
                </div>
                <div>
                  <Label>Check-In Radius (meters)</Label>
                  <Input type="number" value={config.checkInRadius} onChange={(e) => setConfig({...config, checkInRadius: e.target.value})} />
                </div>
                <Button className="w-full bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] gap-2">
                  <Save className="w-4 h-4" />
                  Save Configuration
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="md:col-span-2">
              <CardContent className="p-8 text-center text-slate-500">
                <p>Select a site to configure check-in settings</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}