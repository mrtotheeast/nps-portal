import React, { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Circle, Popup, Polyline, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import MapHeader from "./MapHeader";
import SiteMarkerPopup from "./SiteMarkerPopup";
import OfficerMarkerPopup from "./OfficerMarkerPopup";
import { Loader2 } from "lucide-react";

const siteIcon = new L.Icon({ iconUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'><circle cx='15' cy='15' r='12' fill='%234B7BE5' stroke='%231e3a8a' stroke-width='2' fill-opacity='0.7'/></svg>", iconSize: [30, 30], iconAnchor: [15, 15] });
const officerIcon = new L.Icon({ iconUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><circle cx='10' cy='10' r='6' fill='%23EF4444' stroke='%23991B1B' stroke-width='1'/></svg>", iconSize: [20, 20], iconAnchor: [10, 10] });
const breakIcon = new L.Icon({ iconUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><circle cx='10' cy='10' r='6' fill='%239CA3AF' stroke='%23374151' stroke-width='1'/></svg>", iconSize: [20, 20], iconAnchor: [10, 10] });
const checkpointCompleteIcon = new L.Icon({ iconUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><rect x='3' y='3' width='14' height='14' fill='%2316A34A' stroke='%23065F46' stroke-width='1'/><text x='10' y='14' text-anchor='middle' font-size='10' fill='white' font-weight='bold'>✓</text></svg>", iconSize: [18, 18], iconAnchor: [9, 9] });
const checkpointPendingIcon = new L.Icon({ iconUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><rect x='3' y='3' width='14' height='14' fill='none' stroke='%23999999' stroke-width='2'/></svg>", iconSize: [18, 18], iconAnchor: [9, 9] });

function MapZoomHandler({ viewMode, sites, selectedSite }) {
  const map = useMap();
  useEffect(() => {
    if (viewMode === "all" && sites.length > 0) {
      const validSites = sites.filter(s => s.latitude && s.longitude);
      if (validSites.length > 0) map.fitBounds(L.latLngBounds(validSites.map(s => [s.latitude, s.longitude])), { padding: [50, 50] });
    } else if (viewMode === "single" && selectedSite) {
      map.setView([selectedSite.latitude, selectedSite.longitude], 15);
    }
  }, [viewMode, sites, selectedSite, map]);
  return null;
}

export default function EnhancedLiveMap({ isAdmin = false, clientId = null }) {
  const [viewMode, setViewMode] = useState("all");
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSitesFilter, setSelectedSitesFilter] = useState([]);
  const [selectedPositionsFilter, setSelectedPositionsFilter] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ["map-sites", clientId],
    queryFn: async () => {
      const fetchedSites = await base44.entities.Site.list();
      return Promise.all(fetchedSites.map(async (site) => {
        if (!site.latitude || !site.longitude) {
          const geocoded = await base44.functions.invoke('geocodeSiteAddress', { siteId: site.id, address: site.address }).catch(() => null);
          return geocoded?.data ? { ...site, ...geocoded.data } : { ...site, geocodeError: true };
        }
        return site;
      }));
    },
    refetchInterval: 60000
  });

  const { data: employeeRecords = [] } = useQuery({ queryKey: ["all-employees"], queryFn: () => base44.entities.Employee.list(), staleTime: 30000 });
  const { data: userRecords = [] } = useQuery({ queryKey: ["all-users"], queryFn: () => base44.entities.User.list(), staleTime: 30000 });

  const { data: officers = [], refetch: refetchOfficers } = useQuery({
    queryKey: ["map-officers", selectedSitesFilter],
    queryFn: async () => {
      const timesheets = await base44.entities.Timesheet.list();
      const activeTimesheets = timesheets.filter(t => t.clock_in && !t.clock_out);
      if (activeTimesheets.length === 0) return [];
      const empById = {};
      employeeRecords.forEach(e => { empById[e.id] = e; });
      return activeTimesheets
        .filter(t => selectedSitesFilter.length === 0 || selectedSitesFilter.includes(t.site_id))
        .map(t => {
          const emp = empById[t.employee_id];
          const userMatch = !emp ? userRecords.find(u => u.id === t.employee_id) : null;
          const empFromUser = userMatch ? employeeRecords.find(e => e.email && userMatch.email && e.email.toLowerCase() === userMatch.email.toLowerCase()) : null;
          const resolved = emp || empFromUser;
          return {
            id: t.employee_id, firstName: resolved?.firstName || userMatch?.full_name?.split(" ")[0] || "Officer",
            lastName: resolved?.lastName || userMatch?.full_name?.split(" ").slice(1).join(" ") || "",
            latitude: t.clock_in_location?.latitude, longitude: t.clock_in_location?.longitude,
            clock_in: t.clock_in, siteId: t.site_id, lastLocationUpdate: t.updated_date,
          };
        })
        .filter(o => o.latitude && o.longitude);
    },
    refetchInterval: 30000,
  });

  const { data: patrols = [] } = useQuery({ queryKey: ["map-patrols"], queryFn: () => base44.entities.PatrolSession.filter({ status: "active" }), refetchInterval: 30000 });
  const { data: incidents = [] } = useQuery({ queryKey: ["map-incidents"], queryFn: () => base44.entities.Incident.filter({ status: "open" }), refetchInterval: 60000 });
  const { data: positions = [] } = useQuery({ queryKey: ["positions"], queryFn: () => base44.entities.Position.list() });

  const handleRefresh = async () => { setRefreshing(true); await refetchOfficers(); setRefreshing(false); };

  const filteredSites = useMemo(() => sites.filter(site => site.latitude && site.longitude && (!searchQuery || site.name.toLowerCase().includes(searchQuery.toLowerCase()))), [sites, searchQuery]);
  const filteredOfficers = useMemo(() => officers.filter(officer => (!searchQuery || `${officer.firstName} ${officer.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())) && (viewMode !== "single" || !selectedSite || officer.siteId === selectedSite.id)), [officers, searchQuery, viewMode, selectedSite]);
  const selectedSiteData = useMemo(() => sites.find(s => s.id === selectedSite?.id), [sites, selectedSite]);
  const siteOfficers = useMemo(() => selectedSiteData ? officers.filter(o => o.siteId === selectedSiteData.id) : [], [selectedSiteData, officers]);
  const siteIncidents = useMemo(() => selectedSiteData ? incidents.filter(i => i.site_id === selectedSiteData.id && i.status !== "resolved") : [], [selectedSiteData, incidents]);

  if (sitesLoading) return <div className="h-full flex items-center justify-center bg-slate-50"><div className="flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 animate-spin text-[#1a2b4a]" /><p className="text-slate-600">Loading map data...</p></div></div>;

  const defaultCenter = filteredSites.length > 0 ? [filteredSites[0].latitude || 40.7128, filteredSites[0].longitude || -74.0060] : [40.7128, -74.0060];

  return (
    <div className="h-full flex flex-col">
      <MapHeader viewMode={viewMode} onViewModeChange={setViewMode} onSearch={setSearchQuery} onRefresh={handleRefresh} selectedSites={selectedSitesFilter} selectedPositions={selectedPositionsFilter} onSitesFilterChange={setSelectedSitesFilter} onPositionsFilterChange={setSelectedPositionsFilter} sites={filteredSites} positions={positions} isAdmin={isAdmin} refreshing={refreshing} />
      <div className="flex-1 relative">
        <MapContainer center={defaultCenter} zoom={12} className="w-full h-full" style={{ zIndex: 0 }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
          <MapZoomHandler viewMode={viewMode} sites={filteredSites} selectedSite={selectedSiteData} />
          {filteredSites.map(site => (
            <React.Fragment key={site.id}>
              {site.geofence?.enabled && <Circle center={[site.latitude, site.longitude]} radius={site.geofence.radius_meters || 300} fillOpacity={0.05} color="#3B82F6" weight={2} dashArray="5, 5" />}
              <Marker position={[site.latitude, site.longitude]} icon={siteIcon} eventHandlers={{ click: () => setSelectedSite(site) }}>
                <Popup><SiteMarkerPopup site={site} officers={siteOfficers} incidents={siteIncidents} onClose={() => setSelectedSite(null)} /></Popup>
              </Marker>
            </React.Fragment>
          ))}
          {filteredOfficers.map(officer => {
            const site = sites.find(s => s.id === officer.siteId);
            const patrol = patrols.find(p => p.officer_id === officer.id);
            const isOnBreak = officer.lastLocationUpdate && (Date.now() - new Date(officer.lastLocationUpdate)) > 5 * 60 * 1000;
            const lastUpdateMins = officer.lastLocationUpdate ? Math.floor((Date.now() - new Date(officer.lastLocationUpdate)) / 60000) : null;
            const lastSeenLabel = lastUpdateMins === null ? "Active" : lastUpdateMins < 1 ? "Just now" : `${lastUpdateMins}m ago`;
            return (
              <Marker key={officer.id} position={[officer.latitude, officer.longitude]} icon={isOnBreak ? breakIcon : officerIcon} eventHandlers={{ click: () => setSelectedOfficer(officer) }}>
                <Tooltip permanent direction="top" offset={[0, -12]} className="text-xs font-medium">
                  {officer.firstName} {officer.lastName} · {lastSeenLabel}
                </Tooltip>
                <Popup><OfficerMarkerPopup officer={officer} site={site} patrol={patrol} isOnBreak={isOnBreak} onClose={() => setSelectedOfficer(null)} /></Popup>
              </Marker>
            );
          })}
          {viewMode === "patrol" && patrols.map(patrol => {
            if (!patrol.gps_track || patrol.gps_track.length < 2) return null;
            const colors = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF"];
            const color = colors[patrols.findIndex(p => p.id === patrol.id) % colors.length];
            return (
              <React.Fragment key={patrol.id}>
                <Polyline positions={patrol.gps_track.map(p => [p.latitude, p.longitude])} color={color} weight={3} opacity={0.7} />
                {patrol.scans?.map((scan, idx) => scan.location && (
                  <Marker key={`${patrol.id}-${idx}`} position={[scan.location.latitude, scan.location.longitude]} icon={scan.checkpoint_id <= patrol.scanned_checkpoints ? checkpointCompleteIcon : checkpointPendingIcon} />
                ))}
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}