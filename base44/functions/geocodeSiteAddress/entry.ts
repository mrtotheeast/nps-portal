import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { siteId, address } = body;

    if (!siteId) {
      return Response.json({ error: 'Missing siteId' }, { status: 400 });
    }

    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!googleMapsApiKey) {
      return Response.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    // Support both address object {street,city,state,zip} and site-level flat fields
    let fullAddress;
    if (address && typeof address === 'object') {
      fullAddress = formatAddress(address);
    } else {
      // Try fetching site directly to get address fields
      const site = await base44.asServiceRole.entities.Site.filter({ id: siteId }).then(r => r[0]).catch(() => null);
      if (site) {
        fullAddress = formatAddress({ street: site.address, city: site.city, state: site.state, zip: site.zip });
      }
    }
    if (!fullAddress) {
      await base44.asServiceRole.entities.Site.update(siteId, {
        geocode_error: true,
        geocode_error_message: 'Address could not be formatted'
      });

      return Response.json({
        success: false,
        geocode_error: true,
        message: 'Address could not be formatted'
      });
    }

    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${googleMapsApiKey}`;
    const geocodeResponse = await fetch(geocodeUrl);

    if (!geocodeResponse.ok) {
      throw new Error('Google Maps API error');
    }

    const geocodeData = await geocodeResponse.json();

    if (geocodeData.results && geocodeData.results.length > 0) {
      const { lat, lng } = geocodeData.results[0].geometry.location;
      const formattedAddress = geocodeData.results[0].formatted_address;

      await base44.asServiceRole.entities.Site.update(siteId, {
        latitude: lat,
        longitude: lng,
        formatted_address: formattedAddress,
        geocode_error: false,
        geocode_error_message: null,
        geocoded_at: new Date().toISOString()
      });

      return Response.json({
        success: true,
        latitude: lat,
        longitude: lng,
        formatted_address: formattedAddress
      });
    } else {
      await base44.asServiceRole.entities.Site.update(siteId, {
        geocode_error: true,
        geocode_error_message: 'Address could not be verified'
      });

      return Response.json({
        success: false,
        geocode_error: true,
        message: 'Address could not be verified'
      });
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function formatAddress(addressObj) {
  if (!addressObj) return null;
  const parts = [
    addressObj.street,
    addressObj.city,
    addressObj.state,
    addressObj.zip
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}