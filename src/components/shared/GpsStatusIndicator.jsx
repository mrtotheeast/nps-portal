import React from "react";
import { Loader2, AlertTriangle } from "lucide-react";

export default function GpsStatusIndicator({ location, locationError, locating, className = "" }) {
  const openSettings = () => {
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      window.location.href = "app-settings:";
    } else if (/Android/i.test(navigator.userAgent)) {
      // Android doesn't support deep-link to settings from browser, show guidance instead
    }
  };

  if (locating) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-700 w-fit ${className}`}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Getting GPS…</span>
      </div>
    );
  }

  if (location) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-sm text-emerald-700 w-fit ${className}`}>
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-medium">GPS Active</span>
      </div>
    );
  }

  if (locationError) {
    const isDenied = /denied|permission/i.test(locationError);
    return (
      <div className={`px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm ${className}`}>
        <div className="flex items-center gap-2 text-red-700 font-semibold mb-1">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Location Required
        </div>
        <p className="text-red-600 text-xs mb-1.5">
          {isDenied
            ? "Location permission was denied. GPS access is required to use this feature."
            : "Unable to determine your location. Please check your device GPS settings."}
        </p>
        <button
          onClick={openSettings}
          className="text-xs font-semibold text-red-700 underline"
        >
          Open Device Location Settings →
        </button>
      </div>
    );
  }

  return null;
}