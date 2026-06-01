import { randomUUID } from 'node:crypto';
import { normalizeVenues } from '../src/storage.js';
import {
  applyCrowdSlotVote,
  applyFieldVote,
  applyImageVote,
  applyReportVote,
  applyVenueVote,
  createAccuracyVotes,
  createCrowdReportsFromReport,
  FIELD_SUBMISSION_KEYS,
  getDistanceMeters,
  normalizeLocationProof,
} from '../src/venues.js';
import { getVenueStore } from './venueStore.js';

export function isInsideBoundingBox(location, boundingBox) {
  if (!location || !boundingBox) return false;
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= Number(boundingBox.south) &&
    lat <= Number(boundingBox.north) &&
    lng >= Number(boundingBox.west) &&
    lng <= Number(boundingBox.east)
  );
}

function normalizeBoundingBox(boundingBox) {
  if (!boundingBox) return null;
  const south = Number(boundingBox.south);
  const north = Number(boundingBox.north);
  const west = Number(boundingBox.west);
  const east = Number(boundingBox.east);
  if (![south, north, west, east].every(Number.isFinite)) return null;
  if (south > north || west > east) return null;
  return { south, north, west, east };
}

function trustedContributionVenue(previous, next) {
  const trustedBounds = normalizeBoundingBox(previous?.boundingBox) || normalizeBoundingBox(next?.boundingBox);
  if (!trustedBounds) return { ...next, boundingBox: null };
  return {
    ...next,
    lat: previous?.lat ?? next.lat,
    lng: previous?.lng ?? next.lng,
    boundingBox: trustedBounds,
  };
}

export function canContributeAtLocation(location, venue) {
  return Boolean(normalizeBoundingBox(venue?.boundingBox) && isInsideBoundingBox(location, venue.boundingBox));
}

