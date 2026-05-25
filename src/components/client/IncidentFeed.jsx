import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, Clock, MapPin, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function IncidentFeed({ clientId }) {
  const [user, setUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: sites = [] } = useQuery({
    queryKey: ["client-sites", clientId],
    queryFn: async () => {
      const allSites = await base44.entities.Site.filter({ status: "active" });
      return allSites.filter(s => s.client_id === clientId);
    },
    enabled: !!clientId
  });

  const siteIds = sites.map(s => s.id);

  const { data: incidents = [] } = useQuery({
    queryKey: ["client-incidents", siteIds],
    queryFn: async () => {
      const allIncidents = await base44.entities.Incident.filter({ status: "approved" }, "-created_date", 50);
      return allIncidents.filter(i => siteIds.includes(i.site_id));
    },
    enabled: siteIds.length > 0,
    refetchInterval: 30000
  });

  useEffect(() => {
    if (!siteIds.length) return;
    const unsubscribe = base44.entities.Incident.subscribe((event) => {});
    return unsubscribe;
  }, [siteIds]);

  const getSeverityColor = (severity) => {
    const colors = { low: "bg-blue-100 text-blue-800", medium: "bg-amber-100 text-amber-800", high: "bg-red-100 text-red-800" };
    return colors[severity] || "bg-slate-100 text-slate-800";
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />Recent Incidents
          {incidents.length > 0 && <Badge variant="outline" className="ml-auto">{incidents.length} total</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {incidents.length > 0 ? (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {incidents.map((incident) => {
              const site = sites.find(s => s.id === incident.site_id);
              return (
                <div key={incident.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{incident.incident_type?.replace(/_/g, ' ')}</span>
                      <Badge className={getSeverityColor(incident.severity)}>{incident.severity}</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500"><Clock className="w-3 h-3" />{format(new Date(incident.created_date), "MMM d, h:mm a")}</div>
                  </div>
                  {site && <div className="flex items-center gap-1 text-sm text-slate-500 mb-2"><MapPin className="w-3 h-3" />{site.name}</div>}
                  <p className="text-sm text-slate-600 line-clamp-2">{incident.description}</p>
                  {incident.notifications?.police_notified && <div className="flex items-center gap-1 text-xs text-blue-600 mt-2"><Shield className="w-3 h-3" /><span>Police notified</span></div>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500"><AlertTriangle className="w-12 h-12 mx-auto mb-2 text-slate-300" /><p className="text-sm">No recent incidents</p></div>
        )}
      </CardContent>
    </Card>
  );
}