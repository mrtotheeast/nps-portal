import React, { useState, useMemo } from "react";
import { MapContainer, TileLayer, Circle, Marker } from "react-leaflet";
import L from "leaflet";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const siteIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'><circle cx='15' cy='15' r='12' fill='%234B7BE5' stroke='%231e3a8a' stroke-width='2' fill-opacity='0.7'/></svg>",
  iconSize: [30, 30], iconAnchor: [15, 15]
});

const officerIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><circle cx='10' cy='10' r='6' fill='%23EF4444' stroke='%23991B1B' stroke-width='1'/></svg>",
  iconSize: [20, 20], iconAnchor: [10, 10]
});

export default function ClientMapView({ clientId }) {
  const [hoveredSite, setHoveredSite] = useState(null);

  const { data: sites = [] } = useQuery({
    queryKey: ["client-map-sites", clientId],
    queryFn: async () => {
      const allSites = await base44.entities.Site.filter({ client_id: clientId, status: "active" });
      return allSites.filter(s => s.latitude && s.longitude);
    },
    refetchInterval: 60000
  });

  const { data: officers = [] } = useQuery({
    queryKey: ["client-map-officers", clientId],
    queryFn: async () => {
      const timesheets = await base44.entities.Timesheet.filter({ status: "active" });
      const clientSiteIds = sites.map(s => s.id);
      return timesheets
        .filter(t => clientSiteIds.includes(t.site_id) && t.clock_in && !t.clock_out)
        .map(ts => ({ id: ts.id, latitude: ts.clock_in_location?.latitude, longitude: ts.clock_in_location?.longitude, siteId: ts.site_id }))
        .filter(o => o.latitude && o.longitude);
    },
    refetchInterval: 30000
  });

  const defaultCenter = sites.length > 0 ? [sites[0].latitude, sites[0].longitude] : [40.7128, -74.0060];
  const officerCountBySite = useMemo(() => {
    const counts = {};
    sites.forEach(site => { counts[site.id] = officers.filter(o => o.siteId === site.id).length; });
    return counts;
  }, [sites, officers]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-4 bg-white border-b">
        <h3 className="font-semibold text-slate-900 mb-2">Your Assigned Sites</h3>
        <p className="text-sm text-slate-600">Red dots show officers currently on duty. Total: {officers.length} officers</p>
      </div>
      <div className="flex-1">
        <MapContainer center={defaultCenter} zoom={12} className="w-full h-full" style={{ zIndex: 0 }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
          {sites.map(site => (
            <React.Fragment key={site.id}>
              {site.geofence?.enabled && <Circle center={[site.latitude, site.longitude]} radius={site.geofence.radius_meters || 300} fillOpacity={0.05} color="#3B82F6" weight={2} dashArray="5, 5" />}
              <Marker position={[site.latitude, site.longitude]} icon={siteIcon} eventHandlers={{ mouseover: () => setHoveredSite(site.id), mouseout: () => setHoveredSite(null) }} />
            </React.Fragment>
          ))}
          {officers.map(officer => <Marker key={officer.id} position={[officer.latitude, officer.longitude]} icon={officerIcon} />)}
        </MapContainer>
      </div>
    </div>
  );
}