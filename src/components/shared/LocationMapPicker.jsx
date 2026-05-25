import React, { useState } from "react";
import { MapPin, Loader2, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * A lightweight location picker that uses the browser Geolocation API
 * and embeds an OpenStreetMap tile to show the picked point.
 *
 * Props:
 *   location: { latitude, longitude, address } | null
 *   onChange: (location) => void
 *   label?: string
 */
export default function LocationMapPicker({ location, onChange, label = "Location" }) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(null);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported on this device.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          if (data.display_name) address = data.display_name;
        } catch (_) {}
        onChange({ latitude, longitude, address });
        setLocating(false);
      },
      (err) => {
        setError("Could not get location: " + err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const mapUrl = location
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.005},${location.latitude - 0.005},${location.longitude + 0.005},${location.latitude + 0.005}&layer=mapnik&marker=${location.latitude},${location.longitude}`
    : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
          <MapPin className="w-4 h-4" /> {label}
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={detectLocation}
          disabled={locating}
          className="gap-1 text-xs"
        >
          {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
          {location ? "Update Location" : "Detect Location"}
        </Button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {location && (
        <>
          <p className="text-xs text-slate-500 truncate">{location.address}</p>
          <div className="rounded-lg overflow-hidden border border-slate-200 h-36">
            <iframe
              title="Incident Location"
              src={mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
            />
          </div>
        </>
      )}
    </div>
  );
}