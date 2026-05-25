import React, { useState } from "react";
import { AlertTriangle, MapPin, Loader2, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function SiteGeocodeStatus({ site, onGeocode }) {
  const [geocoding, setGeocoding] = useState(false);

  const handleGeocode = async () => {
    setGeocoding(true);
    const result = await base44.functions.invoke('geocodeSiteAddress', { siteId: site.id, address: site.address });
    if (result.data.success) { toast.success(`Site geocoded: ${result.data.formattedAddress}`); onGeocode(); }
    else toast.error(result.data.message || 'Failed to geocode address');
    setGeocoding(false);
  };

  if (site.geocodeError) return (
    <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
      <div className="flex-1 min-w-0"><p className="text-sm font-medium text-amber-900">Address could not be verified</p><p className="text-xs text-amber-700">Please check the site address and try again</p></div>
      <Button size="sm" onClick={handleGeocode} disabled={geocoding} variant="outline" className="shrink-0">
        {geocoding ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}Retry
      </Button>
    </div>
  );

  if (site.latitude && site.longitude) return (
    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
      <Check className="w-5 h-5 text-green-600" />
      <div className="flex-1 min-w-0"><p className="text-sm font-medium text-green-900">Address verified</p><p className="text-xs text-green-700">{site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}</p></div>
    </div>
  );

  return (
    <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <MapPin className="w-5 h-5 text-blue-600" />
      <div className="flex-1 min-w-0"><p className="text-sm font-medium text-blue-900">Ready to geocode</p><p className="text-xs text-blue-700">Address will be converted to GPS coordinates</p></div>
      <Button size="sm" onClick={handleGeocode} disabled={geocoding} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
        {geocoding ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <MapPin className="w-3 h-3 mr-1" />}Geocode
      </Button>
    </div>
  );
}