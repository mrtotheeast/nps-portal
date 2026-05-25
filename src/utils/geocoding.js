export async function geocodeAddress(address) {
  try {
    if (!address || typeof address !== 'object') return null;
    const fullAddress = formatAddress(address);
    if (!fullAddress) return null;
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`);
    if (!response.ok) throw new Error('Geocoding API error');
    const data = await response.json();
    if (data.results?.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return { latitude: lat, longitude: lng, accuracy: 'verified', formattedAddress: data.results[0].formatted_address, timestamp: new Date().toISOString() };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export function formatAddress(addressObj) {
  if (!addressObj) return null;
  const parts = [addressObj.street, addressObj.city, addressObj.state, addressObj.zip].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinGeofence(officerLat, officerLon, siteLat, siteLon, radiusMiles = 0.056) {
  return calculateDistance(officerLat, officerLon, siteLat, siteLon) <= radiusMiles;
}