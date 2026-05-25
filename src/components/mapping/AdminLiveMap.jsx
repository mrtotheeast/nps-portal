import React, { useState, useMemo, useEffect, useRef, forwardRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, Filter, X, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import "leaflet/dist/leaflet.css";

// ── Icons ──────────────────────────────────────────────────────────────────
const makeSvgIcon = (svg, size = 30) =>
  new L.Icon({ iconUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

const SITE_ICON = makeSvgIcon(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="#3B82F6" stroke="#1e3a8a" stroke-width="2" fill-opacity="0.85"/></svg>`);
const SITE_INACTIVE_ICON = makeSvgIcon(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="#94A3B8" stroke="#475569" stroke-width="2" fill-opacity="0.85"/></svg>`);
const SITE_PATROL_ICON = makeSvgIcon(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34"><polygon points="17,2 21,12 32,12 23,19 26,30 17,23 8,30 11,19 2,12 13,12" fill="#c9a227" stroke="#92620a" stroke-width="1.5"/></svg>`, 34);
const OFFICER_ICON = makeSvgIcon(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="#EF4444" stroke="#991B1B" stroke-width="1.5"/></svg>`, 20);

// ── Auto-fit bounds ────────────────────────────────────────────────────────
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
      map.fitBounds(L.latLngBounds(positions), { padding: [50, 50], maxZoom: 14 });
    }
  }, [positions, map]);
  return null;
}

// ── Geocode helper (calls existing backend function) ──────────────────────
async function geocodeSite(site) {
  if (!site.address) return null;
  const addressObj = { street: site.address, city: site.city, state: site.state, zip: site.zip };
  const res = await base44.functions.invoke("geocodeSiteAddress", { siteId: site.id, address: addressObj }).catch(() => null);
  if (res?.data?.success) return { lat: res.data.latitude, lng: res.data.longitude };
  return null;
}

const AdminLiveMapComponent = forwardRef(function AdminLiveMap(props, ref) {
  const navigate = useNavigate();
  const [stateFilter, setStateFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [zipFilter, setZipFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [geocodingIds, setGeocodingIds] = useState(new Set());
  const [hoveredSiteId, setHoveredSiteId] = useState(null);

  // ── Data fetching ────────────────────────────────────────────────────────
  const { data: allSites = [], isLoading: sitesLoading, refetch: refetchSites } = useQuery({
    queryKey: ["admin-map-sites"],
    queryFn: async () => {
      const sites = await base44.entities.Site.list("-created_date", 500);
      // Trigger geocoding for any sites missing coordinates
      sites.forEach(site => {
        if ((!site.latitude || !site.longitude) && site.address) {
          base44.functions.invoke('geocodeSiteAddress', { siteId: site.id, address: { street: site.address, city: site.city, state: site.state, zip: site.zip } }).catch(() => null);
        }
      });
      return sites;
    },
    staleTime: 60000,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["admin-map-clients"],
    queryFn: () => base44.entities.Client.list(),
    staleTime: 120000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["admin-map-employees"],
    queryFn: () => base44.entities.Employee.list(),
    staleTime: 60000,
  });

  const { data: patrols = [] } = useQuery({
    queryKey: ["admin-map-patrols"],
    queryFn: () => base44.entities.PatrolSession.filter({ status: "active" }),
    refetchInterval: 30000,
  });

  const { data: activeTimesheets = [] } = useQuery({
    queryKey: ["admin-map-timesheets"],
    queryFn: async () => {
      const ts = await base44.entities.Timesheet.list("-clock_in", 200);
      return ts.filter(t => t.clock_in && !t.clock_out);
    },
    refetchInterval: 30000,
  });

  // ── Auto-geocode sites missing coordinates ───────────────────────────────
  useEffect(() => {
    const sitesToGeocode = allSites.filter(
      s => (!s.latitude || !s.longitude) && (s.address) && !geocodingIds.has(s.id)
    );
    if (sitesToGeocode.length === 0) return;

    setGeocodingIds(prev => new Set([...prev, ...sitesToGeocode.map(s => s.id)]));

    Promise.all(
      sitesToGeocode.map(site => geocodeSite(site).then(() => {
        setGeocodingIds(prev => { const n = new Set(prev); n.delete(site.id); return n; });
      }))
    ).then(() => {
      setTimeout(() => refetchSites(), 1000);
    });
  }, [allSites]);

  // ── Officers with live location ──────────────────────────────────────────
  const officers = useMemo(() => {
    const empById = Object.fromEntries(employees.map(e => [e.id, e]));
    return activeTimesheets
      .map(t => {
        const lat = t.clock_in_location?.latitude;
        const lng = t.clock_in_location?.longitude;
        if (!lat || !lng) return null;
        const emp = empById[t.employee_id];
        return { id: t.employee_id, name: emp ? `${emp.firstName} ${emp.lastName}` : "Officer", lat, lng, siteId: t.site_id };
      })
      .filter(Boolean);
  }, [activeTimesheets, employees]);

  // ── Derived data ─────────────────────────────────────────────────────────
  const clientById = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients]);
  const empById = useMemo(() => Object.fromEntries(employees.map(e => [e.id, e])), [employees]);
  const activePatrolSiteIds = useMemo(() => new Set(patrols.map(p => p.site_id).filter(Boolean)), [patrols]);

  const siteStates = useMemo(() => [...new Set(allSites.map(s => s.state).filter(Boolean))].sort(), [allSites]);
  const siteCities = useMemo(() => {
    const filtered = stateFilter !== "all" ? allSites.filter(s => s.state === stateFilter) : allSites;
    return [...new Set(filtered.map(s => s.city).filter(Boolean))].sort();
  }, [allSites, stateFilter]);

  const unmappableSites = useMemo(() =>
    allSites.filter(s => !s.latitude && !s.longitude && !s.address),
    [allSites]
  );

  // ── Filtered sites ───────────────────────────────────────────────────────
  const visibleSites = useMemo(() => {
    return allSites.filter(site => {
      if (!site.latitude || !site.longitude) return false;
      if (stateFilter !== "all" && site.state !== stateFilter) return false;
      if (cityFilter && site.city?.toLowerCase() !== cityFilter.toLowerCase()) return false;
      if (zipFilter && site.zip !== zipFilter) return false;
      if (clientFilter !== "all" && site.client_id !== clientFilter) return false;
      return true;
    });
  }, [allSites, stateFilter, cityFilter, zipFilter, clientFilter]);

  const fitPositions = useMemo(() => visibleSites.map(s => [s.latitude, s.longitude]), [visibleSites]);

  const clearFilters = () => { setStateFilter("all"); setCityFilter(""); setZipFilter(""); setClientFilter("all"); };
  const hasFilters = stateFilter !== "all" || cityFilter || zipFilter || clientFilter !== "all";

  if (sitesLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1a2b4a]" />
          <p className="text-slate-600">Loading map data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filter bar */}
      <div className="bg-white border-b px-4 py-2 flex flex-wrap gap-2 items-center z-10">
        <Select value={stateFilter} onValueChange={v => { setStateFilter(v); setCityFilter(""); }}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="State" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {siteStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={cityFilter || "all"} onValueChange={v => setCityFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="City" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {siteCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Input
          placeholder="ZIP code"
          value={zipFilter}
          onChange={e => setZipFilter(e.target.value)}
          className="w-24 h-8 text-xs"
        />

        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Client" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1">
            <X className="w-3 h-3" /> Clear
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <span>{visibleSites.length} sites</span>
          {geocodingIds.size > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <Loader2 className="w-3 h-3 animate-spin" /> Geocoding {geocodingIds.size}...
            </span>
          )}
        </div>
      </div>

      {/* Map */}
       <div className="flex-1 relative">
         <MapContainer ref={ref} center={[39.5, -98.35]} zoom={4} className="w-full h-full" style={{ zIndex: 0 }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
          <AutoFit positions={fitPositions} />

          {/* Site pins */}
          {visibleSites.map(site => {
            const hasPatrol = activePatrolSiteIds.has(site.id);
            const isActive = site.status === "active";
            const icon = !isActive ? SITE_INACTIVE_ICON : hasPatrol ? SITE_PATROL_ICON : SITE_ICON;

            const assignedOfficers = (site.assigned_officers || []).map(id => empById[id]).filter(Boolean);
            const client = clientById[site.client_id];
            const siteOfficersOnDuty = officers.filter(o => o.siteId === site.id);
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
                          <span className="font-bold text-slate-900">{siteOfficersOnDuty.length}</span>
                        </p>
                      </div>
                    </div>
                  </Popup>
                )}
                <Popup minWidth={220}>
                  <div className="text-sm">
                    <p className="font-bold text-base mb-1">{site.name}</p>
                    <p className="text-slate-600 mb-2">{[site.address, site.city, site.state, site.zip].filter(Boolean).join(", ")}</p>
                    {client && <p className="text-xs text-slate-500 mb-1"><span className="font-medium">Client:</span> {client.name}</p>}
                    <p className="text-xs text-slate-500 mb-1">
                      <span className="font-medium">Assigned Officers:</span>{" "}
                      {assignedOfficers.length > 0 ? assignedOfficers.map(e => `${e.firstName} ${e.lastName}`).join(", ") : `${assignedOfficers.length} assigned`}
                    </p>
                    <p className="text-xs mb-2">
                      <span className="font-medium">Active Patrol:</span>{" "}
                      {hasPatrol
                        ? <span className="text-emerald-600 font-semibold">● Yes</span>
                        : <span className="text-slate-400">No</span>}
                    </p>
                    {siteOfficersOnDuty.length > 0 && (
                      <p className="text-xs text-blue-600 mb-2">{siteOfficersOnDuty.length} officer(s) clocked in</p>
                    )}
                    <button
                      onClick={() => navigate(`/SiteDetails?id=${site.id}`)}
                      className="w-full text-center text-xs bg-[#1a2b4a] text-white rounded py-1.5 px-3 hover:bg-[#2d4a6f] transition-colors"
                    >
                      View Site →
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Officer dots */}
          {officers.map(o => (
            <Marker key={o.id} position={[o.lat, o.lng]} icon={OFFICER_ICON}>
              <Popup>
                <div className="text-sm w-64">
                  <p className="font-semibold mb-1">{o.name}</p>
                  <p className="text-xs text-slate-500 mb-2">Active officer</p>
                  <div className="text-xs text-slate-600 space-y-1">
                    {o.siteId && (
                      <div><span className="font-medium">Site ID:</span> {o.siteId}</div>
                    )}
                    <div><span className="font-medium">Clock-In GPS:</span></div>
                    <div className="ml-4 text-slate-700 font-mono text-[11px]">
                      <div>Lat: {o.lat?.toFixed(6)}</div>
                      <div>Lng: {o.lng?.toFixed(6)}</div>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-20 md:bottom-6 left-4 bg-white rounded-xl shadow-lg border px-4 py-3 text-xs z-[999] space-y-1.5">
          <p className="font-semibold text-slate-700 mb-2">Legend</p>
          <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-blue-500 border-2 border-blue-800 inline-block" /> Site location</div>
          <div className="flex items-center gap-2"><span className="text-[#c9a227] text-lg leading-none">★</span> Active patrol</div>
          <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-slate-400 border border-slate-600 inline-block" /> Inactive site</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 border border-red-800 inline-block" /> Officer (live GPS)</div>
        </div>

        {/* Unmappable warning */}
        {unmappableSites.length > 0 && (
          <div className="absolute top-3 right-4 bg-amber-50 border border-amber-200 rounded-xl shadow px-4 py-2 text-xs z-[999] flex items-start gap-2 max-w-xs">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">{unmappableSites.length} site(s) could not be mapped</p>
              <p className="text-amber-600">Missing address data. <button onClick={() => navigate("/SiteManagement")} className="underline font-medium">Fix in Site Management</button></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

AdminLiveMapComponent.displayName = "AdminLiveMap";
export default AdminLiveMapComponent;