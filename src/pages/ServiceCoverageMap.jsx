import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Building2, Search, X, ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { useNavigate } from "react-router-dom";

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Color palette for clients
const CLIENT_COLORS = [
  "#1a2b4a", "#c9a227", "#2563eb", "#16a34a", "#dc2626",
  "#9333ea", "#0891b2", "#ea580c", "#db2777", "#65a30d",
];

function getClientColor(index) {
  return CLIENT_COLORS[index % CLIENT_COLORS.length];
}

// Feet to meters
function feetToMeters(feet) {
  return Math.round((feet || 300) * 0.3048);
}

// Geocode an address using nominatim (free, no key needed)
async function geocodeAddress(address, city, state, zip) {
  const query = [address, city, state, zip].filter(Boolean).join(", ") + ", USA";
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  const data = await res.json();
  if (data && data[0]) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }
  return null;
}

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    }
  }, [positions.length]);
  return null;
}

export default function ServiceCoverageMap() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [expandedClients, setExpandedClients] = useState({});
  const [siteCoords, setSiteCoords] = useState({}); // siteId -> {lat, lng}
  const [geocoding, setGeocoding] = useState(false);

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date"),
  });

  const { data: sites = [], isLoading: loadingSites } = useQuery({
    queryKey: ["allSites"],
    queryFn: () => base44.entities.Site.list(),
  });

  const activeSites = sites.filter((s) => s.status === "active" || !s.status);

  // Geocode all active sites that don't have coords yet
  useEffect(() => {
    if (activeSites.length === 0) return;
    const toGeocode = activeSites.filter(
      (s) => !siteCoords[s.id] && s.address
    );
    if (toGeocode.length === 0) return;

    setGeocoding(true);
    // Stagger requests to avoid rate limiting nominatim
    const geocodeNext = async (index) => {
      if (index >= toGeocode.length) { setGeocoding(false); return; }
      const site = toGeocode[index];
      const coords = await geocodeAddress(site.address, site.city, site.state, site.zip);
      if (coords) {
        setSiteCoords((prev) => ({ ...prev, [site.id]: coords }));
      }
      setTimeout(() => geocodeNext(index + 1), 300); // 300ms between requests
    };
    geocodeNext(0);
  }, [activeSites.length]);

  const filteredClients = clients.filter((c) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Sites to display: all active if no client selected, else just that client's
  const displaySites = selectedClientId
    ? activeSites.filter((s) => s.client_id === selectedClientId)
    : activeSites;

  const mappedSites = displaySites.filter((s) => siteCoords[s.id]);

  // Build client→index map for colors
  const clientColorMap = {};
  clients.forEach((c, i) => { clientColorMap[c.id] = i; });

  const clientForSite = (site) => clients.find((c) => c.id === site.client_id);

  const toggleExpand = (clientId) => {
    setExpandedClients((prev) => ({ ...prev, [clientId]: !prev[clientId] }));
  };

  const defaultCenter = [39.5, -98.35]; // USA center
  const defaultZoom = 4;

  if (loadingClients || loadingSites) return <LoadingScreen />;

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-[#1a2b4a] text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => navigate(-1)}>
            <X className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">Service Coverage Map</h1>
            <p className="text-xs text-slate-300">
              {mappedSites.length} site{mappedSites.length !== 1 ? "s" : ""} mapped
              {geocoding && " · geocoding..."}
            </p>
          </div>
        </div>
        {selectedClientId && (
          <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10"
            onClick={() => setSelectedClientId(null)}>
            Show All Sites
          </Button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 bg-white border-r flex flex-col overflow-hidden">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* All sites option */}
            <button
              className={`w-full text-left px-3 py-2.5 flex items-center gap-2 text-sm font-medium border-b transition-colors ${!selectedClientId ? "bg-[#1a2b4a] text-white" : "hover:bg-slate-50 text-slate-700"}`}
              onClick={() => setSelectedClientId(null)}
            >
              <MapPin className="w-4 h-4 flex-shrink-0" />
              All Active Sites
              <Badge className={`ml-auto text-xs ${!selectedClientId ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                {activeSites.length}
              </Badge>
            </button>

            {filteredClients.map((client, idx) => {
              const clientSites = activeSites.filter((s) => s.client_id === client.id);
              const color = getClientColor(clientColorMap[client.id] ?? idx);
              const isSelected = selectedClientId === client.id;
              const isExpanded = expandedClients[client.id];

              return (
                <div key={client.id} className="border-b">
                  <div
                    className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${isSelected ? "bg-slate-100" : "hover:bg-slate-50"}`}
                    onClick={() => {
                      setSelectedClientId(isSelected ? null : client.id);
                      setExpandedClients((prev) => ({ ...prev, [client.id]: true }));
                    }}
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-sm font-medium text-slate-800 flex-1 truncate">{client.name}</span>
                    <Badge className="text-xs bg-slate-100 text-slate-600">{clientSites.length}</Badge>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleExpand(client.id); }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {isExpanded && clientSites.length > 0 && (
                    <div className="bg-slate-50 border-t">
                      {clientSites.map((site) => (
                        <div
                          key={site.id}
                          className="px-6 py-2 text-xs text-slate-600 border-b border-slate-100 cursor-pointer hover:bg-slate-100"
                          onClick={() => navigate(`/SiteDetails?id=${site.id}`)}
                        >
                          <p className="font-medium text-slate-800">{site.name}</p>
                          <p className="text-slate-400 truncate">{site.address}, {site.city}</p>
                          <p className="text-slate-400 mt-0.5">
                            Geofence: <span className="text-slate-600 font-medium">{site.geofence_radius || 300} ft</span>
                            {" · "}{feetToMeters(site.geofence_radius || 300)} m
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {isExpanded && clientSites.length === 0 && (
                    <p className="px-6 py-2 text-xs text-slate-400 italic border-t border-slate-100">No active sites</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="p-3 border-t bg-slate-50 text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-700 mb-2">Map Legend</p>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500 opacity-40 border border-blue-500" />Geofence radius</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#1a2b4a]" />Site marker</div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={defaultCenter}
            zoom={defaultZoom}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {mappedSites.length > 0 && (
              <FitBounds positions={mappedSites.map((s) => siteCoords[s.id])} />
            )}

            {mappedSites.map((site) => {
              const coords = siteCoords[site.id];
              const client = clientForSite(site);
              const colorIdx = client ? (clientColorMap[client.id] ?? 0) : 0;
              const color = getClientColor(colorIdx);
              const radiusMeters = feetToMeters(site.geofence_radius || 300);

              const icon = L.divIcon({
                className: "",
                html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.4)"></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7],
              });

              return (
                <React.Fragment key={site.id}>
                  <Circle
                    center={[coords.lat, coords.lng]}
                    radius={radiusMeters}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.15, weight: 1.5 }}
                  />
                  <Marker position={[coords.lat, coords.lng]} icon={icon}>
                    <Popup>
                      <div className="min-w-[180px]">
                        <p className="font-bold text-slate-900 mb-1">{site.name}</p>
                        {client && <p className="text-xs text-slate-500 mb-1">{client.name}</p>}
                        <p className="text-xs text-slate-600">{site.address}</p>
                        <p className="text-xs text-slate-600">{site.city}, {site.state} {site.zip}</p>
                        <div className="mt-2 pt-2 border-t flex items-center justify-between">
                          <span className="text-xs text-slate-500">Geofence</span>
                          <span className="text-xs font-semibold" style={{ color }}>
                            {site.geofence_radius || 300} ft ({radiusMeters} m)
                          </span>
                        </div>
                        {site.site_type && (
                          <p className="text-xs text-slate-400 mt-1 capitalize">{site.site_type}</p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}
          </MapContainer>

          {/* Geocoding overlay */}
          {geocoding && (
            <div className="absolute top-3 right-3 bg-white shadow-lg rounded-lg px-3 py-2 text-xs text-slate-600 flex items-center gap-2 z-[1000]">
              <div className="w-3 h-3 border-2 border-[#1a2b4a] border-t-transparent rounded-full animate-spin" />
              Geocoding addresses...
            </div>
          )}

          {/* Stats overlay */}
          <div className="absolute bottom-4 right-4 bg-white shadow-lg rounded-lg p-3 z-[1000] text-xs space-y-1">
            <p className="font-semibold text-slate-800">Coverage Summary</p>
            <p className="text-slate-500">{activeSites.length} active site{activeSites.length !== 1 ? "s" : ""}</p>
            <p className="text-slate-500">{clients.filter(c => activeSites.some(s => s.client_id === c.id)).length} clients served</p>
            <p className="text-slate-400">{mappedSites.length} mapped · {activeSites.length - mappedSites.length} pending</p>
          </div>
        </div>
      </div>
    </div>
  );
}