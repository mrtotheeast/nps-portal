import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { format, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Filter, ExternalLink, AlertTriangle } from "lucide-react";
import "leaflet/dist/leaflet.css";

const SEVERITY_CONFIG = {
  critical: { color: "#dc2626", label: "Critical", radius: 14 },
  high:     { color: "#f97316", label: "High",     radius: 11 },
  medium:   { color: "#eab308", label: "Medium",   radius: 9  },
  low:      { color: "#3b82f6", label: "Low",      radius: 7  },
};

const DATE_RANGES = [
  { label: "Last 7 days",  value: "7"   },
  { label: "Last 30 days", value: "30"  },
  { label: "Last 90 days", value: "90"  },
  { label: "All time",     value: "all" },
];

const DEFAULT_CENTER = [25.7617, -80.1918];

export default function IncidentMap() {
  const navigate = useNavigate();
  const [severityFilter, setSeverityFilter] = useState("all");
  const [dateRange, setDateRange] = useState("30");

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["incidents-all"],
    queryFn: () => base44.entities.Incident.list("-incident_date", 500),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites-all"],
    queryFn: () => base44.entities.Site.list(),
  });

  const siteGPS = useMemo(() => {
    const map = {};
    sites.forEach(s => {
      if (s.geofence?.center) map[s.id] = { lat: s.geofence.center.lat, lng: s.geofence.center.lng, name: s.name };
      else if (s.location?.latitude && s.location?.longitude) map[s.id] = { lat: s.location.latitude, lng: s.location.longitude, name: s.name };
    });
    return map;
  }, [sites]);

  const filtered = useMemo(() => {
    const cutoff = dateRange === "all" ? null : subDays(new Date(), parseInt(dateRange));
    return incidents.filter(inc => {
      if (severityFilter !== "all" && inc.severity !== severityFilter) return false;
      if (cutoff && inc.incident_date && new Date(inc.incident_date) < cutoff) return false;
      return (inc.location?.latitude && inc.location?.longitude) || (inc.site_id && siteGPS[inc.site_id]);
    });
  }, [incidents, severityFilter, dateRange, siteGPS]);

  const mapCenter = useMemo(() => {
    if (filtered.length === 0) return DEFAULT_CENTER;
    const first = filtered[0];
    if (first.location?.latitude) return [first.location.latitude, first.location.longitude];
    const site = siteGPS[first.site_id];
    return site ? [site.lat, site.lng] : DEFAULT_CENTER;
  }, [filtered, siteGPS]);

  const severityCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    filtered.forEach(i => { if (counts[i.severity] !== undefined) counts[i.severity]++; });
    return counts;
  }, [filtered]);

  const totalIncidents = incidents.filter(i => {
    if (dateRange === "all") return true;
    const cutoff = subDays(new Date(), parseInt(dateRange));
    return !i.incident_date || new Date(i.incident_date) >= cutoff;
  }).length;

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-red-500" />Incident Heat Map</CardTitle>
          <Button variant="ghost" size="sm" className="text-[#c9a227]" onClick={() => navigate(createPageUrl("IncidentManagement"))}>
            <ExternalLink className="w-4 h-4 mr-1" />All Incidents
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Date range" /></SelectTrigger>
            <SelectContent>{DATE_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.color }} />
              <span className="text-slate-600">{cfg.label}</span>
              <span className="font-semibold text-slate-900">({severityCounts[key]})</span>
            </div>
          ))}
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} of {totalIncidents} have GPS</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="h-80 flex items-center justify-center bg-slate-50 rounded-b-xl">
            <div className="text-center text-slate-400"><MapPin className="w-8 h-8 mx-auto mb-2 animate-pulse" /><p className="text-sm">Loading incidents...</p></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-80 flex items-center justify-center bg-slate-50 rounded-b-xl">
            <div className="text-center text-slate-400"><AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" /><p className="text-sm">No incidents with GPS data match your filters</p></div>
          </div>
        ) : (
          <div className="h-80 rounded-b-xl overflow-hidden">
            <MapContainer center={mapCenter} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {filtered.map(inc => {
                const lat = inc.location?.latitude ?? siteGPS[inc.site_id]?.lat;
                const lng = inc.location?.longitude ?? siteGPS[inc.site_id]?.lng;
                if (!lat || !lng) return null;
                const cfg = SEVERITY_CONFIG[inc.severity] || SEVERITY_CONFIG.low;
                return (
                  <CircleMarker key={inc.id} center={[lat, lng]} radius={cfg.radius} pathOptions={{ color: cfg.color, fillColor: cfg.color, fillOpacity: 0.75, weight: 2 }}>
                    <Popup>
                      <div className="text-sm min-w-[180px]">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded text-white text-xs font-semibold" style={{ backgroundColor: cfg.color }}>{cfg.label}</span>
                          <span className="capitalize text-slate-700 font-medium">{inc.incident_type?.replace(/_/g, " ")}</span>
                        </div>
                        {inc.incident_date && <p className="text-xs text-slate-500 mb-1">{format(new Date(inc.incident_date), "MMM d, yyyy")}{inc.incident_time && ` · ${inc.incident_time}`}</p>}
                        {inc.description && <p className="text-xs text-slate-600 line-clamp-3 mb-2">{inc.description}</p>}
                        {siteGPS[inc.site_id] && <p className="text-xs text-slate-400">📍 {siteGPS[inc.site_id].name}</p>}
                        <button onClick={() => navigate(createPageUrl("IncidentManagement"))} className="mt-2 text-xs text-blue-600 underline">View Details →</button>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}