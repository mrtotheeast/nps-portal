import { useState, useEffect, useCallback } from "react";

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
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

export function useGeofenceCheck(site) {
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locating, setLocating] = useState(false);
  const [withinGeofence, setWithinGeofence] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(null);

  const checkGeofence = useCallback((coords) => {
    if (!site?.geofence?.enabled) { setWithinGeofence(null); setDistanceMeters(null); return; }
    const gf = site.geofence, { latitude, longitude } = coords;
    if (gf.shape_type === "polygon" && gf.polygon_coordinates?.length >= 3) {
      setWithinGeofence(isInsidePolygon(latitude, longitude, gf.polygon_coordinates));
      const centLat = gf.polygon_coordinates.reduce((s, p) => s + p.lat, 0) / gf.polygon_coordinates.length;
      const centLng = gf.polygon_coordinates.reduce((s, p) => s + p.lng, 0) / gf.polygon_coordinates.length;
      setDistanceMeters(Math.round(haversineDistance(latitude, longitude, centLat, centLng)));
    } else if (gf.latitude && gf.longitude) {
      const dist = Math.round(haversineDistance(latitude, longitude, gf.latitude, gf.longitude));
      setDistanceMeters(dist);
      setWithinGeofence(dist <= (gf.radius_meters || 100));
    } else { setWithinGeofence(null); }
  }, [site]);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationError("Geolocation is not supported by your browser."); return; }
    setLocating(true); setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) }; setLocation(coords); checkGeofence(coords); setLocating(false); },
      (err) => { setLocationError(err.code === 1 ? "Location permission denied. Please allow location access." : "Unable to determine your location. Please try again."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [checkGeofence]);

  useEffect(() => { getLocation(); }, [getLocation]);

  return { location, locationError, locating, withinGeofence, distanceMeters, geofenceRadius: site?.geofence?.enabled ? (site.geofence.radius_meters || 100) : null, refreshLocation: getLocation };
}