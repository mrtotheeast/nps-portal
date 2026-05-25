import React, { useState, useMemo, useEffect, useRef, forwardRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import "leaflet/dist/leaflet.css";

const makeSvgIcon = (svg, size = 30) =>
  new L.Icon({ iconUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

const SITE_ICON = makeSvgIcon(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="#3B82F6" stroke="#1e3a8a" stroke-width="2" fill-opacity="0.85"/></svg>`);
const SITE_PATROL_ICON = makeSvgIcon(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34"><polygon points="17,2 21,12 32,12 23,19 26,30 17,23 8,30 11,19 2,12 13,12" fill="#c9a227" stroke="#92620a" stroke-width="1.5"/></svg>`, 34);

function AutoFit({ positions }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    const key = JSON.stringify(positions);
    if (positions.length === 0 || key === prev.current) return;
    prev.current = key;
    if (positions.length === 1) {
      map.setView(positions[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(positions), { padding: [60, 60], maxZoom: 14 });
    }
  }, [positions, map]);
  return null;
}

async function geocodeSite(site) {
  if (!site.address) return null;
  const addressObj = { street: site.address, city: site.city, state: site.state, zip: site.zip };
  const res = await base44.functions.invoke("geocodeSiteAddress", { siteId: site.id, address: addressObj }).catch(() => null);
  if (res?.data?.success) return { lat: res.data.latitude, lng: res.data.longitude };
  return null;
}

const ClientLiveMapComponent = forwardRef(function ClientLiveMap({ clientId }, ref) {
  const [stateFilter, setStateFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [geocodingIds, setGeocodingIds] = useState(new Set());
  const [hoveredSiteId, setHoveredSiteId] = useState(null);

  const { data: allSites = [], isLoading: sitesLoading, refetch: refetchSites } = useQuery({
    queryKey: ["client-map-sites", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      return base44.entities.Site.filter({ client_id: clientId });
    },
    enabled: !!clientId,
    staleTime: 60000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["client-map-employees"],
    queryFn: () => base44.entities.Employee.list(),
    staleTime: 120000,
  });

  const { data: patrols = [] } = useQuery({
    queryKey: ["client-map-patrols"],
    queryFn: () => base44.entities.PatrolSession.filter({ status: "active" }),
    refetchInterval: 30000,
  });

  const { data: activeTimesheets = [] } = useQuery({
    queryKey: ["client-map-timesheets"],
    queryFn: async () => {
      const ts = await base44.entities.Timesheet.list("-clock_in", 200);
      return ts.filter(t => t.clock_in && !t.clock_out);
    },
    refetchInterval: 30000,
  });

  // Auto-geocode missing coords
  useEffect(() => {
    const toGeocode = allSites.filter(s => (!s.latitude || !s.longitude) && s.address && !geocodingIds.has(s.id));
    if (toGeocode.length === 0) return;
    setGeocodingIds(prev => new Set([...prev, ...toGeocode.map(s => s.id)]));
    Promise.all(
      toGeocode.map(site => geocodeSite(site).then(() => {
        setGeocodingIds(prev => { const n = new Set(prev); n.delete(site.id); return n; });
      }))
    ).then(() => {
      setTimeout(() => refetchSites(), 1000);
    });
  }, [allSites, geocodingIds]);

  const empById = useMemo(() => Object.fromEntries(employees.map(e => [e.id, e])), [employees]);
  const activePatrolSiteIds = useMemo(() => new Set(patrols.map(p => p.site_id).filter(Boolean)), [patrols]);

  const mappedSites = useMemo(() => allSites.filter(s => s.latitude && s.longitude), [allSites]);

  // States and cities from client's own sites
  const siteStates = useMemo(() => [...new Set(mappedSites.map(s => s.state).filter(Boolean))].sort(), [mappedSites]);
  const siteCities = useMemo(() => {
    const filtered = stateFilter !== "all" ? mappedSites.filter(s => s.state === stateFilter) : mappedSites;
    return [...new Set(filtered.map(s => s.city).filter(Boolean))].sort();
  }, [mappedSites, stateFilter]);

  const showFilters = siteStates.length > 1 || siteCities.length > 1;

  const visibleSites = useMemo(() => mappedSites.filter(site => {
    if (stateFilter !== "all" && site.state !== stateFilter) return false;
    if (cityFilter !== "all" && site.city !== cityFilter) return false;
    return true;
  }), [mappedSites, stateFilter, cityFilter]);

  const fitPositions = useMemo(() => visibleSites.map(s => [s.latitude, s.longitude]), [visibleSites]);

  if (sitesLoading || !clientId) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1a2b4a]" />
          <p className="text-slate-600">Loading your sites...</p>
        </div>
      </div>
    );
  }

  if (allSites.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No sites assigned to your account</p>
          <p className="text-slate-400 text-sm">Contact your administrator to assign sites.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Optional filter bar */}
      {showFilters && (
        <div className="bg-white border-b px-4 py-2 flex flex-wrap gap-2 items-center">
          {siteStates.length > 1 && (
            <Select value={stateFilter} onValueChange={v => { setStateFilter(v); setCityFilter("all"); }}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="State" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {siteStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {siteCities.length > 1 && (
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="City" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {siteCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <span className="text-xs text-slate-500 ml-auto">{visibleSites.length} of {allSites.length} sites shown</span>
          {geocodingIds.size > 0 && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Geocoding...
            </span>
          )}
        </div>
      )}

      <div className="flex-1 relative">
        <MapContainer ref={ref} center={[39.5, -98.35]} zoom={4} className="w-full h-full" style={{ zIndex: 0 }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
          <AutoFit positions={fitPositions} />

          {visibleSites.map(site => {
            const hasPatrol = activePatrolSiteIds.has(site.id);
            const icon = hasPatrol ? SITE_PATROL_ICON : SITE_ICON;
            const assignedEmps = (site.assigned_officers || []).map(id => empById[id]).filter(Boolean);
            const siteTimesheets = activeTimesheets.filter(t => t.site_id === site.id);
            const lastPatrol = patrols.find(p => p.site_id === site.id);
            const isActive = site.status === "active";
            const isHovered = hoveredSiteId === site.id;

            return (
              <Marker 
                key={site.id} 
                position={[site.latitude, site.longitude]} 
                icon={icon} 
                title={`${site.name} (${site.city}, ${site.state})`}
                eventHandlers={{
                  mouseover: () => setHoveredSiteId(site.id),
                  mouseout: () => setHoveredSiteId(null)
                }}
              >
                {isHovered && (
                  <Popup minWidth={200} maxWidth={250} closeButton={false} autoPan={false} className="leaflet-popup-hover">
                    <div className="text-sm p-2">
                      <p className="font-bold text-base text-slate-900 mb-1">{site.name}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        <span className="text-xs text-slate-600">{isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div className="border-t pt-1.5">
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <span className="font-medium text-slate-700">Officers On Duty:</span>
                          <span className="font-bold text-slate-900">{siteTimesheets.length}</span>
                        </p>
                      </div>
                    </div>
                  </Popup>
                )}
                <Popup minWidth={220}>
                  <div className="text-sm">
                    <p className="font-bold text-base mb-1">{site.name}</p>
                    <p className="text-slate-500 text-xs mb-2">{[site.address, site.city, site.state, site.zip].filter(Boolean).join(", ")}</p>

                    <div className="mb-2">
                      <p className="font-medium text-xs text-slate-700 mb-1">Assigned Officers ({assignedEmps.length})</p>
                      {assignedEmps.length > 0
                        ? assignedEmps.map(e => (
                          <p key={e.id} className="text-xs text-slate-600">• {e.firstName} {e.lastName} <span className="text-slate-400">({e.role})</span></p>
                        ))
                        : <p className="text-xs text-slate-400">None assigned</p>
                      }
                    </div>

                    <div className="mb-2">
                      <p className="text-xs">
                        <span className="font-medium">Shift Coverage:</span>{" "}
                        <span className={siteTimesheets.length > 0 ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                          {siteTimesheets.length > 0 ? `${siteTimesheets.length} officer(s) on duty` : "No one clocked in"}
                        </span>
                      </p>
                    </div>

                    <div className="mb-1">
                      <p className="text-xs">
                        <span className="font-medium">Active Patrol:</span>{" "}
                        {hasPatrol
                          ? <span className="text-emerald-600 font-semibold">● In Progress</span>
                          : <span className="text-slate-400">None</span>}
                      </p>
                    </div>

                    {lastPatrol?.start_time && (
                      <p className="text-xs text-slate-400">
                        Last patrol: {format(new Date(lastPatrol.start_time), "MMM d, h:mm a")}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-6 left-4 bg-white rounded-xl shadow-lg border px-4 py-3 text-xs z-[999] space-y-1.5">
          <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-blue-500 border-2 border-blue-800 inline-block" /> Your site</div>
          <div className="flex items-center gap-2"><span className="text-[#c9a227] text-lg leading-none">★</span> Active patrol</div>
        </div>
      </div>
    </div>
  );
});

ClientLiveMapComponent.displayName = "ClientLiveMap";
export default ClientLiveMapComponent;