import { createOpenStreetMapUrl, seedVenues } from './venues.js';

export const STORAGE_KEY = 'poolballz.venues.v2';

export function loadVenues() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return seedVenues;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed.map(normalizeVenue) : seedVenues;
  } catch {
    return seedVenues;
  }
}

export function saveVenues(venues) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(venues));
}

export function resetVenues() {
  window.localStorage.removeItem(STORAGE_KEY);
}

function normalizeVenue(venue) {
  const lat = Number(venue.lat);
  const lng = Number(venue.lng);
  const hasPin = Number.isFinite(lat) && Number.isFinite(lng);
  return {
    ...venue,
    lat: hasPin ? lat : venue.lat,
    lng: hasPin ? lng : venue.lng,
    address: venue.address || 'Dropped pin',
    reports: Array.isArray(venue.reports) ? venue.reports : [],
    mapsUrl: hasPin ? createOpenStreetMapUrl(lat, lng) : venue.mapsUrl,
  };
}
