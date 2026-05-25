import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Navigation, RefreshCw, AlertCircle, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function SiteMapEmbed({ site, onGeocoded }) {
  const [viewMode, setViewMode] = useState("map");
  const [geocoding, setGeocoding] = useState(false);
  const [mapKey, setMapKey] = useState(null);
  const [keyLoading, setKeyLoading] = useState(true);

  const lat = site?.geofence?.latitude || site?.latitude;
  const lng = site?.geofence?.longitude || site?.longitude;
  const hasCoords = !!(lat && lng);
  const address = site?.address ? [site.address.street, site.address.city, site.address.state, site.address.zip].filter(Boolean).join(", ") : null;

  useEffect(() => {
    base44.functions.invoke("getGoogleMapsKey", {}).then(res => setMapKey(res.data?.key || null)).catch(() => setMapKey(null)).finally(() => setKeyLoading(false));
  }, []);

  const geocodeAddress = async () => {
    if (!site?.id || !address) return;
    setGeocoding(true);
    const res = await base44.functions.invoke("geocodeSiteAddress", { siteId: site.id, address: site.address });
    if (res.data?.success) { toast.success("Address geocoded — map updated"); onGeocoded && onGeocoded(res.data); }
    else toast.error(res.data?.message || "Could not geocode address");
    setGeocoding(false);
  };

  const getEmbedUrl = () => {
    if (!mapKey) return null;
    const base = "https://www.google.com/maps/embed/v1";
    if (hasCoords) {
      if (viewMode === "street") return `${base}/streetview?location=${lat},${lng}&key=${mapKey}&heading=0&pitch=0&fov=90`;
      return `${base}/place?q=${lat},${lng}&center=${lat},${lng}&zoom=17&key=${mapKey}`;
    }
    if (address) return `${base}/place?q=${encodeURIComponent(address)}&key=${mapKey}&zoom=16`;
    return null;
  };

  if (keyLoading) return (
    <div className="h-48 rounded-xl bg-slate-50 border flex items-center justify-center gap-2 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading map...</span>
    </div>
  );

  if (!mapKey) return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div><p className="font-medium text-amber-800 text-sm">Google Maps not configured</p><p className="text-xs text-amber-700 mt-1">Add <code className="bg-amber-100 px-1 rounded">GOOGLE_MAPS_API_KEY</code> to your app's environment variables.</p></div>
    </div>
  );

  const embedUrl = getEmbedUrl();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <span className="text-sm text-slate-700 font-medium">{address || "No address on file"}</span>
          {hasCoords && <Badge className="bg-green-100 text-green-700 border-0 text-xs">Geocoded ✓</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {hasCoords && (
            <>
              <button onClick={() => setViewMode("map")} className={`text-xs px-3 py-1 rounded-full border transition-colors ${viewMode === "map" ? "bg-[#1a2b4a] text-white border-[#1a2b4a]" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"}`}><Navigation className="w-3 h-3 inline mr-1" />Map</button>
              <button onClick={() => setViewMode("street")} className={`text-xs px-3 py-1 rounded-full border transition-colors ${viewMode === "street" ? "bg-[#1a2b4a] text-white border-[#1a2b4a]" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"}`}><Eye className="w-3 h-3 inline mr-1" />Street View</button>
            </>
          )}
          {address && <Button variant="outline" size="sm" onClick={geocodeAddress} disabled={geocoding} className="text-xs h-7"><RefreshCw className={`w-3 h-3 mr-1 ${geocoding ? "animate-spin" : ""}`} />{hasCoords ? "Re-geocode" : "Geocode Address"}</Button>}
        </div>
      </div>
      {embedUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          <iframe key={embedUrl} title={`Map — ${site?.name}`} src={embedUrl} width="100%" height="360" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          {hasCoords && <a href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="absolute bottom-3 right-3 bg-white text-slate-700 text-xs px-2 py-1 rounded shadow border border-slate-200 hover:bg-slate-50">Open in Google Maps ↗</a>}
        </div>
      ) : (
        <div className="h-48 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
          <MapPin className="w-8 h-8 text-slate-300" /><p className="text-sm">No location to display</p>
        </div>
      )}
      {hasCoords && <p className="text-xs text-slate-400 text-center">{Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}</p>}
    </div>
  );
}