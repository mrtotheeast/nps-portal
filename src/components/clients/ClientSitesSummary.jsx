import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Users, AlertCircle, Plus, Trash2, Loader2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import SiteBulkUploadDialog from "./SiteBulkUploadDialog";

export default function ClientSitesSummary({ clientId, className = "" }) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ["client-sites", clientId],
    queryFn: () => base44.entities.Site.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const deleteMutation = useMutation({
    mutationFn: (siteId) => base44.entities.Site.delete(siteId),
    onSuccess: () => {
      queryClient.invalidateQueries(["client-sites", clientId]);
      toast.success("Site removed");
    },
  });

  const activeSites = sites.filter(s => s.status === "active");
  const inactiveSites = sites.filter(s => s.status === "inactive");

  const SiteCard = ({ site }) => (
    <div className="flex items-start justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm">{site.name}</h4>
        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{site.address}, {site.city}, {site.state} {site.zip}</span>
        </div>
        {site.assigned_officers?.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
            <Users className="w-3 h-3" />
            <span>{site.assigned_officers.length} officer{site.assigned_officers.length !== 1 ? "s" : ""}</span>
          </div>
        )}
        {site.site_type && (
          <Badge className="mt-2 bg-slate-100 text-slate-700" variant="outline">
            {site.site_type}
          </Badge>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2"
        onClick={() => deleteMutation.mutate(site.id)}
        disabled={deleteMutation.isPending}
      >
        {deleteMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-center text-slate-500">Loading sites...</CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-slate-500" />
              Service Footprint
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1"
              onClick={() => setUploadOpen(true)}
            >
              <Upload className="w-3 h-3" />
              Bulk Import
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {sites.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No sites assigned yet</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 gap-1"
                onClick={() => setUploadOpen(true)}
              >
                <Upload className="w-3 h-3" />
                Import Sites
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <p className="text-xs text-emerald-700 mb-1">Active Sites</p>
                  <p className="text-2xl font-bold text-emerald-700">{activeSites.length}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-700 mb-1">Total Locations</p>
                  <p className="text-2xl font-bold text-slate-700">{sites.length}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700 mb-1">Assigned Officers</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {sites.reduce((sum, s) => sum + (s.assigned_officers?.length || 0), 0)}
                  </p>
                </div>
              </div>

              <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-3">
                  <TabsTrigger value="active" className="text-xs">
                    Active ({activeSites.length})
                  </TabsTrigger>
                  <TabsTrigger value="inactive" className="text-xs">
                    Inactive ({inactiveSites.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-2 max-h-64 overflow-y-auto">
                  {activeSites.length > 0 ? (
                    activeSites.map((site) => <SiteCard key={site.id} site={site} />)
                  ) : (
                    <p className="text-xs text-slate-500 p-3 text-center">No active sites</p>
                  )}
                </TabsContent>

                <TabsContent value="inactive" className="space-y-2 max-h-64 overflow-y-auto">
                  {inactiveSites.length > 0 ? (
                    inactiveSites.map((site) => <SiteCard key={site.id} site={site} />)
                  ) : (
                    <p className="text-xs text-slate-500 p-3 text-center">No inactive sites</p>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>

      <SiteBulkUploadDialog clientId={clientId} open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </>
  );
}