export function createServerLocationProof(location, venue) {
  if (!canContributeAtLocation(location, venue)) return null;
  return normalizeLocationProof({
    addressVerified: true,
    verifiedAt: new Date().toISOString(),
    method: 'address-bounds',
    distanceMeters: getDistanceMeters(location, venue),
  });
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function stampProof(votes, proof) {
  if (!votes) return votes;
  return { ...createAccuracyVotes(votes), locationProof: proof };
}

function stampChangedVenue(venue, proof) {
  return {
    ...venue,
    locationProof: proof,
    accuracyVotes: stampProof(venue.accuracyVotes, proof),
    reports: (venue.reports || []).map((report) => ({
      ...report,
      locationProof: proof,
      votes: stampProof(report.votes, proof),
      fieldVotes: Object.fromEntries(
        Object.entries(report.fieldVotes || {}).map(([key, votes]) => [key, stampProof(votes, proof)]),
      ),
      crowdSlots: (report.crowdSlots || []).map((slot) => ({
        ...slot,
        locationProof: proof,
        votes: stampProof(slot.votes, proof),
      })),
    })),
    fieldSubmissions: (venue.fieldSubmissions || []).map((submission) => ({
      ...submission,
      locationProof: proof,
      votes: stampProof(submission.votes, proof),
    })),
    imageSubmissions: (venue.imageSubmissions || []).map((image) => ({
      ...image,
      locationProof: proof,
      votes: stampProof(image.votes, proof),
    })),
  };
}

export async function readVenues(store = null) {
  const venueStore = store || (await getVenueStore());
  const venues = await venueStore.read();
  if (!venueStore.readVoteEvents) return venues;
  const events = venueStore.readVoteEvents ? await venueStore.readVoteEvents() : [];
  return applyVoteEvents(venues, events);
}

export function prepareVenueSnapshot(previousVenues, nextVenues, location) {
  const previousById = new Map(previousVenues.map((venue) => [venue.id, venue]));
  const normalizedNext = normalizeVenues(nextVenues);
  const nextIds = new Set(normalizedNext.map((venue) => venue.id));
  const removedVenue = previousVenues.find((venue) => !nextIds.has(venue.id));
  if (removedVenue) {
    const error = new Error('Venue removal is disabled; mark the venue inaccurate instead.');
    error.statusCode = 403;
    throw error;
  }

  return normalizedNext.map((venue) => {
    const previous = previousById.get(venue.id);
    if (previous && sameJson(previous, venue)) return venue;
    const contributionVenue = trustedContributionVenue(previous, venue);
    const proof = createServerLocationProof(location, contributionVenue);
    if (!proof) {
      const error = new Error('Location must be inside the changed venue address bounds.');
      error.statusCode = 403;
      throw error;
    }
    return stampChangedVenue(venue, proof);
  });
}

export async function writeVenues(nextVenues, location, store = null) {
  const venueStore = store || (await getVenueStore());
  const previousVenues = await venueStore.read();
  const checked = prepareVenueSnapshot(previousVenues, nextVenues, location);
  return venueStore.write(checked);
}

function getVoteTargetVenue(venues, target) {
  return venues.find((venue) => venue.id === target?.venueId) || null;
}

function applyVoteTarget(venue, target, vote, proof, previousVote) {
  if (target?.type === 'venue') return applyVenueVote(venue, vote, proof, previousVote);
  if (target?.type === 'report') return applyReportVote(venue, target.reportId, vote, proof, previousVote);
  if (target?.type === 'field') return applyFieldVote(venue, target.reportId, target.fieldKey, vote, proof, previousVote);
  if (target?.type === 'image') return applyImageVote(venue, target.imageId, vote, proof, previousVote);
  if (target?.type === 'crowd') return applyCrowdSlotVote(venue, target.reportId, target.slotId, vote, proof, previousVote);
  return venue;
}

function hasVoteTarget(venue, target) {
  if (!target?.type || !target.venueId) return false;
  if (target.type === 'venue') return true;
  if (target.type === 'report') return (venue.reports || []).some((report) => report.id === target.reportId);
  if (target.type === 'field') {
    if (!FIELD_SUBMISSION_KEYS.includes(target.fieldKey)) return false;
    return (
      (venue.reports || []).some((report) => report.id === target.reportId) ||
      (venue.fieldSubmissions || []).some(
        (submission) =>
          submission.fieldKey === target.fieldKey &&
          (submission.id === target.reportId ||
            submission.reportId === target.reportId ||
            submission.legacyReportId === target.reportId),
      )
    );
  }
  if (target.type === 'image') {
    return (venue.imageSubmissions || []).some((image) => image.id === target.imageId);
  }
  if (target.type === 'crowd') {
    return (venue.reports || []).some(
      (report) =>
        report.id === target.reportId &&
        createCrowdReportsFromReport(report).some((slot) => slot.id === target.slotId),
    );
  }
  return false;
}

function emptyVotes() {
  return { up: 0, down: 0 };
}

function resetVoteAggregates(venues) {
  return normalizeVenues(venues).map((venue) => ({
    ...venue,
    venueFieldVotes: venue.venueFieldVotes
      ? Object.fromEntries(Object.keys(venue.venueFieldVotes).map((key) => [key, emptyVotes()]))
      : venue.venueFieldVotes,
    accuracyVotes: emptyVotes(),
    reports: (venue.reports || []).map((report) => ({
      ...report,
      votes: emptyVotes(),
      fieldVotes: Object.fromEntries(
        Object.keys(report.fieldVotes || {}).map((key) => [key, emptyVotes()]),
      ),
      crowdSlots: (report.crowdSlots || []).map((slot) => ({
        ...slot,
        votes: emptyVotes(),
      })),
    })),
    fieldSubmissions: (venue.fieldSubmissions || []).map((submission) => ({
      ...submission,
      votes: emptyVotes(),
    })),
    imageSubmissions: (venue.imageSubmissions || []).map((image) => ({
      ...image,
      votes: emptyVotes(),
    })),
  }));
}

function sortVoteEvents(events) {
  return [...(Array.isArray(events) ? events : [])].sort((a, b) => {
    const createdCompare = String(a?.createdAt || '').localeCompare(String(b?.createdAt || ''));
    if (createdCompare) return createdCompare;
    return String(a?.id || '').localeCompare(String(b?.id || ''));
  });
}

export function applyVoteEvents(baseVenues, events = []) {
  let venues = resetVoteAggregates(baseVenues);
  for (const event of sortVoteEvents(events)) {
    const vote = event?.vote;
    if (vote !== 'up' && vote !== 'down') continue;
    const targetVenue = getVoteTargetVenue(venues, event.target);
    if (!targetVenue || !hasVoteTarget(targetVenue, event.target)) continue;
    venues = venues.map((venue) =>
      venue.id === targetVenue.id
        ? applyVoteTarget(venue, event.target, vote, event.locationProof, event.previousVote)
        : venue,
    );
  }
  return venues;
}

export function prepareVoteEvent(previousVenues, body) {
  const normalizedVenues = normalizeVenues(previousVenues);
  const vote = body?.vote;
  if (vote !== 'up' && vote !== 'down') {
    const error = new Error('Vote must be up or down.');
    error.statusCode = 400;
    throw error;
  }

  const targetVenue = getVoteTargetVenue(normalizedVenues, body.target);
  if (!targetVenue) {
    const error = new Error('Vote target venue was not found.');
    error.statusCode = 404;
    throw error;
  }
  if (!hasVoteTarget(targetVenue, body.target)) {
    const error = new Error('Vote target was not found.');
    error.statusCode = 404;
    throw error;
  }

  const proof = createServerLocationProof(body.location, targetVenue);
  if (!proof) {
    const error = new Error('Location must be inside the venue address bounds before voting.');
    error.statusCode = 403;
    throw error;
  }

  const previousVote = body.previousVote === 'up' || body.previousVote === 'down' ? body.previousVote : null;
  return {
    id: randomUUID(),
    target: {
      type: body.target.type,
      venueId: body.target.venueId,
      ...(body.target.reportId ? { reportId: body.target.reportId } : {}),
      ...(body.target.fieldKey ? { fieldKey: body.target.fieldKey } : {}),
      ...(body.target.imageId ? { imageId: body.target.imageId } : {}),
      ...(body.target.slotId ? { slotId: body.target.slotId } : {}),
    },
    vote,
    ...(previousVote ? { previousVote } : {}),
    locationProof: proof,
    createdAt: new Date().toISOString(),
  };
}

export function prepareVoteMutation(previousVenues, body) {
  const normalizedVenues = normalizeVenues(previousVenues);
  const event = prepareVoteEvent(previousVenues, body);
  return normalizedVenues.map((venue) =>
    venue.id === event.target.venueId
      ? applyVoteTarget(venue, event.target, event.vote, event.locationProof, event.previousVote)
      : venue,
  );
}

export async function writeVote(body, store = null) {
  const venueStore = store || (await getVenueStore());
  const previousVenues = await readVenues(venueStore);
  const event = prepareVoteEvent(previousVenues, body);
  if (venueStore.writeVoteEvent) {
    await venueStore.writeVoteEvent(event);
    return readVenues(venueStore);
  }
  const checked = prepareVoteMutation(previousVenues, body);
  return venueStore.write(checked);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const store = await getVenueStore();
      const venues = await readVenues(store);
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ venues, storage: store.name }));
      return;
    }
    if (req.method === 'POST') {
      const store = await getVenueStore();
      const body = await readJsonBody(req);
      const venues = body.action === 'vote'
        ? await writeVote(body, store)
        : await writeVenues(body.venues, body.location, store);
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ venues, storage: store.name }));
      return;
    }
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  } catch (error) {
    res.statusCode = error.statusCode || 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: error.message || 'Venue API failed' }));
  }
}
