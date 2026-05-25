import React from "react";
import { Clock, MapPin, Navigation, Watch, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OfficerMarkerPopup({ officer, site, patrol, onClose, isOnBreak = false }) {
  const clockInTime = officer.clock_in ? new Date(officer.clock_in) : null;
  const lastUpdateTime = officer.lastLocationUpdate ? new Date(officer.lastLocationUpdate) : null;
  const minutesSinceUpdate = lastUpdateTime ? Math.floor((Date.now() - lastUpdateTime) / 60000) : null;
  const clockInLat = officer.latitude?.toFixed(6);
  const clockInLng = officer.longitude?.toFixed(6);

  return (
    <Card className={`p-4 w-80 shadow-xl ${isOnBreak ? "bg-gray-100" : "bg-green-100"}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-base text-slate-900">{officer.firstName} {officer.lastName}</h3>
          <Badge className={`mt-1 ${isOnBreak ? "bg-gray-500" : "bg-green-600"}`}>{isOnBreak ? "On Break" : "Clocked In"}</Badge>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
      </div>
      {site && (
        <div className="mb-3 pb-3 border-b">
          <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-[#1a2b4a]" /><div><div className="font-medium text-slate-700">{site.name}</div><div className="text-xs text-slate-500">{site.address?.city}, {site.address?.state}</div></div></div>
        </div>
      )}
      {clockInTime && (
        <div className="mb-3 pb-3 border-b">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-[#c9a227]" />
            <div className="text-sm"><div className="font-medium text-slate-700">Clocked In</div><div className="text-xs text-slate-500">{clockInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div>
          </div>
          {clockInLat && clockInLng && (
            <div className="text-xs text-slate-600 pl-6 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-blue-600" />
              <span>{clockInLat}, {clockInLng}</span>
            </div>
          )}
        </div>
      )}
      {patrol && (
        <div className="mb-3 pb-3 border-b">
          <div className="flex items-center gap-2 mb-1"><Navigation className="w-4 h-4 text-blue-600" /><span className="font-medium text-sm text-slate-700">Patrol Status</span></div>
          <div className="space-y-1 text-xs text-slate-600 pl-6">
            <div><span className="font-medium">Status:</span> {patrol.status}</div>
            <div><span className="font-medium">Checkpoints:</span> {patrol.scanned_checkpoints}/{patrol.total_checkpoints}</div>
            {patrol.start_time && <div><span className="font-medium">Duration:</span> {Math.floor((Date.now() - new Date(patrol.start_time)) / 60000)} min</div>}
          </div>
        </div>
      )}
      <div className="text-xs text-slate-600 space-y-1">
        <div className="flex items-center gap-2"><Watch className="w-3 h-3" /><span>Last Update: {minutesSinceUpdate ? `${minutesSinceUpdate}m ago` : "Just now"}</span></div>
        {minutesSinceUpdate && minutesSinceUpdate > 5 && <div className="text-amber-600 font-medium">⚠️ Signal stale (&gt; 5 min)</div>}
      </div>
    </Card>
  );
}