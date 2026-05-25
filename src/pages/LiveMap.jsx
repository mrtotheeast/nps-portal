import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "leaflet/dist/leaflet.css";
import LoadingScreen from "@/components/shared/LoadingScreen";
import AdminLiveMap from "@/components/mapping/AdminLiveMap";
import ClientLiveMap from "@/components/mapping/ClientLiveMap";

export default function LiveMap() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const [user, setUser] = useState(null);
  const [clientRecord, setClientRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sites, setSites] = useState([]);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      // Fetch all sites for search
      try {
        const allSites = await base44.entities.Site.list();
        setSites(allSites || []);
      } catch {
        setSites([]);
      }
      // If client role, find their client record by email
      if (u?.role === "client" || u?.role_type === "client") {
        try {
          const clients = await base44.entities.Client.filter({ contact_email: u.email });
          setClientRecord(clients[0] || null);
        } catch {
          setClientRecord(null);
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSearchSite = (siteName) => {
    const site = sites.find(s => s.name.toLowerCase().includes(siteName.toLowerCase()));
    if (site && site.latitude && site.longitude && mapRef.current) {
      const leafletMap = mapRef.current.leafletElement;
      if (leafletMap) {
        leafletMap.setView([site.latitude, site.longitude], 15);
      }
      setSearchQuery("");
    }
  };

  if (loading) return <LoadingScreen />;

  const isClient = user?.role === "client" || user?.role_type === "client";

  const filteredSites = searchQuery
    ? sites.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="bg-white border-b px-4 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-slate-600 hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-[#1a2b4a] text-lg">
              {isClient ? "My Sites – Live Map" : "Live Map"}
            </h1>
            <p className="text-xs text-slate-500">
              {isClient ? "Your assigned sites and patrols" : "All sites, officers, and active patrols"}
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
            <Search className="w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search for a site..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filteredSites.length > 0) {
                  handleSearchSite(searchQuery);
                }
              }}
              className="border-0 bg-transparent outline-none flex-1 text-sm"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery("")}
                className="text-slate-400 hover:bg-slate-200 h-6 w-6"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {searchQuery && filteredSites.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-md z-10">
              {filteredSites.slice(0, 5).map(site => (
                <button
                  key={site.id}
                  onClick={() => handleSearchSite(site.name)}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 border-b last:border-b-0 text-sm text-slate-900"
                >
                  <p className="font-medium">{site.name}</p>
                  <p className="text-xs text-slate-500">{site.city}, {site.state}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {isClient
          ? <ClientLiveMap ref={mapRef} clientId={clientRecord?.id} />
          : <AdminLiveMap ref={mapRef} />
        }
      </div>
    </div>
  );
}