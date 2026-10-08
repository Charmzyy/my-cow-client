// Location helpers shared by the farm forms, maps and the officer queue.

export const KENYA_CENTER = [0.0236, 37.9062];
export const KENYA_ZOOM = 6;
export const FARM_ZOOM = 16;

// Matches the API's bounding box check (HoldingController / AnimalController)
export function inKenya(lat, lng) {
  return lat >= -5 && lat <= 6 && lng >= 33 && lng <= 42.5;
}

export function hasPoint(o) {
  return o && o.latitude != null && o.latitude !== '' && o.longitude != null && o.longitude !== '';
}

// Opens Google Maps (app on phones) with driving directions to the point
export function directionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

// Straight-line distance in km (haversine), good enough to sort a queue
export function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/**
 * The device's position as { lat, lng, accuracy }. Rejects with a message meant for people.
 * Browsers only share location with https:// pages (or localhost): on a plain http LAN address
 * the request is refused before the person is even asked.
 */
export function locateMe() {
  return new Promise((resolve, reject) => {
    if (!window.isSecureContext) {
      reject(new Error('Location only works on the secure (https://) link of MyCow. Open it that way, or drop the pin on the map.'));
      return;
    }
    if (!navigator.geolocation) {
      reject(new Error('This device can’t share its location. Drop the pin on the map instead.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) }),
      (err) => reject(new Error(err.code === 1
        ? 'Location permission was refused. Allow it in the browser settings, or drop the pin on the map.'
        : 'Couldn’t get a GPS fix. Try outside, or drop the pin on the map.')),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}
