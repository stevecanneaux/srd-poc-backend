export async function geocodeAddress(address: string) {
  try {
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
      throw new Error("Missing Google Maps API key");

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" || !data.results?.length) {
      console.warn("Geocoding failed for:", address, data.status);
      return null;
    }

    const loc = data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng };
  } catch (err) {
    console.error("Geocode error for address:", address, err);
    return null;
  }
}
