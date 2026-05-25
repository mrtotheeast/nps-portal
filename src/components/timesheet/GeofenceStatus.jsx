import React from "react";
import { MapPin, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function GeofenceStatus({ site, locating, locationError, withinGeofence, distanceMeters, geofenceRadius, onRefresh }) {
  if (!site) return null;
  const geofenceEnabled = site?.geofence?.enabled;

  const containerClass = !geofenceEnabled || (!locating && !locationError && withinGeofence === null)
    ? "bg-slate-50 border-slate-200"
    : locating ? "bg-slate-50 border-slate-200"
    : locationError ? "bg-red-50 border-red-200"
    : withinGeofence === true ? "bg-green-50 border-green-200"
    : "bg-red-50 border-red-200";

  return (
    <div className={cn("rounded-lg border p-3 mb-4 flex items-center justify-between gap-3", containerClass)}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <MapPin className={cn("w-4 h-4 shrink-0", withinGeofence === true ? "text-green-600" : withinGeofence === false ? "text-red-600" : "text-slate-500")} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{site.name}</p>
          {locating && <p className="text-xs text-slate-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Getting your location…</p>}
          {!locating && locationError && <p className="text-xs text-red-600">{locationError}</p>}
          {!locating && !locationError && !geofenceEnabled && <p className="text-xs text-slate-500">No geofence configured for this site</p>}
          {!locating && !locationError && geofenceEnabled && withinGeofence === true && <p className="text-xs text-green-700">Within range · {distanceMeters != null ? `${distanceMeters}m away` : ""}</p>}
          {!locating && !locationError && geofenceEnabled && withinGeofence === false && <p className="text-xs text-red-700">Too far — {distanceMeters != null ? `${distanceMeters}m away` : ""}, must be within {geofenceRadius}m</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!locating && geofenceEnabled && withinGeofence === true && <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle className="w-3 h-3" />On-Site</Badge>}
        {!locating && geofenceEnabled && withinGeofence === false && <Badge className="bg-red-100 text-red-800 gap-1"><XCircle className="w-3 h-3" />Off-Site</Badge>}
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onRefresh} disabled={locating}><RefreshCw className={cn("w-4 h-4", locating && "animate-spin")} /></Button>
      </div>
    </div>
  );
}