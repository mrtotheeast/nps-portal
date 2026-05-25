import React from "react";
import { MapPin, Users, AlertTriangle, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SiteMarkerPopup({ site, officers = [], incidents = [], onClose }) {
  return (
    <Card className="p-4 w-80 shadow-xl">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-base text-slate-900">{site.name}</h3>
          <div className="flex items-start gap-1 text-xs text-slate-500 mt-1"><MapPin className="w-3 h-3 mt-0.5 shrink-0" /><span>{site.address?.street}, {site.address?.city}, {site.address?.state} {site.address?.zip}</span></div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
      </div>
      <div className="mb-3 pb-3 border-b">
        <div className="flex items-center gap-1 mb-2"><Users className="w-4 h-4 text-[#1a2b4a]" /><span className="font-medium text-sm text-slate-700">Officers On Duty</span><Badge className="bg-[#c9a227] text-[#1a2b4a] text-xs">{officers.length}</Badge></div>
        <div className="space-y-1">
          {officers.length > 0 ? officers.slice(0, 5).map(officer => (
            <div key={officer.id} className="text-xs text-slate-600 pl-2 border-l-2 border-[#c9a227]">
              <div className="font-medium">{officer.firstName} {officer.lastName}</div>
              <div className="text-slate-500 text-[11px]">Clocked in: {officer.clock_in ? new Date(officer.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</div>
            </div>
          )) : <div className="text-xs text-slate-500 italic">No officers on duty</div>}
          {officers.length > 5 && <div className="text-xs text-slate-500 italic pt-1">+{officers.length - 5} more</div>}
        </div>
      </div>
      {incidents.length > 0 && (
        <div className="mb-3 pb-3 border-b">
          <div className="flex items-center gap-1 mb-2"><AlertTriangle className="w-4 h-4 text-red-500" /><span className="font-medium text-sm text-slate-700">Open Incidents</span><Badge variant="destructive" className="text-xs">{incidents.length}</Badge></div>
          <div className="space-y-1">
            {incidents.slice(0, 3).map(incident => (
              <div key={incident.id} className="text-xs text-slate-600 pl-2 border-l-2 border-red-500">
                <div className="font-medium capitalize">{(incident.incident_type || "").replace(/_/g, " ")}</div>
                <div className="text-slate-500 text-[11px]">{incident.severity?.toUpperCase()}</div>
              </div>
            ))}
            {incidents.length > 3 && <div className="text-xs text-slate-500 italic pt-1">+{incidents.length - 3} more</div>}
          </div>
        </div>
      )}
      <div className="text-xs text-slate-600 space-y-1">
        {site.geofence && <div className="flex items-center gap-2"><span className="font-medium text-slate-700">Geofence:</span><span>{(site.geofence.radius_meters / 1609.34).toFixed(2)} miles</span></div>}
        {site.contact_person && <div className="flex items-center gap-2"><span className="font-medium text-slate-700">Contact:</span><span>{site.contact_person.name} {site.contact_person.phone ? `(${site.contact_person.phone})` : ""}</span></div>}
      </div>
    </Card>
  );
}