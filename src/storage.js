import {
  createAccuracyVotes,
  createCrowdReportsFromReport,
  createFieldSubmissionsFromReport,
  createFieldSubmissionsFromVenue,
  createImageSubmissionFromReport,
  createOpenStreetMapUrl,
  seedVenues,
} from './venues.js';

export const STORAGE_KEY = 'poolballz.venues.v2';
export const VOTE_RECEIPTS_KEY = 'poolballz.voteReceipts.v1';

export function loadVenues() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return normalizeVenues(seedVenues);
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? normalizeVenues(parsed) : normalizeVenues(seedVenues);
  } catch {
    return normalizeVenues(seedVenues);
  }
}

export function saveVenues(venues) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(venues));
}

export async function loadRemoteVenues() {
  const response = await fetch('/api/venues', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Venue API load failed: ${response.status}`);
  const payload = await response.json();
  return normalizeVenues(payload.venues);
}

export async function saveRemoteVenues(venues, location) {
  const response = await fetch('/api/venues', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ venues, location }),
  });
  if (!response.ok) throw new Error(`Venue API save failed: ${response.status}`);
  const payload = await response.json();
  return normalizeVenues(payload.venues);
}

export async function saveRemoteVote({ target, vote, previousVote, location }) {
  const response = await fetch('/api/venues', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ action: 'vote', target, vote, previousVote, location }),
  });
  if (!response.ok) throw new Error(`Venue API vote failed: ${response.status}`);
  const payload = await response.json();
  return normalizeVenues(payload.venues);
}

export function resetVenues() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function loadVoteReceipts() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(VOTE_RECEIPTS_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => value === 'up' || value === 'down'),
    );
  } catch {
    return {};
  }
}

export function saveVoteReceipts(receipts) {
  window.localStorage.setItem(VOTE_RECEIPTS_KEY, JSON.stringify(receipts || {}));
}

export function normalizeVenues(venues) {
  return Array.isArray(venues) && venues.length ? venues.map(normalizeVenue) : normalizeVenues(seedVenues);
}

export function normalizeVenue(venue) {
  const lat = Number(venue.lat);
  const lng = Number(venue.lng);
  const hasPin = Number.isFinite(lat) && Number.isFinite(lng);
  const baseVenue = {
    ...venue,
    lat: hasPin ? lat : venue.lat,
    lng: hasPin ? lng : venue.lng,
    address: venue.address || 'Dropped pin',
    countryCode: venue.countryCode || 'US',
    currencyCode: venue.currencyCode || 'USD',
    phoneType: venue.phoneType || 'Main',
    mapsUrl: hasPin ? createOpenStreetMapUrl(lat, lng) : venue.mapsUrl,
  };
  const reports = Array.isArray(venue.reports) ? venue.reports.map(normalizeReport) : [];
  const generatedFieldSubmissions = [
    ...createFieldSubmissionsFromVenue(baseVenue),
    ...reports.flatMap((report) => createFieldSubmissionsFromReport(report, baseVenue.id)),
  ];
  const storedFieldSubmissions = Array.isArray(venue.fieldSubmissions)
    ? venue.fieldSubmissions.map(normalizeFieldSubmission)
    : [];
  const storedFieldSubmissionIds = new Set(storedFieldSubmissions.map((submission) => submission.id));
  const fieldSubmissions = [
    ...storedFieldSubmissions,
    ...generatedFieldSubmissions.filter((submission) => !storedFieldSubmissionIds.has(submission.id)),
  ];
  const legacyImages = reports.map((report) => createImageSubmissionFromReport(report, venue.id)).filter(Boolean);
  const imageSubmissions = Array.isArray(venue.imageSubmissions) && venue.imageSubmissions.length
    ? venue.imageSubmissions.map(normalizeImageSubmission)
    : legacyImages;
  return {
    ...baseVenue,
    reports,
    fieldSubmissions,
    imageSubmissions,
    accuracyVotes: createAccuracyVotes(venue.accuracyVotes),
  };
}

function normalizeReport(report) {
  return {
    ...report,
    crowdSlots: createCrowdReportsFromReport(report),
    votes: createAccuracyVotes(report.votes),
    fieldVotes: Object.fromEntries(
      Object.entries(report.fieldVotes || {}).map(([key, votes]) => [key, createAccuracyVotes(votes)]),
    ),
  };
}

function normalizeFieldSubmission(submission) {
  return {
    ...submission,
    votes: createAccuracyVotes(submission.votes),
  };
}

function normalizeImageSubmission(submission) {
  return {
    ...submission,
    votes: createAccuracyVotes(submission.votes),
  };
}
