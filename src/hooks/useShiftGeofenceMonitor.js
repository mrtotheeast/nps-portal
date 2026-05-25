import { useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const POLL_INTERVAL_MS = 60_000;
const REENTER_GRACE_MS = 120_000;

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000, toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isInsidePolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat, xj = polygon[j].lng, yj = polygon[j].lat;
    if ((yi > lat !== yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function checkInsideSiteGeofence(lat, lng, site) {
  const gf = site?.geofence;
  if (!gf?.enabled) return true;
  if (gf.shape_type === "polygon" && gf.polygon_coordinates?.length >= 3) return isInsidePolygon(lat, lng, gf.polygon_coordinates);
  if (gf.latitude && gf.longitude) return haversineDistance(lat, lng, gf.latitude, gf.longitude) <= (gf.radius_meters || 100);
  return true;
}

export function useShiftGeofenceMonitor({ user, shift, site }) {
  const wasInsideRef = useRef(null);
  const exitedAtRef = useRef(null);
  const alertSentRef = useRef(false);
  const intervalRef = useRef(null);

  const checkPosition = useCallback(() => {
    if (!user || !shift || !site?.geofence?.enabled || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        const inside = checkInsideSiteGeofence(lat, lng, site);
        if (wasInsideRef.current === null) {
          wasInsideRef.current = inside;
          if (inside) base44.functions.invoke("trackGeofenceEvent", { site_id: shift.site_id, event_type: "entry", location: { latitude: lat, longitude: lng, accuracy: pos.coords.accuracy } }).catch(console.error);
          return;
        }
        if (inside) {
          if (!wasInsideRef.current) { wasInsideRef.current = true; exitedAtRef.current = null; alertSentRef.current = false; base44.functions.invoke("trackGeofenceEvent", { site_id: shift.site_id, event_type: "entry", location: { latitude: lat, longitude: lng, accuracy: pos.coords.accuracy } }).catch(console.error); }
        } else {
          if (wasInsideRef.current) { wasInsideRef.current = false; exitedAtRef.current = Date.now(); base44.functions.invoke("trackGeofenceEvent", { site_id: shift.site_id, event_type: "exit", location: { latitude: lat, longitude: lng, accuracy: pos.coords.accuracy } }).catch(console.error); }
          const outsideDuration = exitedAtRef.current ? Date.now() - exitedAtRef.current : 0;
          if (!alertSentRef.current && outsideDuration >= REENTER_GRACE_MS) { alertSentRef.current = true; base44.functions.invoke("geofenceShiftAlert", { officer_id: user.id, officer_name: user.full_name, site_id: shift.site_id, site_name: site.name, location: { latitude: lat, longitude: lng }, shift_id: shift.id, exited_at: new Date(exitedAtRef.current).toISOString() }).catch(console.error); }
        }
      },
      (err) => console.warn("Geofence monitor GPS error:", err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [user, shift, site]);

  useEffect(() => {
    if (!user || !shift?.site_id || !site?.geofence?.enabled) return;
    checkPosition();
    intervalRef.current = setInterval(checkPosition, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [checkPosition, user?.id, shift?.id, site?.id]);
}