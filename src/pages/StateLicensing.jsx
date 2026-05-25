import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Award, AlertTriangle, Search, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { format } from "date-fns";
import { createPageUrl } from "@/utils";

export default function StateLicensing() {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [stateWebsites, setStateWebsites] = useState({});

  const { data: credentials = [], isLoading } = useQuery({
    queryKey: ["state-licenses"],
    queryFn: () => base44.entities.Credential.list(),
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ["app-settings"],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  React.useEffect(() => {
    const licensingSettings = appSettings.find(s => s.setting_key === "state_licensing_websites");
    if (licensingSettings) {
      try {
        setStateWebsites(JSON.parse(licensingSettings.setting_value));
      } catch (e) {
        console.error("Failed to parse state websites:", e);
      }
    }
  }, [appSettings]);

  const handleOpenStateWebsite = (state) => {
    const url = stateWebsites[state] || `https://www.google.com/search?q=${encodeURIComponent(state)}+security+license`;
    const browserUrl = `${createPageUrl("InAppBrowser")}?url=${encodeURIComponent(url)}&title=${encodeURIComponent(`${state} Licensing`)}&back=${encodeURIComponent(window.location.pathname)}`;
    window.open(browserUrl, '_blank');
  };

  const filtered = credentials.filter((cred) => {
    const matchSearch = !search || cred.credential_name?.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const states = [...new Set(credentials.map((c) => c.issuing_authority || "Other"))];

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-700";
      case "expiring_soon":
        return "bg-amber-100 text-amber-700";
      case "expired":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="State Licensing" subtitle="Track professional licenses and certifications" />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Total Active</p>
              <p className="text-2xl font-bold">{filtered.filter((c) => c.status === "active").length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-amber-600">{filtered.filter((c) => c.status === "expiring_soon").length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Expired</p>
              <p className="text-2xl font-bold text-red-600">{filtered.filter((c) => c.status === "expired").length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Total</p>
              <p className="text-2xl font-bold">{filtered.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search licenses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((cred) => (
              <Card key={cred.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-5 h-5 text-slate-400" />
                        <h3 className="font-semibold">{cred.credential_name}</h3>
                        <Badge className={getStatusColor(cred.status)}>{cred.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-slate-600">{cred.issuing_authority}</p>
                        {cred.issuing_authority && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-6 h-6 text-[#c9a227] hover:text-[#b8922a]"
                            onClick={() => handleOpenStateWebsite(cred.issuing_authority)}
                            title={`Open ${cred.issuing_authority} licensing website`}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      {cred.expiry_date && (
                        <p className="text-sm text-slate-500 mt-1">
                          Expires: {format(new Date(cred.expiry_date), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                    {cred.status === "expiring_soon" && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={Award} title="No licenses found" />
        )}
      </div>
    </div>
  );
}