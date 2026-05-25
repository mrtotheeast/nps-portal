import React, { useState } from "react";
import { MapPin, ChevronDown, ChevronUp } from "lucide-react";

/**
 * Inline collapsible map showing clock-in and clock-out locations for a timesheet entry.
 * Props:
 *   clockInLocation: { latitude, longitude, address }
 *   clockOutLocation: { latitude, longitude, address }
 */
export default function TimesheetLocationMap({ clockInLocation, clockOutLocation }) {
  const [open, setOpen] = useState(false);

  const hasAny = clockInLocation?.latitude || clockOutLocation?.latitude;
  if (!hasAny) return null;

  // Center on clock-in or clock-out
  const center = clockInLocation?.latitude ? clockInLocation : clockOutLocation;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${center.longitude - 0.008},${center.latitude - 0.008},${center.longitude + 0.008},${center.latitude + 0.008}&layer=mapnik&marker=${center.latitude},${center.longitude}`;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-[#1a2b4a] hover:underline"
      >
        <MapPin className="w-3 h-3" />
        View locations
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="mt-2 space-y-1">
          {clockInLocation?.address && (
            <p className="text-xs text-slate-500">
              <span className="font-medium text-emerald-700">Clock-in:</span> {clockInLocation.address}
            </p>
          )}
          {clockOutLocation?.address && (
            <p className="text-xs text-slate-500">
              <span className="font-medium text-red-600">Clock-out:</span> {clockOutLocation.address}
            </p>
          )}
          <div className="rounded-lg overflow-hidden border border-slate-200 h-40">
            <iframe
              title="Timesheet Location"
              src={mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
            />
          </div>
        </div>
      )}
    </div>
  );
}